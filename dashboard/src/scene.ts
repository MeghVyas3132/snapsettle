// The object: a tournament chess clock (soft-touch graphite body, brushed-aluminium faceplate, two backlit LCDs,
// an aluminium rocker) standing in cold fog on snow. Its shell lifts off to show the circuit inside, where each
// chip is a deployed contract and each trace a leg of the settlement loop. The story drives `state` (GSAP,
// scroll-scrubbed); this module renders it.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { BloomEffect, EffectComposer, EffectPass, NoiseEffect, RenderPass, SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode, VignetteEffect, BlendFunction } from "postprocessing";
import { N8AOPostPass } from "n8ao";

export const PAL = {
  horizon: new THREE.Color("#d3d9df"),
  zenith: new THREE.Color("#93a0ae"),
  snow: new THREE.Color("#e9edf1"),
  body: new THREE.Color("#16191c"),
  base: new THREE.Color("#0f1113"),
  alu: new THREE.Color("#c8cdd2"),
  pcb: new THREE.Color("#244234"),
  signal: new THREE.Color("#ff5a1f"),
  lcd: "#c4d0bd",
  seg: "#0a0d0d",
};

/** Everything the story animates. Plain numbers so GSAP can tween them. */
export const state = {
  camX: -15, camY: 14, camZ: 30, tgtX: -4.2, tgtY: 2.6, tgtZ: 0,
  lift: 0, // 0 assembled → 1 exploded → 2 shell gone out of frame
  rocker: 1, // 1: Snapsettle side pressed (its clock stopped), -1: Across side pressed
  glow: 0, // light inside the clock once it is open
  t0: 0, t1: 0, t2: 0, t3: 0, // trace progress: open→fill, fill→seen, settle callback, resolver→escrow
  tier: 0, // DIP switch slot, 0..2 (float while moving)
  fog: 0.006,
  spin: 0,
  slide: 0,
  dim: 0, // 0..1, quiets the traces
  reject: 0, // refusal pulse: 0 hidden, otherwise its position 0..1
};

type Anchor = { obj: THREE.Object3D; x: number; y: number; z: number; on: boolean };

const SLOPE = (() => {
  // Side profile of the housing in (z, y): front edge (5, 2.6) rising to the ridge at (-1.5, 6.2).
  const F = new THREE.Vector2(5, 2.6);
  const R = new THREE.Vector2(-1.5, 6.2);
  const d = R.clone().sub(F);
  const len = d.length();
  d.normalize();
  const n = new THREE.Vector2(d.y, -d.x);
  const mid = F.clone().add(R).multiplyScalar(0.5);
  const tilt = -Math.atan2(n.y, n.x);
  return { mid, n, d, len, tilt };
})();

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, color = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return { tex: t, canvas: c, g };
}

/** Grey noise, for roughness and bump variation. `streak` stretches it into brushed-metal lines. */
function noiseTex(size: number, streak = 1, lo = 110, hi = 160) {
  return canvasTex(size, size, (g) => {
    const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      let run = lo + Math.random() * (hi - lo);
      for (let x = 0; x < size; x++) {
        if (streak <= 1 || Math.random() < 1 / streak) run = lo + Math.random() * (hi - lo);
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = run;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }, false).tex;
}

function roundedRect(w: number, h: number, r: number, cx = 0, cy = 0) {
  const s = new THREE.Shape();
  const x = cx - w / 2, y = cy - h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function holePath(w: number, h: number, r: number) {
  const p = new THREE.Path();
  p.setFromPoints(roundedRect(w, h, r).getPoints(12));
  return p;
}

// ---------------------------------------------------------------- shaders

const traceVert = /* glsl */ `
  varying float vU;
  #include <fog_pars_vertex>
  void main() {
    vU = uv.x;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const traceFrag = /* glsl */ `
  uniform float uProgress;
  uniform float uHead;
  uniform float uDim;
  uniform vec3 uBase;
  uniform vec3 uLit;
  varying float vU;
  #include <fog_pars_fragment>
  void main() {
    float lit = smoothstep(uProgress + 0.004, uProgress - 0.004, vU);
    float head = uHead < 0.0 ? 0.0 : exp(-pow((vU - uHead) * 28.0, 2.0));
    vec3 col = mix(uBase, uLit * 1.6, lit * (1.0 - uDim * 0.55)) + uLit * head * 6.0;
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }`;

function traceMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: traceVert,
    fragmentShader: traceFrag,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uProgress: { value: 0 }, uHead: { value: -1 }, uDim: { value: 0 }, uBase: { value: new THREE.Color("#9c8a5c").multiplyScalar(0.55) }, uLit: { value: PAL.signal.clone() } },
    ]),
  });
}

// Sky: a vertical gradient that meets the fog colour at the horizon.
const skyVert = /* glsl */ `varying vec3 vW; void main(){ vW = normalize((modelMatrix * vec4(position,1.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const skyFrag = /* glsl */ `uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vW;
  void main(){ float h = clamp(vW.y * 1.6, 0.0, 1.0); gl_FragColor = vec4(mix(uHorizon, uTop, pow(h, 0.7)), 1.0); }`;

// Snow on the GPU: positions wrap in the shader, nothing is uploaded per frame.
const snowVert = /* glsl */ `
  uniform float uTime; uniform float uSize; attribute float aSeed;
  varying float vA;
  void main(){
    vec3 p = position;
    p.y = mod(p.y - uTime * (0.45 + aSeed * 0.5), 40.0);
    p.x += sin(uTime * 0.35 + aSeed * 40.0) * 0.8;
    p.z += cos(uTime * 0.27 + aSeed * 23.0) * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * (0.6 + aSeed) * (60.0 / -mv.z), 7.0);
    vA = smoothstep(120.0, 20.0, -mv.z) * smoothstep(8.0, 18.0, -mv.z);
  }`;
const snowFrag = /* glsl */ `varying float vA;
  void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vec3(1.0), a * vA * 0.9); }`;

// ---------------------------------------------------------------- terrain noise

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < 5; i++) {
    s += a * vnoise(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}

// ---------------------------------------------------------------- the scene

export type Lcd = { set: (text: string, opts?: { caption?: string; live?: boolean }) => void };

export class ClockScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(26, 1, 0.5, 900);
  readonly composer: EffectComposer;
  readonly ao: N8AOPostPass;
  private root = new THREE.Group();
  private shell = new THREE.Group();
  private rocker = new THREE.Group();
  private base = new THREE.Group();
  private board = new THREE.Group();
  private interior: THREE.PointLight;
  private led!: THREE.MeshStandardMaterial;
  private traces: THREE.ShaderMaterial[] = [];
  private tracePaths: THREE.CurvePath<THREE.Vector3>[] = [];
  private dipSliders: THREE.Mesh[] = [];
  private reactiveRing!: THREE.MeshBasicMaterial;
  private rejectDot!: THREE.Mesh;
  private snow!: THREE.ShaderMaterial;
  private anchors = new Map<string, Anchor>();
  private pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  private timer = new THREE.Timer();
  private dpr: number;
  private frameMs: number[] = [];
  private lastShadowKey = "";
  private ledFlash = 0;
  readonly lcdLeft: Lcd;
  readonly lcdRight: Lcd;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  onFrame: (() => void) | null = null;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", stencil: false, depth: true });
    this.dpr = Math.min(devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false; // re-rendered only when something that casts moves
    host.appendChild(this.renderer.domElement);

    this.scene.fog = new THREE.FogExp2(PAL.horizon.getHex(), state.fog);
    this.scene.background = PAL.horizon.clone();
    this.buildSky();
    this.buildEnvironment();
    this.buildLights();
    this.buildGround();
    this.buildClock();
    this.buildSnow();
    this.scene.add(this.root);
    this.interior = new THREE.PointLight("#ffcf9e", 0, 20, 1.8);
    this.interior.position.set(0, 3.0, 0.4);
    this.root.add(this.interior);

    this.lcdLeft = this.buildLcd(-4.55, "lcdLeft", "ACROSS");
    this.lcdRight = this.buildLcd(4.55, "lcdRight", "SNAPSETTLE");

    const w = host.clientWidth, h = host.clientHeight;
    this.composer = new EffectComposer(this.renderer, { multisampling: 0, frameBufferType: THREE.HalfFloatType });
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = new N8AOPostPass(this.scene, this.camera, w, h);
    this.ao.configuration.aoRadius = 1.6;
    this.ao.configuration.distanceFalloff = 0.6;
    this.ao.configuration.intensity = 3.2;
    this.ao.configuration.color = new THREE.Color("#1b2430");
    // Full resolution: n8ao's half-res path builds a multi-target that three r187 rejects.
    this.ao.configuration.halfRes = false;
    this.ao.configuration.gammaCorrection = false;
    this.ao.setQualityMode("Low");
    this.composer.addPass(this.ao);
    const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.95, luminanceSmoothing: 0.08, intensity: 0.9, radius: 0.65 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    const vignette = new VignetteEffect({ offset: 0.3, darkness: 0.42 });
    const noise = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SOFT_LIGHT });
    noise.blendMode.opacity.value = 0.035;
    this.composer.addPass(new EffectPass(this.camera, bloom, tone, vignette, noise));
    this.composer.addPass(new EffectPass(this.camera, new SMAAEffect({ preset: SMAAPreset.HIGH })));

    addEventListener("resize", () => this.resize());
    addEventListener("pointermove", (e) => {
      this.pointer.x = (e.clientX / innerWidth) * 2 - 1;
      this.pointer.y = (e.clientY / innerHeight) * 2 - 1;
    });
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ------------------------------------------------------------ world

  private buildSky() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(500, 32, 16),
      new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTop: { value: PAL.zenith }, uHorizon: { value: PAL.horizon } } }),
    );
    this.scene.add(sky);
  }

  /** Studio reflections: a few soft "lightformer" panels rendered into an environment map. */
  private buildEnvironment() {
    const env = new THREE.Scene();
    env.background = new THREE.Color("#121519"); // studio black: only the softboxes reflect
    const panel = (w: number, h: number, intensity: number, pos: [number, number, number], rot: [number, number, number], color = "#ffffff") => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
      m.position.set(...pos);
      m.rotation.set(...rot);
      env.add(m);
    };
    panel(14, 4, 2.2, [0, 9, 2], [Math.PI / 2, 0, 0]); // overhead strip
    panel(4, 10, 1.6, [-10, 3, 4], [0, Math.PI / 2, 0]); // left softbox
    panel(3, 8, 0.9, [10, 2, -2], [0, -Math.PI / 2, 0], "#dfe8f2"); // cool right fill
    panel(20, 2, 1.2, [0, 1.5, -10], [0, 0, 0]); // horizon band behind
    panel(30, 30, 0.35, [0, -6, 0], [-Math.PI / 2, 0, 0], "#c9d0d7"); // snow bounce
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(env, 0.02).texture;
    this.scene.environmentIntensity = 1.0;
  }

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight("#e6edf5", "#586577", 0.45));
    const key = new THREE.DirectionalLight("#fff3e2", 3.2);
    key.position.set(-26, 30, 14);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -20;
    key.shadow.camera.right = 20;
    key.shadow.camera.top = 20;
    key.shadow.camera.bottom = -20;
    key.shadow.radius = 4;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.025;
    this.scene.add(key);
    // Cool rim from behind-right: outlines the dark body against the fog.
    const rim = new THREE.DirectionalLight("#cfe0ff", 1.6);
    rim.position.set(22, 16, -26);
    this.scene.add(rim);
  }

  private buildGround() {
    const size = 520;
    const g = new THREE.PlaneGeometry(size, size, 256, 256);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const r = Math.hypot(x, z);
      const near = THREE.MathUtils.smoothstep(r, 13, 40);
      const far = THREE.MathUtils.smoothstep(r, 55, 210);
      const drift = fbm(x * 0.05 + 7, z * 0.05 - 3) * 2.6 * near;
      const ridge = Math.pow(fbm(x * 0.011 - 11, z * 0.011 + 5), 2.0) * 95 * far;
      const ripple = (fbm(x * 0.6, z * 0.6) - 0.5) * 0.06 * (1 - near * 0.5);
      p.setY(i, drift + ridge + ripple);
    }
    g.computeVertexNormals();
    const snowBump = noiseTex(512, 1, 90, 170);
    snowBump.wrapS = snowBump.wrapT = THREE.RepeatWrapping;
    snowBump.repeat.set(90, 90);
    const m = new THREE.MeshStandardMaterial({ color: PAL.snow, roughness: 0.92, metalness: 0, bumpMap: snowBump, bumpScale: 0.35 });
    const ground = new THREE.Mesh(g, m);
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private buildSnow() {
    const n = 2600;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 140;
      pos[i * 3 + 1] = Math.random() * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 140;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    this.snow = new THREE.ShaderMaterial({ vertexShader: snowVert, fragmentShader: snowFrag, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uSize: { value: 5.5 } } });
    const pts = new THREE.Points(g, this.snow);
    pts.frustumCulled = false;
    this.scene.add(pts);
  }

  // ------------------------------------------------------------ the clock

  private buildClock() {
    const softTouch = new THREE.MeshPhysicalMaterial({
      color: PAL.body, roughness: 0.66, metalness: 0, envMapIntensity: 0.9,
      sheen: 0.12, sheenColor: new THREE.Color("#6f7b89"), sheenRoughness: 0.7,
      roughnessMap: noiseTex(256, 1, 200, 240),
    });
    const baseMat = new THREE.MeshPhysicalMaterial({ color: PAL.base, roughness: 0.72, clearcoat: 0.08, envMapIntensity: 0.5, sheen: 0.2, sheenColor: new THREE.Color("#5c6772") });
    const brushed = noiseTex(1024, 60, 70, 150);
    brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping;
    // Brushed only on flat faces: on bevels the streaks cross the edge and break the highlight into dashes.
    const aluBrushed = new THREE.MeshPhysicalMaterial({ color: PAL.alu, metalness: 1, roughness: 0.42, roughnessMap: brushed, anisotropy: 0.6 });
    const alu = new THREE.MeshPhysicalMaterial({ color: PAL.alu, metalness: 1, roughness: 0.3 });
    const rubber = new THREE.MeshStandardMaterial({ color: "#2b2f34", roughness: 0.92 });

    // Base tray, with a dark seam where the shell meets it.
    const tray = new THREE.Mesh(new RoundedBoxGeometry(20.2, 1.0, 10.2, 6, 0.34), baseMat);
    tray.position.y = 0.5;
    tray.castShadow = tray.receiveShadow = true;
    this.base.add(tray);
    for (const [x, z] of [[-8.7, 4.1], [8.7, 4.1], [-8.7, -4.1], [8.7, -4.1]]) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.14, 28), rubber);
      foot.position.set(x, 0.0, z);
      this.base.add(foot);
    }

    // Shell: the wedge profile, extruded across the width with deep soft bevels.
    const inset = 0.42;
    const s = new THREE.Shape();
    const P: Array<[number, number]> = [[5 - inset, 1.06], [5 - inset, 2.6 - 0.12], [-1.5 + 0.06, 6.2 - inset], [-5 + inset, 6.2 - inset], [-5 + inset, 1.06]];
    s.moveTo(-P[0][0], P[0][1]);
    for (const [z, y] of P.slice(1)) s.lineTo(-z, y);
    s.closePath();
    const width = 20 - 2 * inset;
    const sg = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelThickness: inset, bevelSize: inset, bevelSegments: 10, curveSegments: 12 });
    sg.rotateY(Math.PI / 2);
    sg.translate(-width / 2, 0, 0);
    sg.computeVertexNormals();
    const shellMesh = new THREE.Mesh(sg, softTouch);
    shellMesh.castShadow = shellMesh.receiveShadow = true;
    this.shell.add(shellMesh);

    // Brushed faceplate on the slope, screwed down at the corners.
    const slope = new THREE.Group();
    slope.position.set(0, SLOPE.mid.y, SLOPE.mid.x);
    slope.rotation.x = SLOPE.tilt;
    this.shell.add(slope);
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(18.4, 6.3, 0.5), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 3 }), [aluBrushed, alu]);
    plate.position.z = 0.07;
    plate.castShadow = true;
    slope.add(plate);
    const screwGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.06, 20);
    screwGeo.rotateX(Math.PI / 2);
    const screwMat = new THREE.MeshPhysicalMaterial({ color: "#9aa1a8", metalness: 1, roughness: 0.28 });
    const slotGeo = new THREE.BoxGeometry(0.22, 0.04, 0.03);
    const slotMat = new THREE.MeshStandardMaterial({ color: "#3a3f45", roughness: 0.6 });
    for (const [x, y] of [[-8.75, 2.75], [8.75, 2.75], [-8.75, -2.75], [8.75, -2.75]]) {
      const sc = new THREE.Mesh(screwGeo, screwMat);
      sc.position.set(x, y, 0.22);
      slope.add(sc);
      const sl = new THREE.Mesh(slotGeo, slotMat);
      sl.position.set(x, y, 0.25);
      sl.rotation.z = (x * 7 + y * 3) % Math.PI;
      slope.add(sl);
    }
    // Faceplate printing between and under the clocks.
    const print = canvasTex(2048, 700, (g) => {
      g.clearRect(0, 0, 2048, 700);
      g.fillStyle = "rgba(22,25,28,0.78)";
      g.font = '600 30px "Martian Mono Variable", monospace';
      g.textAlign = "center";
      g.fillText("FILL", 1024, 330);
      g.fillText("→ REPAID", 1024, 372);
      g.fillRect(1022, 120, 4, 160);
      g.fillRect(1022, 420, 4, 160);
      g.textAlign = "left";
      g.font = '500 24px "Martian Mono Variable", monospace';
      g.fillText("ACROSS · 30 MIN CHALLENGE · HUBPOOL LIVENESS 1800", 84, 660);
      g.textAlign = "right";
      g.fillText("REACTIVE NETWORK · LASNA 5318007", 1964, 660);
    });
    const printPlane = new THREE.Mesh(new THREE.PlaneGeometry(18.4, 6.29), new THREE.MeshStandardMaterial({ map: print.tex, transparent: true, roughness: 0.5, metalness: 0.4 }));
    printPlane.position.z = 0.195;
    slope.add(printPlane);
    // Status LED between the clocks.
    this.led = new THREE.MeshStandardMaterial({ color: "#3a1206", emissive: PAL.signal, emissiveIntensity: 0.6, roughness: 0.3 });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 12), this.led);
    led.scale.z = 0.5;
    led.position.set(0, -0.15, 0.24);
    slope.add(led);
    this.anchor("led", led, 0, 0, 0);

    // Front lip printing.
    const lip = canvasTex(2048, 160, (g) => {
      g.clearRect(0, 0, 2048, 160);
      g.fillStyle = "rgba(196,204,212,0.82)";
      g.font = '600 52px "Martian Mono Variable", monospace';
      g.textBaseline = "middle";
      g.fillText("SNAPSETTLE", 40, 84);
      g.textAlign = "right";
      g.font = '400 34px "Martian Mono Variable", monospace';
      g.fillText("DUAL TIMER  ·  BASE / UNICHAIN / LASNA", 2008, 86);
    });
    const lipPlane = new THREE.Mesh(new THREE.PlaneGeometry(15, 1.17), new THREE.MeshStandardMaterial({ map: lip.tex, transparent: true, roughness: 0.6 }));
    lipPlane.position.set(0, 1.78, 5.005);
    this.shell.add(lipPlane);

    // Rocker: an aluminium bar with rubber caps, pivoting on a hinge block in the middle of the ridge.
    const bar = new THREE.Mesh(new RoundedBoxGeometry(16.8, 0.62, 2.0, 6, 0.28), alu);
    bar.castShadow = true;
    this.rocker.add(bar);
    for (const x of [-6.0, 6.0]) {
      const cap = new THREE.Mesh(new RoundedBoxGeometry(4.0, 0.26, 2.06, 4, 0.12), rubber);
      cap.position.set(x, 0.3, 0);
      cap.castShadow = true;
      this.rocker.add(cap);
    }
    this.rocker.position.set(0, 6.52, -3.25);
    const hinge = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.8, 2.4, 4, 0.24), softTouch);
    hinge.position.set(0, 6.2, -3.25);
    hinge.castShadow = true;
    this.shell.add(hinge);
    this.shell.add(this.rocker);
    this.anchor("rocker", this.rocker, 6, 0.5, 0);

    this.buildBoard();
    this.root.add(this.base, this.board, this.shell);
  }

  private buildLcd(x: number, name: string, caption: string): Lcd {
    const slope = new THREE.Group();
    slope.position.set(x, SLOPE.mid.y, SLOPE.mid.x);
    slope.rotation.x = SLOPE.tilt;
    this.shell.add(slope);

    // Bezel: a glossy black frame with a real opening, standing proud of the faceplate.
    const outer = roundedRect(7.9, 3.75, 0.32);
    outer.holes.push(holePath(7.1, 3.0, 0.16));
    const bezel = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 10 }), new THREE.MeshPhysicalMaterial({ color: "#0c0e10", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }));
    bezel.position.z = 0.19;
    bezel.castShadow = true;
    slope.add(bezel);

    const W = 1024, H = 432;
    const lcd = canvasTex(W, H, () => undefined);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(7.1, 3.0), new THREE.MeshStandardMaterial({ map: lcd.tex, roughness: 0.6, metalness: 0, emissive: new THREE.Color("#ffffff"), emissiveMap: lcd.tex, emissiveIntensity: 0.42 }));
    face.position.z = 0.21;
    slope.add(face);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(7.12, 3.02), new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.03, metalness: 0, transparent: true, opacity: 0.1, envMapIntensity: 2.4, clearcoat: 1, clearcoatRoughness: 0 }));
    glass.position.z = 0.3;
    slope.add(glass);
    this.anchor(name, slope, 0, 0.9, 0.3);

    let last = "";
    const set: Lcd["set"] = (text, opts = {}) => {
      const cap = opts.caption ?? caption;
      const key = `${text}|${cap}|${opts.live}`;
      if (key === last) return;
      last = key;
      const g = lcd.g;
      g.fillStyle = PAL.lcd;
      g.fillRect(0, 0, W, H);
      // Backlight falloff, brighter in the middle like a real panel.
      const grd = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.62);
      grd.addColorStop(0, "rgba(255,255,255,0.22)");
      grd.addColorStop(1, "rgba(40,60,40,0.18)");
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      g.textBaseline = "alphabetic";
      g.textAlign = "right";
      const size = text.length > 8 ? 170 : 196;
      g.font = `700 ${size}px "DSEG7", monospace`;
      g.fillStyle = "rgba(10,13,13,0.07)";
      g.fillText(text.replace(/[0-9]/g, "8"), W - 50, H - 92);
      // A faint drop shadow: the segments sit a hair above the backlight.
      g.fillStyle = "rgba(10,13,13,0.18)";
      g.fillText(text, W - 46, H - 88);
      g.fillStyle = PAL.seg;
      g.fillText(text, W - 50, H - 92);
      g.textAlign = "left";
      g.font = '600 36px "Martian Mono Variable", monospace';
      g.fillStyle = "rgba(10,13,13,0.86)";
      g.fillText(cap, 46, 66);
      if (opts.live) {
        g.font = '600 30px "Martian Mono Variable", monospace';
        g.fillText("● LIVE", 46, H - 38);
      }
      lcd.tex.needsUpdate = true;
    };
    return { set };
  }

  // ------------------------------------------------------------ the circuit

  private buildBoard() {
    const top = 1.16;
    const pcbMat = new THREE.MeshPhysicalMaterial({ color: PAL.pcb, roughness: 0.42, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3 });
    const pcb = new THREE.Mesh(new RoundedBoxGeometry(18.6, 0.16, 8.9, 3, 0.06), pcbMat);
    pcb.position.y = top - 0.08;
    pcb.receiveShadow = true;
    this.board.add(pcb);

    const silk = canvasTex(2048, 980, (g) => {
      g.clearRect(0, 0, 2048, 980);
      g.strokeStyle = "rgba(236,240,236,0.5)";
      g.lineWidth = 2.5;
      g.strokeRect(24, 24, 2000, 932);
      g.fillStyle = "rgba(236,240,236,0.8)";
      g.font = '600 30px "Martian Mono Variable", monospace';
      g.fillText("SNAPSETTLE · SETTLEMENT LOOP", 52, 70);
      g.textAlign = "right";
      g.fillText("ERC-7683 · REACTIVE OMNI", 1996, 70);
      g.fillStyle = "rgba(214,178,96,0.9)";
      for (let i = 0; i < 24; i++) g.fillRect(560 + i * 44, 900, 22, 34);
      for (const [x, y] of [[60, 920], [1990, 920], [1990, 120]]) {
        g.beginPath();
        g.arc(x, y, 12, 0, Math.PI * 2);
        g.fill();
      }
    });
    const silkPlane = new THREE.Mesh(new THREE.PlaneGeometry(18.6, 8.9), new THREE.MeshStandardMaterial({ map: silk.tex, transparent: true, roughness: 0.5, metalness: 0.3 }));
    silkPlane.rotation.x = -Math.PI / 2;
    silkPlane.position.y = top + 0.002;
    this.board.add(silkPlane);

    const chipMat = new THREE.MeshPhysicalMaterial({ color: "#16191c", roughness: 0.48, sheen: 0.3, sheenColor: new THREE.Color("#55606b") });
    const pinMat = new THREE.MeshPhysicalMaterial({ color: "#cfd3d6", metalness: 1, roughness: 0.25 });
    const chip = (name: string, x: number, z: number, w: number, d: number, l1: string, l2: string, l3: string) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new RoundedBoxGeometry(w, 0.42, d, 3, 0.07), chipMat);
      body.position.y = 0.21;
      body.castShadow = true;
      g.add(body);
      const tex = canvasTex(512, Math.round((512 * d) / w), (c) => {
        const H = c.canvas.height;
        c.clearRect(0, 0, 512, H);
        c.fillStyle = "rgba(226,231,235,0.92)";
        c.font = '700 46px "Martian Mono Variable", monospace';
        c.fillText(l1, 34, H * 0.42);
        c.fillStyle = "rgba(226,231,235,0.6)";
        c.font = '500 28px "Martian Mono Variable", monospace';
        c.fillText(l2, 34, H * 0.42 + 50);
        c.fillText(l3, 34, H * 0.42 + 88);
        c.beginPath();
        c.arc(40, 38, 10, 0, Math.PI * 2);
        c.fillStyle = "rgba(226,231,235,0.3)";
        c.fill();
      }).tex;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, d - 0.12), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 }));
      label.rotation.x = -Math.PI / 2;
      label.position.y = 0.423;
      g.add(label);
      const pinGeo = new THREE.BoxGeometry(0.12, 0.08, 0.34);
      const nx = Math.floor(w / 0.42), nz = Math.floor(d / 0.42);
      const pins = new THREE.InstancedMesh(pinGeo, pinMat, (nx + nz) * 2);
      const m = new THREE.Matrix4();
      let k = 0;
      for (let i = 0; i < nx; i++) {
        const px = -w / 2 + (i + 0.5) * (w / nx);
        m.makeTranslation(px, 0.06, d / 2 + 0.12);
        pins.setMatrixAt(k++, m);
        m.makeTranslation(px, 0.06, -d / 2 - 0.12);
        pins.setMatrixAt(k++, m);
      }
      const r = new THREE.Matrix4().makeRotationY(Math.PI / 2);
      for (let i = 0; i < nz; i++) {
        const pz = -d / 2 + (i + 0.5) * (d / nz);
        m.makeTranslation(w / 2 + 0.12, 0.06, pz).multiply(r);
        pins.setMatrixAt(k++, m);
        m.makeTranslation(-w / 2 - 0.12, 0.06, pz).multiply(r);
        pins.setMatrixAt(k++, m);
      }
      g.add(pins);
      g.position.set(x, top, z);
      this.board.add(g);
      this.anchor(name, g, 0, 0.5, 0);
      return g;
    };

    chip("chipEscrow", -5.6, 1.4, 3.3, 3.3, "ESCROW", "BASE SEPOLIA", "84532");
    chip("chipResolver", -5.6, -2.45, 2.6, 1.7, "RESOLVER", "ERC-7683", "BASE");
    chip("chipSettler", 0.2, -1.9, 3.1, 3.1, "SETTLER", "UNICHAIN SEP.", "1301");
    const reactive = chip("chipReactive", 5.6, 1.0, 3.9, 3.9, "REACTIVE", "LASNA", "5318007");
    this.reactiveRing = new THREE.MeshBasicMaterial({ color: PAL.signal, transparent: true, opacity: 0, fog: true });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.75, 2.83, 96), this.reactiveRing);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    reactive.add(ring);

    const xtal = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.5, 0.62, 3, 0.25), new THREE.MeshPhysicalMaterial({ color: "#d9dde0", metalness: 1, roughness: 0.2 }));
    xtal.position.set(8.2, top + 0.25, -2.3);
    xtal.castShadow = true;
    this.board.add(xtal);
    this.anchor("crystal", xtal, 0, 0.3, 0);

    const dip = new THREE.Group();
    const dipBody = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.36, 1.2, 2, 0.04), new THREE.MeshStandardMaterial({ color: "#1f4fa8", roughness: 0.45 }));
    dipBody.position.y = 0.18;
    dipBody.castShadow = true;
    dip.add(dipBody);
    for (let i = 0; i < 3; i++) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.9), new THREE.MeshStandardMaterial({ color: "#0f1114", roughness: 0.8 }));
      slot.position.set(-0.72 + i * 0.72, 0.37, 0);
      dip.add(slot);
      const slider = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.16, 0.36, 2, 0.04), new THREE.MeshStandardMaterial({ color: "#e9ecee", roughness: 0.5 }));
      slider.position.set(-0.72 + i * 0.72, 0.42, 0.22);
      dip.add(slider);
      this.dipSliders.push(slider);
    }
    dip.position.set(1.4, top, 2.3);
    this.board.add(dip);
    this.anchor("dip", dip, 0, 0.5, 0);

    const capMat = new THREE.MeshPhysicalMaterial({ color: "#c9ccd0", metalness: 0.8, roughness: 0.3 });
    const caps = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 18), capMat, 16);
    const resMat = new THREE.MeshStandardMaterial({ color: "#14171a", roughness: 0.55 });
    const res = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.14, 0.22), resMat, 40);
    const m = new THREE.Matrix4();
    const capSpots: Array<[number, number]> = [[-3.2, 3.2], [-2.6, 3.2], [-2.0, 3.2], [2.4, -3.6], [3.0, -3.6], [3.6, -3.6], [8.0, 3.3], [8.0, 2.7], [-8.4, -0.4], [-8.4, 0.2], [-1.6, -3.7], [-1.0, -3.7]];
    capSpots.forEach(([x, z], i) => {
      m.makeTranslation(x, top + 0.21, z);
      caps.setMatrixAt(i, m);
    });
    caps.count = capSpots.length;
    let k = 0;
    for (let i = 0; i < 8; i++) {
      m.makeTranslation(-8.6 + i * 0.5, top + 0.07, -3.9);
      res.setMatrixAt(k++, m);
      m.makeTranslation(6.4 + (i % 4) * 0.55, top + 0.07, -0.95 - Math.floor(i / 4) * 0.4);
      res.setMatrixAt(k++, m);
    }
    for (let i = 0; i < 6; i++) {
      m.makeTranslation(-1.6 + i * 0.5, top + 0.07, 0.6);
      res.setMatrixAt(k++, m);
    }
    res.count = k;
    caps.castShadow = res.castShadow = true;
    this.board.add(caps, res);

    const y = top + 0.035;
    const path = (pts: Array<[number, number]>) => {
      const cp = new THREE.CurvePath<THREE.Vector3>();
      for (let i = 0; i < pts.length - 1; i++) cp.add(new THREE.LineCurve3(new THREE.Vector3(pts[i][0], y, pts[i][1]), new THREE.Vector3(pts[i + 1][0], y, pts[i + 1][1])));
      return cp;
    };
    const legs: Array<Array<[number, number]>> = [
      [[-3.95, 0.6], [-2.2, 0.6], [-2.2, -1.9], [-1.35, -1.9]],
      [[1.75, -1.9], [3.1, -1.9], [3.1, 0.2], [3.65, 0.2]],
      [[5.6, 2.95], [5.6, 3.75], [-5.6, 3.75], [-5.6, 3.05]],
      [[-5.6, -1.6], [-5.6, -0.25]],
    ];
    legs.forEach((pts, i) => {
      const cp = path(pts);
      const mat = traceMaterial();
      this.board.add(new THREE.Mesh(new THREE.TubeGeometry(cp, 160, i === 3 ? 0.06 : 0.085, 8, false), mat));
      this.traces.push(mat);
      this.tracePaths.push(cp);
      const a = new THREE.Object3D();
      a.position.copy(cp.getPointAt(0.5));
      this.board.add(a);
      this.anchor(`trace${i}`, a, 0, 0, 0);
    });
    const quiet = new THREE.MeshPhysicalMaterial({ color: "#b89a5a", roughness: 0.35, metalness: 0.9 });
    const bus: Array<Array<[number, number]>> = [];
    for (let i = 0; i < 6; i++) bus.push([[-8.9, -3.2 + i * 0.28], [-7.6, -3.2 + i * 0.28], [-7.25, -2.9 + i * 0.28]]);
    for (let i = 0; i < 5; i++) bus.push([[7.6, 1.6 + i * 0.3], [8.95, 1.6 + i * 0.3]]);
    for (let i = 0; i < 4; i++) bus.push([[-0.4 + i * 0.3, -0.35], [-0.4 + i * 0.3, 0.45]]);
    for (const pts of bus) this.board.add(new THREE.Mesh(new THREE.TubeGeometry(path(pts), 30, 0.04, 6, false), quiet));

    this.rejectDot = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), new THREE.MeshBasicMaterial({ color: PAL.signal }));
    this.rejectDot.visible = false;
    this.board.add(this.rejectDot);
  }

  // ------------------------------------------------------------ anchors for the HTML annotation layer

  private anchor(name: string, obj: THREE.Object3D, dx: number, dy: number, dz: number) {
    const a = new THREE.Object3D();
    a.position.set(dx, dy, dz);
    obj.add(a);
    this.anchors.set(name, { obj: a, x: 0, y: 0, z: 0, on: false });
  }

  project(name: string) {
    return this.anchors.get(name);
  }

  // ------------------------------------------------------------ live behaviour

  pulse(durations: [number, number, number], onLeg?: (i: number) => void): Promise<void> {
    this.ledFlash = 1;
    return new Promise((resolve) => {
      let leg = 0;
      let start = performance.now();
      const step = () => {
        const t = (performance.now() - start) / Math.max(durations[leg], 120);
        this.traces[leg].uniforms.uHead.value = Math.min(t, 1);
        if (t >= 1) {
          this.traces[leg].uniforms.uHead.value = -1;
          leg++;
          if (leg >= 3) {
            this.ledFlash = 1;
            return resolve();
          }
          onLeg?.(leg);
          start = performance.now();
        }
        requestAnimationFrame(step);
      };
      onLeg?.(0);
      step();
    });
  }

  /** Runs one light head along leg i (0 open→fill, 1 fill→seen, 2 settle callback). */
  legPulse(i: number, ms = 650) {
    const m = this.traces[i];
    if (!m) return;
    const start = performance.now();
    if (i === 2) this.ledFlash = 1;
    const step = () => {
      const t = (performance.now() - start) / ms;
      m.uniforms.uHead.value = t >= 1 ? -1 : t;
      if (t < 1) requestAnimationFrame(step);
    };
    step();
  }

  press(side: 1 | -1) {
    state.rocker = side;
  }

  // ------------------------------------------------------------ frame

  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 40 : w / h < 1.2 ? 32 : 26;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
  }

  /** Drops the pixel ratio a step when frames run long, so scrolling stays smooth on slower GPUs. */
  private adapt(ms: number) {
    this.frameMs.push(ms);
    if (this.frameMs.length < 90) return;
    const avg = this.frameMs.reduce((a, b) => a + b, 0) / this.frameMs.length;
    this.frameMs = [];
    const max = Math.min(devicePixelRatio, 1.5);
    if (avg > 21 && this.dpr > 0.85) {
      this.dpr = Math.max(0.85, this.dpr - 0.25);
      this.renderer.setPixelRatio(this.dpr);
      this.resize();
    } else if (avg < 11 && this.dpr < max) {
      this.dpr = Math.min(max, this.dpr + 0.25);
      this.renderer.setPixelRatio(this.dpr);
      this.resize();
    }
  }

  private v = new THREE.Vector3();
  private rockerNow = 1;
  private frame() {
    this.timer.update();
    const dtRaw = this.timer.getDelta();
    const dt = Math.min(dtRaw, 0.05);
    const t = this.timer.getElapsed();
    const S = state;
    this.adapt(dtRaw * 1000);

    const k = this.reduced ? 0 : 1;
    this.pointer.sx += (this.pointer.x * k - this.pointer.sx) * 0.05;
    this.pointer.sy += (this.pointer.y * k - this.pointer.sy) * 0.05;
    this.root.rotation.y = S.spin + this.pointer.sx * 0.05;
    this.root.position.x = S.slide;

    const L = Math.min(S.lift, 1);
    const e = L * L * (3 - 2 * L);
    const away = Math.max(0, S.lift - 1);
    const a2 = away * away * (3 - 2 * away);
    this.shell.position.set(0, e * 7.2 + a2 * 16, -e * 3.4 - a2 * 6);
    this.shell.rotation.x = -e * 0.16 - a2 * 0.2;
    this.rocker.position.y = 6.52 + e * 2.0;
    this.board.position.y = e * 1.1;
    this.interior.intensity = S.glow * 16;
    this.reactiveRing.opacity = S.glow * (0.35 + 0.25 * Math.sin(t * 2.2));

    this.rockerNow += (S.rocker - this.rockerNow) * Math.min(1, dt * 14);
    this.rocker.rotation.z = -0.055 * this.rockerNow;

    this.ledFlash = Math.max(0, this.ledFlash - dt * 1.4);
    this.led.emissiveIntensity = 0.5 + 0.35 * Math.sin(t * 2.4) + this.ledFlash * 6;

    this.traces[0].uniforms.uProgress.value = S.t0;
    this.traces[1].uniforms.uProgress.value = S.t1;
    this.traces[2].uniforms.uProgress.value = S.t2;
    this.traces[3].uniforms.uProgress.value = S.t3;
    for (const m of this.traces) m.uniforms.uDim.value = S.dim;

    this.dipSliders.forEach((s, i) => {
      const on = Math.max(0, 1 - Math.abs(S.tier - i));
      s.position.z = 0.22 - 0.44 * on;
    });

    if (S.reject > 0 && S.reject < 1) {
      this.rejectDot.visible = true;
      this.rejectDot.position.copy(this.tracePaths[1].getPointAt(Math.min(S.reject, 0.86)));
      this.rejectDot.position.y += 0.2;
      (this.rejectDot.material as THREE.MeshBasicMaterial).color.set(S.reject > 0.86 ? "#5b636b" : "#ff5a1f");
    } else this.rejectDot.visible = false;

    (this.scene.fog as THREE.FogExp2).density = S.fog;
    this.snow.uniforms.uTime.value = this.reduced ? 0 : t;

    // Shadows only re-render when a caster moved.
    const sk = `${S.lift.toFixed(3)}|${this.rockerNow.toFixed(3)}|${this.root.rotation.y.toFixed(3)}|${S.slide.toFixed(2)}|${S.tier.toFixed(2)}`;
    if (sk !== this.lastShadowKey) {
      this.lastShadowKey = sk;
      this.renderer.shadowMap.needsUpdate = true;
    }

    this.camera.position.set(S.camX + this.pointer.sx * 0.8, S.camY - this.pointer.sy * 0.5, S.camZ);
    this.camera.lookAt(S.tgtX, S.tgtY, S.tgtZ);

    this.root.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    const w = this.host.clientWidth, h = this.host.clientHeight;
    for (const a of this.anchors.values()) {
      a.obj.getWorldPosition(this.v);
      this.v.project(this.camera);
      a.x = (this.v.x * 0.5 + 0.5) * w;
      a.y = (-this.v.y * 0.5 + 0.5) * h;
      a.z = this.v.z;
      a.on = this.v.z < 1 && a.x > -40 && a.x < w + 40 && a.y > -40 && a.y < h + 40;
    }

    this.composer.render(dt);
    this.onFrame?.();
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

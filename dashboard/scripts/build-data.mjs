// Collects deployment addresses and bench/negative evidence into dashboard/public/data/.
// LOCAL data is included only when DASH_INCLUDE_LOCAL !== "0" (the public build sets it to 0).
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const out = join(here, "../public/data");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const envs = process.env.DASH_INCLUDE_LOCAL === "0" ? ["live"] : ["live", "local"];
const RPC = {
  live: { origin: "https://sepolia.base.org", dest: "https://sepolia.unichain.org", lasna: "https://lasna-rpc.rnk.dev/" },
  local: { origin: "http://127.0.0.1:8545", dest: "http://127.0.0.1:8546", lasna: "http://127.0.0.1:8547" },
};
const CIRCLE = { origin: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", dest: "0x31d0220469e10c4E71834a79b1f276d740d3768F" };

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const dep = (env, step, key) => {
  const p = join(root, "contracts/deployments", env, `${step}.json`);
  return existsSync(p) ? readJson(p)[key] : null;
};

const manifest = { envs: [] };
for (const env of envs) {
  const escrow = dep(env, "3-origin", "originEscrow");
  const config = {
    env,
    deployed: Boolean(escrow && dep(env, "2-reactive", "snapsettleReactive") && dep(env, "1-destination", "destinationSettler")),
    rpc: RPC[env],
    chains: { origin: 84532, dest: 1301, lasna: 5318007 },
    explorers: env === "live"
      ? { origin: "https://sepolia.basescan.org", dest: "https://sepolia.uniscan.xyz", lasna: "https://lasna.reactscan.net" }
      : { origin: null, dest: null, lasna: null },
    addresses: {
      escrow,
      destinationSettler: dep(env, "1-destination", "destinationSettler"),
      reactive: dep(env, "2-reactive", "snapsettleReactive"),
      resolver: dep(env, "5-resolver", "snapsettleResolver"),
      tokenOrigin: env === "local" ? dep(env, "token-84532", "token") : CIRCLE.origin,
      tokenDest: env === "local" ? dep(env, "token-1301", "token") : CIRCLE.dest,
    },
  };
  writeFileSync(join(out, `config.${env}.json`), JSON.stringify(config, null, 2));

  const evDir = join(root, "evidence", env);
  const runs = [];
  const negatives = [];
  if (existsSync(evDir)) {
    for (const d of readdirSync(evDir).sort()) {
      const sum = join(evDir, d, "summary.json");
      if (d.startsWith("bench-") && existsSync(sum)) {
        const s = readJson(sum);
        const loops = readFileSync(join(evDir, d, "loops.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
        runs.push({ run: d, ...s, loops: loops.map((r) => ({ i: r.i, orderId: r.orderId, ok: r.ok, seg: r.seg, tx: r.tx })) });
      }
      const cases = join(evDir, d, "cases.jsonl");
      if (d.startsWith("negative-") && existsSync(cases)) {
        for (const l of readFileSync(cases, "utf8").trim().split("\n").filter(Boolean)) negatives.push({ run: d, ...JSON.parse(l) });
      }
    }
  }
  writeFileSync(join(out, `evidence.${env}.json`), JSON.stringify({ env, runs, negatives }, null, 2));
  manifest.envs.push({ env, deployed: config.deployed, runs: runs.length, negatives: negatives.length });
}
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("dashboard data:", JSON.stringify(manifest));

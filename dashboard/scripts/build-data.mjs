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
    // Deploy-script defaults (contracts/script/Deploy.s.sol), shown before the live contracts can be read.
    plannedTiers: [
      { maxAmount: String(500000), delay: 0 },
      { maxAmount: String(2000000), delay: 30 },
      { maxAmount: (2n ** 256n - 1n).toString(), delay: 300 },
    ],
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
    // The always-on demo service (offchain/src/demo.ts), if one is running: "Run one live order".
    demoApi: env === "live" ? process.env.DEMO_API ?? null : null,
  };
  writeFileSync(join(out, `config.${env}.json`), JSON.stringify(config, null, 2));

  const evDir = join(root, "evidence", env);
  const runs = [];
  const negatives = [];
  // Same correction as JUDGE.md: open → fill from the solver's own fill receipt (the bench used to read the later
  // confirm line for delayed orders). loops.jsonl stays as recorded.
  const fillsFile = join(evDir, "solver", "fills.jsonl");
  const fillReceipt = new Map(existsSync(fillsFile) ? readFileSync(fillsFile, "utf8").trim().split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((r) => r?.fillTx && r.minedSeenAtMs).map((r) => [r.orderId.toLowerCase(), r.minedSeenAtMs]) : []);
  // Solver builds by start time: a run belongs to the build that was live when it started.
  const buildsFile = join(evDir, "solver", "builds.json");
  const builds = existsSync(buildsFile) ? readJson(buildsFile).map((b) => ({ ...b, t: Date.parse(b.from) })).sort((a, b) => a.t - b.t) : [];
  const runTime = (d) => Date.parse(d.replace(/^bench-tier\d-/, "").replace(/T(\d\d)-(\d\d)-(\d\d)-(\d{3})Z$/, "T$1:$2:$3.$4Z"));
  const buildOf = (d) => builds.filter((b) => b.t <= runTime(d)).pop()?.build ?? null;
  const latestBuild = builds.at(-1)?.build ?? null;
  if (existsSync(evDir)) {
    for (const d of readdirSync(evDir).sort()) {
      const sum = join(evDir, d, "summary.json");
      if (d.startsWith("bench-") && existsSync(sum)) {
        const s = readJson(sum);
        const loops = readFileSync(join(evDir, d, "loops.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
        for (const l of loops) {
          const filled = fillReceipt.get(String(l.orderId).toLowerCase());
          if (l.ok && filled !== undefined && l.seenAtMs?.open !== undefined) l.seg.openToFill_ms = filled - l.seenAtMs.open;
        }
        // Which deployment produced this run: the current one (matching escrow) or an earlier one.
        const current = (config.addresses.escrow ?? "").toLowerCase();
        const deployment = s.contracts?.escrow?.toLowerCase() === current ? "current" : "previous";
        runs.push({ run: d, ...s, deployment, solverBuild: buildOf(d), latestSolver: buildOf(d) === latestBuild, loops: loops.map((r) => ({ i: r.i, orderId: r.orderId, ok: r.ok, seg: r.seg, tx: r.tx, settleSeenBy: r.settleSeenBy })) });
      }
      const cases = join(evDir, d, "cases.jsonl");
      if (d.startsWith("negative-") && existsSync(cases)) {
        // Negative runs carry no contract field: date them against the current deployment's go-live time.
        const atFile = join(root, "contracts/deployments", env, "deployed-at.json");
        const at = existsSync(atFile) ? JSON.parse(readFileSync(atFile, "utf8")) : {};
        const stamp = Date.parse(d.slice(9).replace(/T(\d\d)-(\d\d)-(\d\d)-(\d{3})Z$/, "T$1:$2:$3.$4Z"));
        const liveSince = at.current && at[at.current] ? Date.parse(at[at.current]) : NaN;
        const deployment = env === "live" && stamp < liveSince ? "previous" : "current";
        for (const l of readFileSync(cases, "utf8").trim().split("\n").filter(Boolean)) negatives.push({ run: d, deployment, ...JSON.parse(l) });
      }
    }
  }
  // Orders refunded through the protocol (requestRefund, then Reactive's refund callback): `pnpm recover refund`.
  const refundsFile = join(evDir, "recovery", "refunds.jsonl");
  const refunds = existsSync(refundsFile)
    ? readFileSync(refundsFile, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.refundTx)
    : [];
  writeFileSync(join(out, `evidence.${env}.json`), JSON.stringify({ env, runs, negatives, refunds }, null, 2));
  manifest.envs.push({ env, deployed: config.deployed, runs: runs.length, negatives: negatives.length });
}
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("dashboard data:", JSON.stringify(manifest));

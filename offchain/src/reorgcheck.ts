// Reorg check: re-fetches every transaction the live bench recorded (open, fill, settle) and reports any that
// are now missing, sit in a different block than recorded, or now show as failed.
//   SNAP_ENV=live pnpm reorgcheck   → evidence/live/reorg-check.json
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Hex } from "viem";
import { ENV, ROOT, pub, sleep } from "./common.ts";

type Loop = { orderId: string; ok: boolean; tx: Record<string, string | undefined>; blocks: Record<string, string | number | undefined> };
const evDir = join(ROOT, "evidence", ENV);
const items: Array<{ chain: "origin" | "dest"; tx: Hex; block?: bigint; run: string; kind: string }> = [];
for (const d of readdirSync(evDir).sort()) {
  const f = join(evDir, d, "loops.jsonl");
  if (!d.startsWith("bench-") || !existsSync(f)) continue;
  for (const l of readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((x) => JSON.parse(x) as Loop)) {
    for (const [kind, chain] of [["open", "origin"], ["fill", "dest"], ["settle", "origin"]] as const) {
      const tx = l.tx[kind];
      if (tx) items.push({ chain, tx: tx as Hex, block: l.blocks?.[kind] !== undefined ? BigInt(l.blocks[kind]!) : undefined, run: d, kind });
    }
  }
}

let missing = 0, changedBlock = 0, failedNow = 0;
const problems: unknown[] = [];
for (let i = 0; i < items.length; i += 10) {
  await Promise.all(items.slice(i, i + 10).map(async (it) => {
    for (let a = 0; a < 4; a++) {
      try {
        const r = await pub[it.chain].getTransactionReceipt({ hash: it.tx });
        if (it.block !== undefined && r.blockNumber !== it.block) { changedBlock++; problems.push({ ...it, now: r.blockNumber.toString(), block: it.block.toString() }); }
        if (r.status !== "success" && it.kind !== "fill") { failedNow++; problems.push({ ...it, status: r.status, block: it.block?.toString() }); }
        return;
      } catch (e) {
        if (a === 3) { missing++; problems.push({ ...it, error: (e as Error).message.split("\n")[0], block: it.block?.toString() }); }
        await sleep(500 * (a + 1));
      }
    }
  }));
}
const out = { at: new Date().toISOString(), checked: items.length, missing, changedBlock, failedNow, problems };
writeFileSync(join(evDir, "reorg-check.json"), JSON.stringify(out, null, 2));
console.log(`reorg check: ${items.length} transactions; missing ${missing}, moved block ${changedBlock}, failed now ${failedNow}`);
process.exit(0);

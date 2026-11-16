// Live tests against the testnet deployment. The end-to-end test needs a funded Base Sepolia key in
// SNAPSETTLE_TEST_KEY (test USDC; no ETH needed for the user, the submitter pays gas) and skips without it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { buildOrder, gaslessNonce, orderStatus, publicClients, settleDelay, signGaslessOrder, submitSignedOrder, testnet, trackOrder, fuel, type OrderEvent } from "../src/index.ts";

const clients = publicClients();
const someone = "0x000000000000000000000000000000000000dEaD" as const;

test("every deployed contract has code", async () => {
  for (const [k, a] of [["origin", testnet.addresses.originEscrow], ["origin", testnet.addresses.resolver], ["dest", testnet.addresses.destinationSettler], ["lasna", testnet.addresses.reactive]] as const) {
    const code = await clients[k].getCode({ address: a });
    assert.ok(code && code.length > 2, `${a} on ${k}`);
  }
});

test("the gasless nonce computed locally matches the escrow's", async () => {
  const order = buildOrder({ amount: 250_000n, recipient: someone });
  const onChain = await clients.origin.readContract({ address: testnet.addresses.originEscrow, abi: testnet.abi.escrow, functionName: "gaslessNonce", args: [order] });
  assert.equal(onChain, gaslessNonce(order));
});

test("small orders settle on sight, larger ones wait", async () => {
  assert.equal(await settleDelay(250_000n, clients), 0);
  assert.equal(await settleDelay(1_000_000n, clients), 30);
  assert.equal(await settleDelay(5_000_000n, clients), 300);
});

test("fuel reports the reactive contract's balance", async () => {
  const f = await fuel(clients);
  assert.ok(f.lreact >= 0 && Number.isInteger(f.ordersCovered));
});

const key = process.env.SNAPSETTLE_TEST_KEY as Hex | undefined;
test("end to end: sign once, submit, follow it to repayment", { skip: !key, timeout: 240_000 }, async () => {
  const account = privateKeyToAccount(key!);
  const wallet = createWalletClient({ account, chain: baseSepolia, transport: http("https://sepolia.base.org") });
  const order = buildOrder({ amount: 250_000n, recipient: account.address });
  const signed = await signGaslessOrder({ wallet, order, clients });
  const { orderId } = await submitSignedOrder({ wallet, signed, clients });
  const seen: OrderEvent["kind"][] = [];
  const last = await trackOrder({ orderId, clients, onEvent: (e) => seen.push(e.kind), timeoutMs: 200_000 });
  assert.equal(last.kind, "repaid");
  for (const k of ["opened", "filled", "accepted", "repaid"] as const) assert.ok(seen.includes(k), `saw ${k}: ${seen.join(",")}`);
  assert.equal(await orderStatus(orderId, clients), "settled");
});

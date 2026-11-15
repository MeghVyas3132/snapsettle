#!/usr/bin/env bash
# LOCAL HARNESS ONLY: three anvil chains with the real chain IDs and block times
# (Base Sepolia 200 ms, Unichain Sepolia 1 s, Lasna 1 s), the Omni mock system contract at 0x8888…,
# all Snapsettle contracts, and TEST USDC. Uses anvil's well-known dev keys; nothing here touches a real network.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
STATE="$ROOT/.local"; mkdir -p "$STATE"
C="$ROOT/contracts"
# anvil dev accounts 0 (deployer), 1 (user), 2 (solver): public test keys, local only
DEPLOYER_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export LOCAL_USER=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
export LOCAL_SOLVER=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
ORIGIN=http://127.0.0.1:8545 DEST=http://127.0.0.1:8546 LASNA=http://127.0.0.1:8547

"$ROOT/scripts/local-down.sh" >/dev/null 2>&1 || true
anvil --chain-id 84532   --port 8545 --block-time 0.2 --silent > "$STATE/origin.log" 2>&1 & echo $! >  "$STATE/pids"
anvil --chain-id 1301    --port 8546 --block-time 1   --silent > "$STATE/dest.log"   2>&1 & echo $! >> "$STATE/pids"
anvil --chain-id 5318007 --port 8547 --block-time 1   --silent > "$STATE/lasna.log"  2>&1 & echo $! >> "$STATE/pids"
for u in $ORIGIN $DEST $LASNA; do for i in $(seq 1 50); do cast chain-id --rpc-url $u >/dev/null 2>&1 && break; sleep 0.2; done; done

cd "$C"
forge build >/dev/null
MOCK=$(jq -r .deployedBytecode.object out/MockSystem.sol/MockSystem.json)
cast rpc anvil_setCode 0x8888888888888888888888888888888888888888 "$MOCK" --rpc-url $LASNA >/dev/null

rm -f deployments/local/*.json
export DEPLOY_TAG=local RC_FUND=0 ESCROW_FUND=0 LOOP_LATENCY=${LOOP_LATENCY:-10}
run() { forge script "script/$1" --rpc-url "$2" --private-key $DEPLOYER_KEY --broadcast >/dev/null 2>&1 || { echo "failed: $1"; exit 1; }; }
run Deploy.s.sol:DeployDestination $DEST
run Deploy.s.sol:DeployReactive    $LASNA
run Deploy.s.sol:DeployOrigin      $ORIGIN
run Deploy.s.sol:WireReactive      $LASNA
run Deploy.s.sol:DeployResolver    $ORIGIN
run Local.s.sol:LocalToken         $ORIGIN
run Local.s.sol:LocalToken         $DEST
echo "local harness up:"; cat deployments/local/*.json | tr -d '\n'; echo

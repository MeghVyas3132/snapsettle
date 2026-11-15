#!/usr/bin/env bash
# Deploys Snapsettle to the live testnets with the gitignored deployer key (.secrets/deployer.env).
# The key is read from the file and passed to forge; it is never echoed.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
set -a; . "$ROOT/.secrets/deployer.env"; set +a
cd "$ROOT/contracts"
export DEPLOY_TAG=live TIER0_MAX=${TIER0_MAX:-500000} TIER1_MAX=${TIER1_MAX:-2000000} REFUND_GRACE=${REFUND_GRACE:-60}
export RC_FUND=${RC_FUND:-8000000000000000000} ESCROW_FUND=${ESCROW_FUND:-10000000000000000} LOOP_LATENCY=${LOOP_LATENCY:-10}
step() { echo "== $1 on $2"; forge script "script/Deploy.s.sol:$1" --rpc-url "$2" --private-key "$DEPLOYER_PRIVATE_KEY" --broadcast --slow 2>&1 | grep -E "deployed|wired|destinationSettler|snapsettleReactive|originEscrow|snapsettleResolver|Error|error|ONCHAIN EXECUTION COMPLETE" ; }
for s in ${STEPS:-DeployDestination:unichain_sepolia DeployReactive:lasna DeployOrigin:base_sepolia WireReactive:lasna DeployResolver:base_sepolia}; do
  step "${s%%:*}" "${s##*:}"
done
cat deployments/live/*.json

# Snapsettle backend: the solver and the demo/relay service, one image, two containers (deploy/oci/compose.yml).
# Built by .github/workflows/backend.yml for linux/arm64 (the OCI Ampere server) after `forge build`.
FROM node:22-bookworm-slim
WORKDIR /app/offchain
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
COPY offchain/package.json offchain/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile && pnpm store prune
COPY offchain/src ./src
COPY offchain/tsconfig.json ./
# Only what the bots read at runtime: deployed addresses and the ABIs of the contracts they call.
COPY contracts/deployments/live /app/contracts/deployments/live
COPY contracts/out/OriginEscrow.sol /app/contracts/out/OriginEscrow.sol
COPY contracts/out/DestinationSettler.sol /app/contracts/out/DestinationSettler.sol
COPY contracts/out/SnapsettleReactive.sol /app/contracts/out/SnapsettleReactive.sol
COPY contracts/out/SnapsettleResolver.sol /app/contracts/out/SnapsettleResolver.sol
COPY contracts/out/IERC20.sol /app/contracts/out/IERC20.sol
COPY contracts/out/IERC7683.sol /app/contracts/out/IERC7683.sol
RUN mkdir -p /app/evidence && chown -R node:node /app/evidence
USER node
ENV SNAP_ENV=live NODE_ENV=production
# Node runs the TypeScript directly through tsx's loader: one process per container, no wrapper.
CMD ["node", "--import", "tsx", "src/solver.ts"]

#!/usr/bin/env bash
# Pull-based deploy: run by cron every 2 minutes. Restarts the Snapsettle containers only when GitHub Actions has
# published a new image; otherwise does nothing. Never touches other services.
set -euo pipefail
cd /srv/snapsettle
before=$(docker image inspect --format '{{.Id}}' ghcr.io/meghvyas3132/snapsettle-backend:latest 2>/dev/null || true)
docker compose pull --quiet
after=$(docker image inspect --format '{{.Id}}' ghcr.io/meghvyas3132/snapsettle-backend:latest)
if [ "$before" != "$after" ]; then
  echo "$(date -u +%FT%TZ) new image ${after:7:12}, restarting snapsettle" >> /srv/snapsettle/deploy.log
  docker compose up -d --remove-orphans
  docker image prune -f --filter "label=org.opencontainers.image.source=https://github.com/MeghVyas3132/snapsettle" >/dev/null
fi

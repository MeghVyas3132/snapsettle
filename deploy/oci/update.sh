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
# Self-healing: Docker restarts a container that exits, not one that is alive but stuck. A container whose health
# check has failed three times in a row (about 90 s) is restarted here, at most every 2 minutes.
for c in snapsettle-solver-1 snapsettle-demo-1; do
  if [ "$(docker inspect -f '{{.State.Health.Status}}' "$c" 2>/dev/null)" = "unhealthy" ]; then
    echo "$(date -u +%FT%TZ) $c unhealthy, restarting" >> /srv/snapsettle/deploy.log
    docker restart "$c" >/dev/null
  fi
done


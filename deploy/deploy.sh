#!/usr/bin/env bash
#
# Pull the latest code, rebuild, and restart Futa.
# Run as root on the droplet:
#
#   bash /opt/futa/deploy/deploy.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/futa}"
APP_USER="${APP_USER:-futa}"
SERVICE="${SERVICE:-futa}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must run as root (sudo -i)." >&2
  exit 1
fi

cd "${APP_DIR}"

echo "==> Fetching latest code"
sudo -u "${APP_USER}" git pull --ff-only

echo "==> Installing dependencies"
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}' && npm ci"

echo "==> Building the client"
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}' && NODE_OPTIONS=--max-old-space-size=768 npm run build"

echo "==> Pruning build-only dependencies"
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}' && npm prune --omit=dev"

echo "==> Restarting ${SERVICE}"
systemctl restart "${SERVICE}"
sleep 2
systemctl --no-pager --lines=20 status "${SERVICE}" || true

echo
echo "Health: $(curl -fsS http://127.0.0.1:4000/api/health || echo 'FAILED — check journalctl -u futa')"

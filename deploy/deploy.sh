#!/usr/bin/env bash
#
# Sync to origin/main, rebuild, and restart Futa.
# Run as root on the droplet:
#
#   bash /opt/futa/deploy/deploy.sh
#
# The checkout is hard-reset to origin/main so accidental server-side edits
# (e.g. a drifted lockfile) can never block a deploy. Untracked files such as
# /opt/futa/.env are preserved.
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

echo "==> Syncing to origin/main"
sudo -u "${APP_USER}" git fetch --prune origin main
sudo -u "${APP_USER}" git reset --hard origin/main

echo "==> Installing dependencies"
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}' && npm ci"

echo "==> Building the client"
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}' && NODE_OPTIONS=--max-old-space-size=768 npm run build"

echo "==> Pruning build-only dependencies"
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}' && npm prune --omit=dev"

echo "==> Restarting ${SERVICE}"
systemctl restart "${SERVICE}"

echo "==> Waiting for the API to become healthy"
healthy=0
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 1
done

systemctl --no-pager --lines=15 status "${SERVICE}" || true

if [[ "${healthy}" -eq 1 ]]; then
  echo "Health: $(curl -fsS http://127.0.0.1:4000/api/health)"
else
  echo "Health: FAILED after 30s — check 'journalctl -u ${SERVICE} -n 50'" >&2
  exit 1
fi

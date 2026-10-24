#!/usr/bin/env bash
#
# First-time provisioning for the Futa monolith on Ubuntu 24.04.
# Run as root on the droplet:
#
#   git clone https://github.com/kgathuai/futa.git /opt/futa
#   bash /opt/futa/deploy/setup-server.sh
#
# Optional local MongoDB instead of Atlas:
#   WITH_MONGO=1 bash /opt/futa/deploy/setup-server.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/futa}"
APP_USER="${APP_USER:-futa}"
REPO_URL="${REPO_URL:-https://github.com/kgathuai/futa.git}"
NODE_MAJOR="${NODE_MAJOR:-22}"
WITH_MONGO="${WITH_MONGO:-0}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must run as root (sudo -i)." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
APT_OPTS=(-y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)

echo "==> Applying OS updates"
apt-get update "${APT_OPTS[@]}"
apt-get upgrade "${APT_OPTS[@]}"

echo "==> Ensuring 2 GB swap (helps npm/Vite builds on a 1 GB droplet)"
if ! swapon --show | grep -q .; then
  if ! fallocate -l 2G /swapfile 2>/dev/null; then
    dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  fi
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "    Swap enabled."
else
  echo "    Swap already present; skipping."
fi

echo "==> Installing base packages"
apt-get install "${APT_OPTS[@]}" curl ca-certificates gnupg git ufw nginx

echo "==> Installing Node.js ${NODE_MAJOR}.x"
CURRENT_NODE_MAJOR="$(command -v node >/dev/null 2>&1 && node -p 'process.versions.node.split(".")[0]' || echo 0)"
if [[ "${CURRENT_NODE_MAJOR}" -lt "${NODE_MAJOR}" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install "${APT_OPTS[@]}" nodejs
fi
echo "    node $(node -v), npm $(npm -v)"

echo "==> Creating service user ${APP_USER}"
if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --home-dir "${APP_DIR}" --shell /usr/sbin/nologin --no-create-home "${APP_USER}"
fi

echo "==> Ensuring repository checkout"
mkdir -p "${APP_DIR}"
chown "${APP_USER}:${APP_USER}" "${APP_DIR}"
if [[ -d "${APP_DIR}/.git" ]]; then
  echo "    Existing checkout found; leaving it in place."
elif [[ -n "$(ls -A "${APP_DIR}" 2>/dev/null)" ]]; then
  echo "ERROR: ${APP_DIR} exists and is not a git checkout. Move it aside and re-run." >&2
  exit 1
else
  sudo -u "${APP_USER}" git clone "${REPO_URL}" "${APP_DIR}"
fi
mkdir -p "${APP_DIR}/.cache"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

echo "==> Creating ${APP_DIR}/.env"
if [[ ! -f "${APP_DIR}/.env" ]]; then
  install -m 600 -o "${APP_USER}" -g "${APP_USER}" \
    "${APP_DIR}/deploy/.env.production.example" "${APP_DIR}/.env"
  echo "    Wrote .env from the example."
fi
chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"
chmod 600 "${APP_DIR}/.env"

if [[ "${WITH_MONGO}" == "1" ]]; then
  echo "==> Installing MongoDB 8.0 locally"
  curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc \
    | gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" \
    > /etc/apt/sources.list.d/mongodb-org-8.0.list
  apt-get update "${APT_OPTS[@]}"
  apt-get install "${APT_OPTS[@]}" mongodb-org
  if grep -q '^ *bindIp:' /etc/mongod.conf; then
    sed -i 's/^ *bindIp:.*/  bindIp: 127.0.0.1/' /etc/mongod.conf
  fi
  systemctl enable --now mongod
  sed -i 's|^MONGODB_URI=.*|MONGODB_URI=mongodb://127.0.0.1:27017/futa_monolith|' "${APP_DIR}/.env"
  echo "    MongoDB listening on 127.0.0.1:27017."
fi

echo "==> Installing dependencies"
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}' && npm ci"

echo "==> Building the client"
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}' && NODE_OPTIONS=--max-old-space-size=768 npm run build"

echo "==> Pruning build-only dependencies"
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}' && npm prune --omit=dev"

echo "==> Installing systemd unit"
install -m 644 "${APP_DIR}/deploy/systemd/futa.service" /etc/systemd/system/futa.service
systemctl daemon-reload
systemctl enable futa

echo "==> Installing nginx site"
install -m 644 "${APP_DIR}/deploy/nginx/futa.conf" /etc/nginx/sites-available/futa.conf
ln -sf /etc/nginx/sites-available/futa.conf /etc/nginx/sites-enabled/futa.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Configuring firewall (SSH + HTTP/HTTPS)"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

if grep -q 'USER:PASSWORD' "${APP_DIR}/.env"; then
  echo
  echo "!! MONGODB_URI is still the placeholder."
  echo "   1. Edit ${APP_DIR}/.env and set MONGODB_URI (Atlas or local)."
  echo "   2. systemctl restart futa"
else
  echo "==> Starting Futa"
  systemctl restart futa
  sleep 2
  systemctl --no-pager --lines=20 status futa || true
fi

echo
echo "Health check: curl -s http://127.0.0.1:4000/api/health"
echo "Logs:         journalctl -u futa -f"

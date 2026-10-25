# Deploying Futa to DigitalOcean

Target: Ubuntu 24.04 droplet, `147.182.176.53`, 1 vCPU / 1 GB RAM.

Architecture on the server:

```
browser ──► nginx :80/:443
              ├── /            → static files from /opt/futa/dist
              └── /api/*       → Express (tsx server/index.ts) on 127.0.0.1:4000
                                      └── MongoDB (Atlas, or local mongod on 127.0.0.1:27017)
```

The Express process is managed by systemd and runs as the unprivileged `futa` user.

---

## 0. Before you deploy

The server installs **from GitHub**, so your local changes must be pushed first:

```bash
cd /Users/eknjoroge/Desktop/projects/Futa
git add -A
git commit -m "Optimize backend/frontend + add deployment files"
git push origin main
```

Two repo fixes were applied to make this deployable:

- **`.env` is no longer tracked** (it is now gitignored). If you have ever committed real
  credentials, rotate them. Local development still uses your existing `.env` file.
- **`tsx` moved to `dependencies`**, because `npm start` needs it at runtime and we prune
  build-only packages on the server.

> The droplet banner says a restart is required. Reboot it before starting:
> `ssh root@147.182.176.53 'apt-get update && apt-get -y upgrade && reboot'`

---

## 1. Choose a database

### Option A — MongoDB Atlas (recommended for 1 GB RAM)

1. Create a free **M0** cluster.
2. Create a database user.
3. **Network Access → Add IP Address →** `147.182.176.53/32`.
4. Copy the connection string:
   `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/futa_monolith?retryWrites=true&w=majority`
   (URL-encode special characters in the password.)

You will paste it into `/opt/futa/.env` in step 3.

### Option B — MongoDB on the droplet

Run the setup script with `WITH_MONGO=1` (step 2). It installs MongoDB 8.0, binds it to
`127.0.0.1`, and points `.env` at `mongodb://127.0.0.1:27017/futa_monolith`.

This uses roughly 250–400 MB of RAM; the script adds 2 GB of swap to keep the build safe.

---

## 2. Provision the droplet

The setup script lives in the repo, so clone once, then run it:

```bash
ssh root@147.182.176.53

apt-get update && apt-get install -y git
git clone https://github.com/kgathuai/futa.git /opt/futa

# Atlas (Option A):
bash /opt/futa/deploy/setup-server.sh

# ...or local MongoDB (Option B):
WITH_MONGO=1 bash /opt/futa/deploy/setup-server.sh
```

What the script does:

- OS updates, 2 GB swap (needed for `npm`/Vite builds on 1 GB RAM)
- Node.js 22 LTS, nginx, ufw
- creates the `futa` user and `/opt/futa`
- writes `/opt/futa/.env` (mode `600`)
- `npm ci` → `npm run build` → `npm prune --omit=dev`
- installs and enables `futa.service` and the nginx site
- opens SSH + HTTP/HTTPS in ufw

If the repo is private, clone with a deploy key or a GitHub token first, then run the
script (it detects the existing checkout at `/opt/futa`).

---

## 3. Configure the environment

```bash
nano /opt/futa/.env
```

```dotenv
# NODE_ENV is provided by futa.service — do not put it in .env
PORT=4000
HOST=127.0.0.1
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/futa_monolith?retryWrites=true&w=majority
# CORS_ORIGIN=https://futa.example.com   # optional; same-origin needs nothing
```

```bash
chown futa:futa /opt/futa/.env
chmod 600 /opt/futa/.env
systemctl restart futa
```

> Keep `PORT=4000` on the server — the nginx config proxies to `127.0.0.1:4000`.
> (Your local `.env` uses `PORT=4100`; do not copy it to the droplet as-is.)

> The setup script skips starting the service while `MONGODB_URI` still contains the
> `USER:PASSWORD` placeholder, so you cannot accidentally run against a dummy URI.

---

## 4. Verify

```bash
curl -s http://127.0.0.1:4000/api/health      # {"status":"ok",...}
curl -s http://147.182.176.53/api/health      # through nginx
systemctl status futa
journalctl -u futa -f
```

Open <http://147.182.176.53/>.

---

## 5. Domain + HTTPS (do this for the installable PWA)

Service workers require a **secure context**, so the PWA only installs over HTTPS
(or localhost). Plain HTTP on the IP works for browsing, but not installability.

```bash
# Point an A record (e.g. futa.example.com) at 147.182.176.53, then:
sed -i 's/server_name _;/server_name futa.example.com;/' /etc/nginx/sites-available/futa.conf
nginx -t && systemctl reload nginx

apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d futa.example.com --redirect -m you@example.com --agree-tos -n
```

After certbot, `/etc/nginx/sites-available/futa.conf` is managed by certbot — **do not
overwrite it** with the copy in the repo. Optionally set `CORS_ORIGIN=https://futa.example.com`
in `.env` and restart.

---

## 6. Updating the app

```bash
ssh root@147.182.176.53
bash /opt/futa/deploy/deploy.sh
```

It syncs the checkout to `origin/main` (discarding accidental server-side edits, while
preserving the untracked `.env`), then runs `npm ci`, builds, prunes dev dependencies, and
restarts the service. The health check is printed at the end.

> `deploy.sh` intentionally does **not** overwrite nginx or systemd configs — after
> certbot those files contain server-specific changes. Update them by hand if needed.

### Low-memory fallback (build locally, ship `dist/`)

If the build is ever OOM-killed on the droplet, build on your machine instead:

```bash
# from the repo root on your Mac
npm ci && npm run build

rsync -az --delete dist/ root@147.182.176.53:/opt/futa/dist/
rsync -az server/ src/ package.json package-lock.json root@147.182.176.53:/opt/futa/
ssh root@147.182.176.53 '
  chown -R futa:futa /opt/futa/dist &&
  cd /opt/futa && sudo -u futa npm ci &&
  sudo -u futa npm prune --omit=dev &&
  systemctl restart futa'
```

---

## 7. Operations

| Task | Command |
| --- | --- |
| Service status | `systemctl status futa` |
| Live logs | `journalctl -u futa -f` |
| Restart | `systemctl restart futa` |
| nginx config test | `nginx -t` |
| nginx logs | `journalctl -u nginx` / `/var/log/nginx/` |
| Listening ports | `ss -ltnp` |
| Health | `curl -s http://127.0.0.1:4000/api/health` |

### Backups (local MongoDB only)

```bash
mkdir -p /var/backups/futa
mongodump --db futa_monolith --out "/var/backups/futa/$(date +%F)"
```

Add a daily cron entry or systemd timer, and copy backups off the droplet.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `502 Bad Gateway` | Express not running | `journalctl -u futa -e` |
| `Failed to start monolith backend` | bad/absent `MONGODB_URI` | fix `.env`, `systemctl restart futa` |
| Login says "account not found" | fresh DB | register an account |
| Stale UI after deploy | service worker cache | hard reload, or bump the app version |
| `npm ci` fails with lock mismatch | stale `package-lock.json` | run `npm install --package-lock-only` locally, commit, redeploy |
| Build killed | out of memory | confirm swap (`swapon --show`) or use the fallback above |

Quick checks:

```bash
ss -ltnp | grep -E ':(80|443|4000|27017)'
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4000/api/health
ufw status
```

---

## 9. Security checklist

- [ ] `.env` is untracked, `chmod 600`, owned by `futa`
- [ ] MongoDB is bound to `127.0.0.1` **or** Atlas allowlists only the droplet IP
- [ ] ufw active, only 22/80/443 open (`ufw status`)
- [ ] HTTPS enabled with auto-renewal (`systemctl list-timers | grep certbot`)
- [ ] SSH key login; consider disabling password auth and `PermitRootLogin`
- [ ] `npm audit --omit=dev` reports 0 vulnerabilities (dev/build-only advisories reviewed separately)
- [ ] Any credential ever committed to the repo has been rotated

Useful hardening commands:

```bash
# create a sudo user and disable root password login
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh
```

---

## 10. Files in this directory

| File | Purpose |
| --- | --- |
| `setup-server.sh` | one-time root provisioning on Ubuntu 24.04 |
| `deploy.sh` | pull + rebuild + restart on updates |
| `systemd/futa.service` | systemd unit (runs as `futa`, port 4000) |
| `nginx/futa.conf` | static hosting, `/api` proxy, cache + rate-limit rules |
| `.env.production.example` | production env template |

---

## 11. Roles & moderation

Self-registration only allows the public roles: `TM`, `Coach`, `captain`, `player`,
`Referee`, `Fan`. `admin` and `superadmin` can never be self-assigned. Referees register
without a team — the Team field is hidden and their account has an empty team.

| Role | Can do |
| --- | --- |
| public roles | existing create/manage permissions for their own team |
| `admin` | delete any match or tournament fixture from the match feed (no Admin console) |
| `superadmin` | everything an admin can, plus the Admin console, role changes, and deleting admin accounts |

The **Admin** console and nav item are visible to `superadmin` only. Admins moderate matches
from the home feed; they cannot open the account list or change roles.

Deleting an account removes the login and its sessions; the person's team, matches, and
history are kept. Superadmins cannot delete themselves or another superadmin from the app.

### Bootstrap the first superadmin

Register your account in the app first, then on the server:

```bash
cd /opt/futa
sudo -u futa npm run make-superadmin -- you@example.com
```

Refresh the app — an **Admin** item appears in the navigation. From there you can promote
accounts to `admin`, delete admin accounts, and delete matches.

To promote straight to `admin` instead of `superadmin`:

```bash
sudo -u futa npm run make-superadmin -- someone@example.com admin
```

`superadmin` is intentionally CLI-only: it cannot be granted or removed from the web UI.


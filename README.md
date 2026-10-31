# Futa — Grassroots Football Platform

Futa (Kambumbu) is a progressive web app for running community football: team
profiles and squads, friendly-match bookings with referees, tournaments with
fixtures and live tables, results, statistics, and match-day engagement.
It ships as an installable PWA backed by a single Express + MongoDB service.

- **Production:** https://kambumbu.com
- **Stack:** React 19 · TypeScript · Vite 8 · MUI 9 · Express 5 · Mongoose 9 · MongoDB
- **Repo:** https://github.com/kgathuai/futa

---

## 1. Feature overview

### Match day
- Announce fixtures (league, cup, friendly) with venue, kickoff and duration.
- Runtime status derived from the clock: **Scheduled → Playing → Played**
  (`src/lib/matchStatus.ts`), refreshed every 30 s without a reload.
- Score reporting restricted to the two participating teams' management accounts
  (plus admins); goal scorers and assists are recorded per team.
- **Live match events**: goals, yellow/red cards and substitutions with minute.
- Venue clash guard: a new fixture is rejected if the ground already hosts a
  match within ±2 hours.
- **Reschedule requests**: either team proposes a new kickoff, the other accepts
  or declines; acceptance moves the fixture.
- Likes, comments, threaded replies, ratings and a per-match engagement panel.

### Teams
- Public team directory with search, county/level filters and pagination.
- Team profile (name, manager, county, home ground, level, bio, crest).
- **Squad management** (name, jersey number, position) feeding scorer/assist
  pickers.
- Managed by the team's own TM / Coach / captain (admins and superadmins can act
  on any team).
- **Follow** any team; followed teams' next fixtures appear in the account panel.
- Public **player profiles** with goals, assists and recent contributions.

### Friendlies
- Request a friendly against a registered team: ground, date, time, referee, note.
- Referees are chosen from the registered referee directory.
- Accept / decline as the receiving team; the referee independently accepts or
  declines the appointment.
- Referees can submit a **match report** (score + notes) which publishes a result.

### Tournaments
- **Open** tournaments: self-registration up to a team limit.
- **Closed** tournaments: the organiser defines the roster (locked once fixtures exist).
- Optional **entry fee (KES)** — registration is blocked until the fee is paid.
- Round-based fixture generation, league standings (points, GD, goals for),
  real **Last-5 form**, tournament **MVP** (goals ×3 + assists ×2) and
  **match efficiency** (completed ÷ scheduled fixtures).
- Champion + runner-up per season on the **Season archive** page.

### Accounts & roles
| Role | Can do |
|---|---|
| `fan` | Browse everything, like/comment/rate, follow teams, report content |
| `player` | Fan abilities + personal profile |
| `referee` | Accept/decline bookings, submit match reports, view their fixtures |
| `captain`, `coach`, `tm` | Everything a fan can + create/edit their team, squad, matches, results, tournaments, register teams, pay fees |
| `admin` | Team-management abilities on any team + delete matches |
| `superadmin` | Everything + admin console: create accounts, change roles, delete accounts, audit log, content reports, CSV exports |

- Registration is public for fan/player/referee/tm/coach/captain (never admin).
- Sessions expire after **2 hours** (configurable) and are stored server-side with
  a TTL index; a `401` from any call clears the client session.
- **Password reset** and **email verification** are token based (single use, TTL).

### Platform
- Notifications for friendly requests, referee decisions, score reminders,
  comment replies and score reports (bell drawer + account panel).
- Global notification toast (full width, top, 5 s) and luminous-green
  `LinearProgress` loading bars everywhere.
- **Dark / light theme** toggle and **English / Swahili** toggle.
- PWA: installable, offline shell via Workbox service worker.
- Share buttons (native share / WhatsApp / X / copy link) on results and
  tournaments; tournament deep links (`/tournaments?tournament=<id>`).

---

## 2. Architecture

```
Browser (React SPA, PWA)
   │  fetch JSON  (Bearer token in Authorization header)
   ▼
nginx  ──HTTPS──►  Express 5 monolith (127.0.0.1:4000)
                        │
                        └──► MongoDB (Atlas or local)
```

- **Single service**: the Express app serves `/api/*` and, in production, the
  built SPA from `dist/` with an index.html fallback for client routes.
- **Auth**: opaque session tokens (`crypto.randomBytes`), passwords hashed with
  `scrypt`, bearer tokens in `localStorage` (`futa_auth_token`).
- **Client state**: a small React context (`src/context/AppContext.tsx`) for
  matches/results/friendlies plus per-page local state; no Redux.
- **Types** are kept in sync by hand between `server/store.ts` and `src/types.ts`.

### Project layout

```
server/
  index.ts            Express app, routes, startup, score-reminder job
  store.ts            Mongoose schemas, models and all data access
  email.ts            HTTP email sender (Resend-compatible)
  mpesa.ts            Safaricom Daraja STK-push client
  make-superadmin.ts  CLI to promote an account
src/
  main.tsx            Providers: theme mode, i18n, router, app context
  App.tsx             Route table
  pages/              HomePage, FriendliesPage, TeamPage, TeamDashboardPage,
                      TournamentsPage, ResultsPage, AdminPage, ArchivePage,
                      PlayerPage, AccountTokenPage, ChatPage, DashboardPage
  components/         Layout (shell, drawers, nav), LoadingBar, TopToast,
                      ShareButtons, FixturesTab, MatchEngagementPanel
  lib/                api.ts (typed client), matchStatus, teamStats, avatar,
                      share, i18n, kenyaCounties, useAutoHide, useMatchClock
  theme/              buildTheme(mode) + ColorModeProvider
  types.ts            Domain types
deploy/               setup-server.sh, deploy.sh, nginx/, systemd/, README.md
```

---

## 3. Data model (MongoDB collections)

| Collection | Purpose / key fields |
|---|---|
| `accounts` | name, email (unique), password (scrypt), role, sport, team, county, homeGround, avatar, emailVerified |
| `sessions` | token (unique), accountId, expiresAt (TTL index) |
| `authTokens` | token, accountId, type (`reset`/`verify`), expiresAt (TTL), usedAt |
| `matches` | id, home/away team, venue, kickoff, duration, scores, status, goals[], events[], comments[], tournamentId, round, engagement counters, scoreReminderSentAt |
| `results` | home/away, scores, venue, playedOn, reportedBy, engagement |
| `tournaments` | id, sport, format, name, period, dates, venue, status, type (`open`/`closed`), ownerTeam, registeredTeams[], maxTeams, entryFee |
| `teams` | name, manager, county, homeGround, level, bio, logoUrl, ownerAccountId |
| `players` | id, team, name, number, position |
| `friendlies` | requester/recipient accounts and teams, contact, date/time, location, note, referee + refereeAccountId, refereeStatus, report, status |
| `follows` | accountId + team (unique pair) |
| `payments` | tournamentId, team, accountId, amount, phone, status (`pending`/`paid`/`failed`), reference, receipt |
| `reschedules` | matchId, requestedBy, currentKickoff, newKickoff, reason, status |
| `notifications` | accountId, type, title, message, related ids, read, createdAt |
| `auditLogs` | actor, action, targetType/targetId, detail, createdAt |
| `contentReports` | reporter, matchId/commentId, reason, status |

---

## 4. API reference

All endpoints are JSON. Authenticated endpoints require
`Authorization: Bearer <token>`; roles are enforced server-side.

**Health & auth**
```
GET    /api/health                        200 ok / 503 degraded (DB down)
POST   /api/auth/register                 201 { token, user }
POST   /api/auth/login                    200 { token, user }
POST   /api/auth/logout                   204
GET    /api/auth/me                       200 { user }
PATCH  /api/auth/me                       update team/county/homeGround/avatar
POST   /api/auth/forgot-password          generic response, emails reset link
POST   /api/auth/reset-password           { token, password }
POST   /api/auth/verify-email             { token }
POST   /api/auth/resend-verification      resend verification (auth)
```

**Teams, squads, follows**
```
GET    /api/team | POST /api/team         my team profile / upsert
GET    /api/teams | /api/grounds | /api/referees
GET    /api/squad?team=…                  public squad
POST   /api/squad                         add player (team management)
PATCH  /api/squad/:playerId | DELETE /api/squad/:playerId
GET    /api/follows | POST /api/follows | DELETE /api/follows/:team
```

**Matches**
```
GET    /api/matches | /api/matches/my
POST   /api/matches                       create (venue clash → 409)
PATCH  /api/matches/:id/score             participating teams only
PATCH  /api/matches/:id/kickoff | DELETE /api/matches/:id
POST   /api/matches/:id/like | /rate | /comment
POST   /api/matches/:id/comments/:commentId/like | /reply
POST   /api/matches/:id/events | DELETE /api/matches/:id/events/:eventId
POST   /api/matches/:id/reschedule | GET /api/matches/:id/reschedule
POST   /api/reschedules/:requestId/respond  { accept: boolean }
```

**Results, friendlies, referees**
```
GET    /api/results | POST /api/results
GET    /api/friendlies | POST /api/friendlies
POST   /api/friendlies/:requestId/accept | /decline | PATCH …/status
GET    /api/referee/bookings
POST   /api/referee/bookings/:requestId/respond  { status }
POST   /api/referee/bookings/:requestId/report   { homeScore, awayScore, notes }
```

**Tournaments & payments**
```
GET    /api/tournaments | POST /api/tournaments
POST   /api/tournaments/:id/register      402 until the entry fee is paid
PATCH  /api/tournaments/:id/teams          owner-only roster (closed events)
GET    /api/tournaments/:id/fixtures | POST …/generate-fixtures
GET    /api/tournaments/:id/payments      ledger (organiser/admin sees all)
POST   /api/tournaments/:id/payments      create payment / STK push
POST   /api/payments/:paymentId/confirm   organiser/admin marks paid
POST   /api/payments/mpesa/callback       Safaricom callback
```

**Notifications, moderation, admin**
```
GET    /api/notifications | POST /api/notifications/:id/read
POST   /api/reports                       flag content (any signed-in user)
GET    /api/admin/accounts | POST /api/admin/accounts
PATCH  /api/admin/accounts/:id/role | DELETE /api/admin/accounts/:id
GET    /api/admin/audit | GET /api/admin/reports
POST   /api/admin/reports/:id/resolve
GET    /api/admin/export/:kind.csv        accounts | matches | results | payments
```

Cross-cutting: in-memory rate limiting (600 req/min/IP globally, tighter buckets
on auth, payments, referee and report writes) and a fast `503` on DB-backed
routes while MongoDB is unreachable.

---

## 5. Environment variables

**Server** (`.env`, never committed)

| Variable | Required | Notes |
|---|---|---|
| `PORT` | dev | API port, default `4000`; the Vite proxy follows it |
| `MONGODB_URI` | yes | `mongodb+srv://…` (Atlas) or `mongodb://127.0.0.1:27017/futa_monolith` |
| `HOST` | prod | `127.0.0.1` so the API is only reachable through nginx |
| `CORS_ORIGIN` | optional | comma-separated allowed origins |
| `SESSION_TTL_MINUTES` | optional | default `120` |
| `APP_URL` | for emails | base URL used in reset/verify links |
| `EMAIL_API_URL`, `EMAIL_API_KEY`, `EMAIL_FROM` | optional | Resend-compatible HTTP email; without them links are logged to the server console |
| `MPESA_ENV`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL` | optional | Daraja STK push; without them payments are recorded `pending` and confirmed manually |

**Client** (`.env`)

| Variable | Notes |
|---|---|
| `VITE_API_PROXY_TARGET` | dev proxy target, defaults to `http://localhost:$PORT` |
| `VITE_API_BASE_URL` | set only when the API lives on another origin |

---

## 6. Local development

```bash
git clone https://github.com/kgathuai/futa.git && cd Futa
npm install
cp .env.example .env          # then set MONGODB_URI and PORT
npm run dev                   # API on :PORT and Vite on :5173
```

- `npm run dev:server` — `tsx watch server/index.ts`
- `npm run dev:client` — Vite with `/api` proxied to the API
- `npm run build` — typecheck (`tsc -b`) then production bundle
- `npm run start` — production server (`NODE_ENV=production tsx server/index.ts`)
- `npm run lint` — oxlint
- `npm run make-superadmin -- <email> [admin|superadmin]` — promote an account

If MongoDB is unreachable the API still starts and reports
`503 {"status":"degraded","db":"unavailable"}` with a message pointing at the
Atlas allow-list, instead of the dev proxy failing with `ECONNREFUSED`.

---

## 7. Deployment

Target: Ubuntu 24.04 droplet, nginx + systemd + certbot. Full runbook lives in
[`deploy/README.md`](deploy/README.md); the short version:

```bash
# on the server
sudo -u futa git -C /opt/futa fetch --prune origin main
sudo -u futa git -C /opt/futa reset --hard origin/main
bash /opt/futa/deploy/deploy.sh
```

`deploy/deploy.sh` installs dependencies, builds the client and server, prunes dev
dependencies, restarts `futa.service`, and polls `/api/health` until it is healthy.

---

## 8. Verification

There is no automated test suite; changes are verified with:

```bash
npx tsc -b                     # client typecheck (server: tsc -p tsconfig.server.json)
npm run lint                   # oxlint, 0 errors expected
npm run build                  # production bundle
PORT=4123 npx tsx server/index.ts & curl -s localhost:4123/api/health
```

plus endpoint smoke tests against a running server and a manual click-through of
the UI (auth flows, team → squad → match → score, referee booking, tournament
registration with payment, light/dark and EN/SW toggles).

---

## 9. Known limitations / next steps

- No automated test suite or CI pipeline yet.
- Email and M-Pesa integrations need real credentials; both degrade to a safe
  offline mode (logged links / manual payment confirmation).
- Light mode covers the shell and the page surfaces migrated to theme tokens; a
  few bespoke panels may still use dark-tuned colours.
- The Swahili dictionary covers navigation and the account shell, not page bodies.
- Live match events are appended by team management rather than streamed to
  spectators in real time.

# CUJ CyberOps CTF 2026 — Central University of Jammu

A full-stack Capture The Flag (CTF) competition platform built for **Central University of Jammu** student competitions, supporting multi-player squads, dynamic decay scoring, First Blood bonuses, real-time SSE updates, 19 solvable multi-category challenges, 6 hosted interactive labs, and an organizer admin console.

## Tracks & Challenges (19 Challenges / 8 Categories)

| Category | Challenges | Highlights |
| --- | --- | --- |
| **Crypto** | 3 | Repeating-key XOR crib drag, Shared-prime RSA (`gcd`), 24-bit LCG state recovery |
| **Stego** | 3 | PNG trailing post-`IEND` payload, RGB Blue-channel LSB, 16-bit PCM WAV LSB |
| **OSINT** | 2 | JPEG EXIF telemetry coordinates/token, `.git` commit history secret recovery |
| **Web** | 3 | **Live targets**: Cookie tamper + `robots.txt`, SQLite `UNION` SQLi, weak HS256 JWT forgery |
| **Rev** | 2 | Bitwise license validator, custom register-based bytecode VM |
| **Pwn** | 2 | **Live interactive terminals**: Stack struct buffer overflow (`0x43554a21`), format string leak |
| **Forensics** | 2 | Wireshark `.pcap` HTTP exfil reassembly, corrupted PNG magic-byte repair |
| **Misc** | 2 | **Live 15s SHA-256 Proof-of-Work gauntlet**, 5-layer Matryoshka encoding |

## Platform Features

- **Multi-Player Squads**: Form teams (up to 4 members by default), generate/rotate invite codes (`CUJ-XXXX-YYYY`), track member contributions, and share hints & solves across the team.
- **Dynamic Decay Scoring**: Parabolic point decay from `initial_points` to `min_points`, permanent First Blood bonuses, tie-breaking by earliest last solve, and scoreboard freeze mode.
- **Real-Time Telemetry (SSE)**: Live capture feed, First Blood toasts, and organizer broadcast alerts.
- **Hacker Workbench UI**: Split-pane challenge modal with downloadable SHA-256 verified artifacts, interactive Pwn terminal, PoW runner, Command Palette (`/` or `Ctrl+K`), and a built-in browser **Decoder Toolkit** (Base64, Hex, Little-Endian Stack Hex, ROT13, XOR, SHA-256).
- **Organizer Admin Console**: Manage competition status, freeze scoreboard, unlock writeups, author/toggle challenges, moderate teams, inspect flag submission audit logs, and export CTFTime JSON.

## Local Quickstart

```bash
# 1. Install backend & frontend dependencies
npm install
npm --prefix client install

# 2. (Optional) Regenerate & verify all offline challenge artifacts (requires Python 3.12+ with pillow & cryptography)
npm run seed:artifacts

# 3. Build React production bundle
npm run build:client

# 4. Start platform on http://localhost:3000
npm start
```

For concurrent development (`Vite` on `:5173` + `Express` on `:3000`):
```bash
npm run dev
```

## Verification & Testing

```bash
# Typecheck server and client
npm run typecheck

# Verify all 13 offline challenge artifacts solve cleanly
python server/scripts/verify_solvers.py

# Run full E2E integration tests against running server on :3000
npx tsx server/scripts/e2e_test.ts
```

## Demo Accounts (Seeded Automatically)

| Role | Email | Password |
| --- | --- | --- |
| **Team Captain (`Shivalik Rootkits`)** | `aarav.cse@cujammu.ac.in` | `Student@CUJ2026` |
| **Solo Student (Test Join/Create)** | `kabir.mca@cujammu.ac.in` | `Student@CUJ2026` |
| **Competition Organizer (Admin)** | `admin@cujammu.ac.in` | `Admin@CUJ2026` |

## Cloud Deployment (Vercel / Docker / Render)

### Option 1: Vercel (Serverless + Turso SQLite)
This repository is pre-configured for Vercel via `vercel.json`, `api/index.ts`, and `"engines": { "node": "24.x" }`:

1. Import **https://github.com/mildfriend3-blip/cuj-ctf-arena** in [Vercel](https://vercel.com/new) — `vercel.json` automatically installs root + client packages, builds Vite into `client/dist`, bundles `server/artifacts/**` into `api/index.ts`, and routes `/api/*` and `/ctf-labs/*` to Express.
2. Add environment variables in Vercel Project Settings:
   - `JWT_SECRET` — any strong random secret for player/admin auth tokens.
   - `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` *(recommended for live competitions)* — free [Turso](https://turso.tech) libSQL database so teams, accounts, and flag solves persist across all serverless functions. *(If omitted, Vercel previews run zero-config using `/tmp/cuj_ctf.sqlite` per warm instance.)*

### Option 2: Docker / Render
This repository also includes a `Dockerfile` and a `render.yaml` Blueprint (plus a GitHub Actions CI template in `docs/ci.yml`):

1. Connect this GitHub repository to [Render](https://render.com) (New → Blueprint) or any Docker host (Railway, Fly.io, campus VM).
2. Set a strong `JWT_SECRET` environment variable in production (`render.yaml` auto-generates one).
3. Health endpoint: `GET /api/health`.

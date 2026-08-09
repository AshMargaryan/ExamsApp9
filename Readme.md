# Project

An interactive learning platform designed to help students in Armenia prepare for university entrance examinations.

## Overview

The goal of this project is to provide accessible, high-quality exam preparation resources for students preparing for the Unified Entrance Examinations. The platform focuses on structured learning, independent study, and continuous practice through interactive content and assessments.

## Planned Features

* Subject-specific learning modules
* Chapter-based practice exercises
* Detailed explanations and solutions
* Progress tracking and performance analytics
* Timed mock examinations
* Personalized recommendations based on student performance
* Question bank organized by topic and difficulty
* Review mode for previously answered questions

## Vision

Many students rely heavily on private tutors to prepare for entrance examinations. This platform aims to make effective exam preparation more accessible by providing a comprehensive self-study environment with guided learning and extensive practice opportunities.

## Target Audience

* High school students in Armenia
* Students preparing for Unified Entrance Examinations
* Independent learners seeking structured exam preparation

## Development Status

This project is currently in early development.

## Future Possibilities

While the initial focus is on Armenian entrance examinations, the platform may later expand to support additional standardized tests and educational content.

## Tech Stack

To be determined.

## Running with Docker

Two **completely separate** Compose stacks exist — different Compose project
names, different named volumes, on purpose. They must never be able to read
or overwrite each other's database, and both can run on the same machine at
the same time without conflict.

| | `docker-compose.yml` | `docker-compose.prod.yml` |
|---|---|---|
| Purpose | Local development | Production (e.g. Raspberry Pi LAN deployment) |
| Frontend | Vite dev server (HMR), bind-mounted source | `prod` target (built static bundle), served by its own nginx |
| Backend | `dev` target, bind-mounted source | `prod` target (no bind mounts, runs as non-root) |
| Compose project name | `examsapp9-dev` | `examsapp9-prod` |
| Postgres volume | `examsapp9_dev_postgres_data` | `examsapp9_prod_postgres_data` |
| Other volumes | `examsapp9_dev_frontend_node_modules` | `examsapp9_prod_backend_media` |
| Public entry point | `localhost:3000` / `localhost:8000` directly | `nginx` on port 80 only — db/backend/frontend are internal-only |

### ⚠️ Data safety

* **`docker compose down -v` deletes the named volumes for whichever file
  you pass it — including the database.** There is no undo; the `local`
  volume driver keeps no snapshots. Never run it against
  `docker-compose.prod.yml` without being certain you want to destroy the
  production database.
* Because the two stacks have distinct project names, a `down -v` against
  one file **cannot** touch the other's volumes — but treat that as a
  safety net, not permission to run it casually. A plain `docker compose
  down` (no `-v`) is always safe: it only stops/removes containers, never
  volumes.
* Always pass `-f docker-compose.prod.yml` explicitly for production
  commands. Never run a bare `docker compose up`/`down` from this directory
  expecting it to mean "production" — the bare form defaults to
  `docker-compose.yml` (dev).
* Production deployment must never reuse the development Compose
  project/volumes — that's exactly what the explicit `name:` and volume
  `name:` fields in each file prevent.

### Local development

```bash
docker compose -f docker-compose.yml up --build
```

Frontend at `http://localhost:3000`, backend/API at `http://localhost:8000`, Postgres at `localhost:5433`. Edits to `backend/` or `frontend/` are picked up live via bind mounts.

### Production-style deployment (Raspberry Pi / LAN)

1. Fill in `backend/.env` (see `backend/.env.example`) — it's gitignored and per-machine. A few values need LAN-appropriate settings that differ from the dev defaults:
   * `DEBUG` — overridden to `false` by `docker-compose.prod.yml` regardless of this file's value, but keep it accurate for other tools.
   * `ALLOWED_HOSTS` — must include whatever host/IP clients on your LAN will type into the browser (e.g. the Pi's LAN IP, a `.local` hostname, or `*` for a quick LAN-only test). Not baked into any Docker file, so the same image works unchanged across different networks/IPs.
   * `SECRET_KEY`, `JWT_SECRET`, `DB_*`/`POSTGRES_*`, and any OAuth/email credentials you actually use.
   * `frontend/.env` is **not** used by the prod build — `VITE_API_URL`/`VITE_GOOGLE_CLIENT_ID`/etc. are instead passed as Docker build args in `docker-compose.prod.yml`, sourced from your shell environment, since Vite bakes them into the JS bundle at build time. `VITE_API_URL` is set to the relative path `/api`, so it (and the WebSocket URLs derived from it) resolve against whatever host/IP the browser used to reach nginx — no LAN IP is hardcoded anywhere.

2. Build and start the full stack:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

   This builds the `prod` Dockerfile targets and starts `db`, `backend`, `frontend`, and `nginx` — the **only** service published to the host (port 80). Backend (8000) and Postgres (5432) are not published; both are reachable only from other containers on the internal Docker network, by service name (`backend`, `db`).

   **First boot takes several minutes**, not seconds: the backend's entrypoint runs migrations and seeds the full mock-exam/flashcard question bank into an empty database before Daphne starts answering requests. This is a one-time cost — subsequent restarts skip seeding since the tables are no longer empty. Watch progress with:

   ```bash
   docker compose -f docker-compose.prod.yml logs -f backend
   ```

3. Open `http://<the-Pi's-LAN-IP>/` from any device on the same network.

4. To stop the stack without touching its data:

   ```bash
   docker compose -f docker-compose.prod.yml down
   ```

No HTTPS yet — this is a LAN-only deployment. A real domain, TLS, and public exposure are a separate future step.

### How requests flow (production compose)

* **HTTP** `http://<pi-ip>/` → `nginx` → `/api/`, `/admin/`, `/static/` go to `backend:8000`; `/media/` is served directly by nginx from the `examsapp9_prod_backend_media` volume shared with the backend (Django doesn't serve `MEDIA_URL` when `DEBUG=False`); everything else goes to `frontend:80` (the frontend container's own nginx, serving the built React SPA with client-side routing fallback).
* **WebSocket** `ws://<pi-ip>/ws/...` (chat, game rooms, notifications — see `backend/config/asgi.py`) → `nginx` (`/ws/` location, upgrades the connection with generous read/send timeouts for long-lived sockets) → `backend:8000` (Daphne/Channels).

## License

To be determined.

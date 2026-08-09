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

## License

To be determined.

## Docker

Two **completely separate** Compose stacks exist. They use different Compose
project names and different named volumes on purpose — they must never be
able to read or overwrite each other's database.

| | `docker-compose.yml` | `docker-compose.prod.yml` |
|---|---|---|
| Purpose | Local development | Production (e.g. Raspberry Pi LAN deployment) |
| Compose project name | `examsapp9-dev` | `examsapp9-prod` |
| Postgres volume | `examsapp9_dev_postgres_data` | `examsapp9_prod_postgres_data` |
| Other volumes | `examsapp9_dev_frontend_node_modules` | `examsapp9_prod_backend_media` |
| Public entry point | `frontend:3000`, `backend:8000` (published directly) | `nginx:80` only — db/backend/frontend are internal-only |

Both stacks can run on the same machine at the same time without conflict —
their containers, networks, and volumes are fully namespaced by their
project name.

### ⚠️ Data safety

* **`docker compose down -v` deletes the named volumes for whichever file
  you pass it — including the database.** There is no undo; the `local`
  volume driver keeps no snapshots. Never run it against
  `docker-compose.prod.yml` without being certain you want to destroy the
  production database, and always confirm with whoever owns that data
  first.
* Because the two stacks have distinct project names, a `down -v` against
  one file **cannot** touch the other's volumes — but a plain `docker
  compose down` (no `-v`) is always safe: it only stops/removes containers,
  never volumes.
* Always pass `-f docker-compose.prod.yml` explicitly for production
  commands. Never run a bare `docker compose up`/`down` from this directory
  expecting it to mean "production" — the bare form defaults to
  `docker-compose.yml` (dev).

### Development

```bash
docker compose -f docker-compose.yml up -d --build
```

Frontend (Vite dev server, HMR): http://localhost:3000
Backend (Daphne, direct): http://localhost:8000
Postgres (direct psql access): `localhost:5433`

### Production (Raspberry Pi / LAN deployment)

1. Fill in `backend/.env` (see `backend/.env.example`). At minimum for a
   production run, set:
   * `DEBUG` — overridden to `false` by `docker-compose.prod.yml`
     regardless of this file's value, but keep it accurate for other tools.
   * `ALLOWED_HOSTS` — must include whatever host/IP clients on your LAN
     will type into the browser (e.g. the Pi's LAN IP, a `.local` hostname,
     or `*` for a quick LAN-only test). This is intentionally **not**
     baked into any Docker file, so the same image works unchanged across
     different networks/IPs.
   * `SECRET_KEY`, `JWT_SECRET`, `DB_*`/`POSTGRES_*`, and any OAuth/email
     credentials you actually use.

2. Build and start the full stack:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

   This builds the `prod` targets of `backend/Dockerfile` and
   `frontend/Dockerfile`, and starts `db`, `backend`, `frontend`, and
   `nginx`. First boot on a fresh volume also runs Django migrations and
   seeds reference content (subjects, mock exams, flashcards) — this can
   take several minutes; watch progress with:

   ```bash
   docker compose -f docker-compose.prod.yml logs -f backend
   ```

3. Open `http://<pi-lan-ip>/` — nginx (see `nginx/nginx.conf`) is the only
   published port (80) and reverse-proxies `/api/`, `/admin/`, `/static/`
   to the backend, `/ws/` to the backend with WebSocket upgrade headers
   (Django Channels — games/chat/notifications), `/media/` directly from
   the shared `examsapp9_prod_backend_media` volume, and everything else to
   the frontend's own nginx (the built React SPA).

4. To stop the production stack without touching its data:

   ```bash
   docker compose -f docker-compose.prod.yml down
   ```

No HTTPS yet — this is a LAN-only deployment. A real domain, TLS, and
public exposure are a separate future step.

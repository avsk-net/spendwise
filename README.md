# SpendWise

A self-hosted personal finance tracker. Track spending, set budgets, manage multiple accounts, and work toward saving goals — all in one place.

**Live demo:** https://finance.lalonhobekotodine.sbs

---

## Features

- **Dashboard** — spending summary, budget progress, recent transactions
- **Transactions** — log income and expenses, filter by account, category, or date range
- **Accounts** — manage multiple bank accounts or wallets with running balances
- **Budgets** — set monthly limits per category, track remaining budget live
- **Saving Goals** — define targets with optional deadlines, contribute funds, track progress
- **Recurring Rules** — define daily/weekly/monthly/yearly transactions that auto-post via a scheduled job
- **Reports** — spending breakdown by category, daily and monthly charts, trend view
- **Notifications** — in-app alerts for budget overruns and reached goals, delivered over WebSocket
- **Settings** — update profile, change password, set preferred currency

---

## Tech Stack

### Backend
| | |
|---|---|
| Framework | FastAPI 0.111 |
| Database | PostgreSQL 16 via SQLAlchemy 2 (async) + Alembic migrations |
| Auth | JWT (HS256 access tokens, 30 min) + refresh tokens (30 days, hashed in DB) |
| Cache / Broker | Redis 7 |
| Background Jobs | Celery 5 — recurring transaction processor, monthly email reports |
| Rate Limiting | slowapi |
| Password Hashing | bcrypt via passlib |
| Runtime | Python 3.12, Uvicorn (2 workers) |

### Frontend
| | |
|---|---|
| Framework | React 19 + Vite |
| Routing | React Router v7 |
| Server State | TanStack Query v5 |
| Client State | Zustand |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Styling | Tailwind CSS |

### Infrastructure
| | |
|---|---|
| Container Registry | GitHub Container Registry (GHCR) |
| CI | GitHub Actions — lint, type-check, tests, Docker build validation |
| CD | GitHub Actions → SSH → `docker compose pull && up` on VPS |
| Reverse Proxy | Nginx (system) with TLS termination via Let's Encrypt |
| WebSocket | `/api/v1/ws` — proxied with `Upgrade` headers |

---

## Project Structure

```
SpendWise/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # Route handlers (auth, accounts, transactions, …)
│   │   ├── core/               # Config, security, logging
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── repositories/       # DB access layer
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Business logic, WebSocket manager
│   │   └── workers/            # Celery tasks (recurring, emails)
│   ├── tests/
│   │   ├── unit/               # Pure unit tests (no DB)
│   │   └── integration/        # Tests against a live PostgreSQL instance
│   ├── alembic/                # DB migrations
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   ├── src/
│   │   ├── features/           # Feature modules (dashboard, transactions, …)
│   │   ├── layouts/            # DashboardLayout, AuthLayout
│   │   ├── components/         # Shared UI components
│   │   ├── store/              # Zustand auth store
│   │   └── App.jsx             # Router root
│   ├── Dockerfile
│   └── nginx-frontend.conf     # Serves SPA, long-lived asset cache, gzip
├── nginx/                      # System nginx config for the VPS
├── docker-compose.yml          # Production stack
├── docker-compose.dev.yml      # Local development stack
└── .github/workflows/
    ├── ci.yml                  # Lint + test on every push / PR
    └── deploy.yml              # Build → push → deploy on main
```

---

## Running Locally

### Option 1 — Docker Compose (recommended)

Requires Docker and Docker Compose.

```bash
git clone https://github.com/avsk-net/spendwise.git
cd spendwise

# Copy and fill in the required env vars (see below)
cp backend/.env.example backend/.env.dev

docker compose -f docker-compose.dev.yml up
```

| Service | URL |
|---|---|
| Frontend (Vite dev) | http://localhost:5173 |
| API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/api/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

Migrations run automatically on API startup (`alembic upgrade head`).

### Option 2 — Manual

1. Start PostgreSQL 16 and Redis 7 (Docker or local install).
2. Set up the backend:
   ```bash
   cd backend
   pip install -r requirements.txt -r requirements-dev.txt
   cp .env.example .env          # edit with your values
   alembic upgrade head
   uvicorn app.main:app --reload --port 8000
   ```
3. Start the Celery worker (optional, needed for recurring jobs):
   ```bash
   celery -A app.workers.celery_app.celery worker --loglevel=info
   ```
4. Set up the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev                    # proxies /api/* → localhost:8000
   ```

---

## Environment Variables

Create `backend/.env` (production) or `backend/.env.dev` (local).

### Required

| Variable | Example | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@localhost:5432/spendwise` | Async DB connection string |
| `SECRET_KEY` | *(64+ random chars)* | JWT signing secret |
| `REDIS_URL` | `redis://localhost:6379/0` | Celery broker and cache |

### PostgreSQL (used by Docker Compose)

| Variable | Example |
|---|---|
| `POSTGRES_USER` | `spendwise` |
| `POSTGRES_PASSWORD` | *(strong password)* |
| `POSTGRES_DB` | `spendwise` |
| `GITHUB_REPO` | `avsk-net/spendwise` *(for image tags)* |

### Optional

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `development` | `development` or `production` |
| `DEBUG` | `false` | Enable debug output |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Refresh token lifetime |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed CORS origins (JSON array) |
| `RATE_LIMIT_LOGIN` | `5/minute` | Login rate limit |
| `RATE_LIMIT_REGISTER` | `3/minute` | Register rate limit |
| `DB_POOL_SIZE` | `10` | SQLAlchemy connection pool size |
| `DB_MAX_OVERFLOW` | `20` | Max pool overflow connections |

### Email (optional — needed for monthly reports)

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USER` | SMTP login |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM` | From address for outbound email |
| `SMTP_USE_TLS` | `true` / `false` |

---

## API

Interactive docs are available at `/api/docs` (Swagger UI) and `/api/redoc` when the server is running.

| Group | Endpoints |
|---|---|
| Auth | `POST /register` `POST /login` `POST /refresh` `POST /logout` |
| Users | `GET /me` `PATCH /me` `PATCH /me/password` `DELETE /me` |
| Accounts | CRUD at `/accounts` |
| Transactions | CRUD at `/transactions` |
| Categories | CRUD at `/categories` |
| Budgets | CRUD at `/budgets` |
| Recurring | CRUD at `/recurring` |
| Saving Goals | CRUD + `POST /{id}/contribute` at `/saving-goals` |
| Reports | `GET /reports/summary` `/by-category` `/daily` `/monthly` `/trend` |
| Notifications | `GET /notifications` `PATCH /{id}/read` `PATCH /read-all` |
| WebSocket | `WS /ws?token=<access_token>` |

---

## Running Tests

```bash
cd backend

# Unit tests only (no database needed)
pytest tests/unit/ -v

# All tests (requires PostgreSQL and Redis)
DATABASE_URL=postgresql+asyncpg://spendwise:spendwise@localhost:5432/spendwise_test \
SECRET_KEY=test-secret-key-at-least-32-chars \
pytest tests/ -v --cov=app
```

### Linting and type checking

```bash
black --check app tests
isort --check-only app tests
ruff check app tests
mypy app --ignore-missing-imports
```

---

## Deployment

The project ships with a full CI/CD pipeline.

**On every push to `main`:**
1. CI runs: backend lint + type-check, backend tests, frontend lint, frontend tests, Docker build validation.
2. If CI passes, the deploy workflow builds Docker images for the API and frontend and pushes them to GHCR.
3. The workflow SSH-es into the VPS, runs `docker compose pull && docker compose up -d --remove-orphans`.

**VPS setup prerequisites:**
- Docker + Docker Compose installed, `deploy` user in the `docker` group
- `/home/deploy/spendwise/docker-compose.yml` and `.env` present
- System nginx configured to reverse-proxy ports 8001 (API) and 3001 (frontend), with TLS from Let's Encrypt
- `VPS_SSH_KEY` secret set in GitHub repository settings

**Required GitHub secrets:**

| Secret | Value |
|---|---|
| `VPS_SSH_KEY` | Private SSH key for the `deploy` user |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions (for GHCR push) |

---

## License

MIT

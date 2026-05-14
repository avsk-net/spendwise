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

## Self-Hosting Guide

This section walks through running SpendWise on your own server from scratch. No CI/CD setup required — you just need a VPS and a domain name.

### Prerequisites

| Requirement | Notes |
|---|---|
| VPS | 1 vCPU, 1 GB RAM minimum. Ubuntu 22.04 recommended. |
| Domain name | A DNS A record pointing to your server's IP. Example: `finance.example.com` |
| Open ports | 80 and 443 must be reachable from the internet (for nginx + Let's Encrypt) |

---

### Step 1 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker          # apply group change without logging out
docker --version       # confirm
```

---

### Step 2 — Clone the repository

```bash
git clone https://github.com/avsk-net/spendwise.git
cd spendwise
```

---

### Step 3 — Create your `.env` file

The `.env` file lives in the repo root (next to `docker-compose.yml`). Start from the example:

```bash
cp backend/.env.example .env
```

Open `.env` and fill in every value. The fields you **must** change:

```bash
# Generate a strong database password
POSTGRES_PASSWORD=<strong-random-password>

# Generate a 64-character secret key for JWT signing
# Linux/macOS: openssl rand -hex 32
SECRET_KEY=<output-of-openssl-rand-hex-32>

# Update the DATABASE_URL password to match POSTGRES_PASSWORD
DATABASE_URL=postgresql+asyncpg://spendwise:<your-password>@postgres:5432/spendwise

# Set this to your actual domain
CORS_ORIGINS=["https://finance.example.com"]

# Leave this as-is (used for Docker image tags when building locally)
GITHUB_REPO=avsk-net/spendwise
```

---

### Step 4 — Build the Docker images

The production `docker-compose.yml` expects pre-built images from GHCR. For self-hosting, build them locally instead:

```bash
docker build -t ghcr.io/avsk-net/spendwise/spendwise-api:latest ./backend
docker build -t ghcr.io/avsk-net/spendwise/spendwise-frontend:latest ./frontend
```

> The image names just need to match the `image:` values in `docker-compose.yml`. You can rename them to anything — just update both the build command and `.env`'s `GITHUB_REPO` to match.

---

### Step 5 — Start the stack

```bash
docker compose up -d
docker compose ps     # all services should reach "healthy" within ~30 seconds
```

You should see six containers running: `postgres`, `redis`, `api`, `worker`, `beat`, `frontend`.

Database migrations run automatically when the `api` container starts.

---

### Step 6 — Install nginx and Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

### Step 7 — Get a TLS certificate

First create a temporary nginx config so Certbot can complete the HTTP challenge:

```bash
sudo tee /etc/nginx/sites-available/spendwise > /dev/null <<'EOF'
server {
    listen 80;
    server_name finance.example.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
EOF

sudo mkdir -p /var/www/certbot
sudo ln -sf /etc/nginx/sites-available/spendwise /etc/nginx/sites-enabled/spendwise
sudo nginx -t && sudo systemctl reload nginx

sudo certbot certonly --webroot -w /var/www/certbot \
  -d finance.example.com \
  --non-interactive --agree-tos -m your@email.com
```

---

### Step 8 — Write the final nginx config

Replace the placeholder with the full HTTPS config. Substitute `finance.example.com` with your domain:

```bash
sudo tee /etc/nginx/sites-available/spendwise > /dev/null <<'EOF'
server {
    listen 80;
    server_name finance.example.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    server_name finance.example.com;

    ssl_certificate     /etc/letsencrypt/live/finance.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/finance.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    # WebSocket — must come before /api/
    location /api/v1/ws {
        proxy_pass         http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
    }

    # REST API
    location /api/ {
        proxy_pass         http://127.0.0.1:8001;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # Frontend SPA
    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx
```

Open `https://finance.example.com` — you should see the SpendWise login page.

---

### Step 9 — Enable automatic certificate renewal

Certbot installs a systemd timer by default. Verify it:

```bash
sudo systemctl status certbot.timer
```

If it is not active:

```bash
sudo systemctl enable --now certbot.timer
```

---

### Keeping SpendWise up to date

When a new version is released, pull the updated code and rebuild:

```bash
git pull
docker build -t ghcr.io/avsk-net/spendwise/spendwise-api:latest ./backend
docker build -t ghcr.io/avsk-net/spendwise/spendwise-frontend:latest ./frontend
docker compose up -d --remove-orphans
docker image prune -f
```

Migrations are applied automatically on the next `api` container start.

---

### Troubleshooting

**Site not loading after nginx reload**
- Check nginx logs: `sudo journalctl -u nginx -n 50`
- Confirm Docker containers are running: `docker compose ps`
- Confirm ports are bound: `ss -tlnp | grep -E '8001|3001'`

**API returns 500 on first request**
- Check api logs: `docker compose logs api --tail 50`
- Most likely a missing or wrong `.env` value (database URL, secret key)

**"Connection refused" on port 80/443**
- Make sure your cloud provider's firewall / security group allows inbound TCP 80 and 443

**Certificate fails with "could not connect to server"**
- Port 80 must be reachable from the internet before running Certbot
- Check that no other service is binding port 80: `ss -tlnp | grep :80`

---

## License

MIT

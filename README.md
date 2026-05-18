# SpendWise

A self-hosted personal finance tracker. Track spending, set budgets, manage accounts, and work toward saving goals — all in one place.

**Live demo:** https://finance.lalonhobekotodine.sbs

---

## Features

- **Dashboard** — monthly summary, budget progress, smart insights, spending velocity, quick-add shortcut
- **Transactions** — income, expense, transfer, refund, adjustment; filters, CSV import/export, templates, bulk delete
- **Accounts** — multiple accounts with live balances, balance history chart, transfer tracking
- **Budgets** — monthly limits per category, rollover support, budget vs actual report, copy to next month
- **Categories** — custom categories and subcategories with icons; auto-categorisation rules
- **Recurring Rules** — daily/weekly/monthly/yearly rules that auto-post via Celery
- **Saving Goals** — targets with deadlines, contributions, progress tracking
- **Debt Tracker** — borrowed/lent tracking with payment history and overdue alerts
- **Reports** — category breakdown, monthly trends, by-weekday analysis, net worth, PDF export
- **Notifications** — in-app alerts for budget overruns and approaching deadlines
- **Security** — JWT auth, refresh tokens, 2FA (TOTP), email verification, rate limiting
- **Email** — password reset, monthly report digest (optional)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, SQLAlchemy 2 (async), PostgreSQL 16, Alembic |
| Auth | JWT (HS256) + refresh tokens + TOTP 2FA |
| Background Jobs | Celery 5 + Redis 7 |
| Frontend | React 19, Vite, TanStack Query v5, Zustand, Tailwind CSS, Recharts |
| Infrastructure | Docker, GitHub Actions CI/CD, Nginx, Let's Encrypt |

---

## Quick Start

Requires Docker and Docker Compose.

```bash
git clone https://github.com/avsk-net/spendwise.git
cd spendwise
cp backend/.env.example backend/.env.dev
docker compose -f docker-compose.dev.yml up
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/api/docs |

Migrations run automatically on API startup.

---

## Environment Variables

Create `backend/.env`. Minimum required:

| Variable | Description |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@localhost:5432/spendwise` |
| `SECRET_KEY` | JWT signing secret (64+ random characters) |
| `REDIS_URL` | `redis://localhost:6379/0` |

For email features (password reset, monthly reports), also set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.

---

## Self-Hosting

1. Provision a VPS (1 vCPU / 1 GB RAM minimum) with a domain pointing to it.
2. Install Docker: `curl -fsSL https://get.docker.com | sh`
3. Clone the repo, create `.env` with your values, then build and start:
   ```bash
   docker build -t ghcr.io/avsk-net/spendwise/spendwise-api:latest ./backend
   docker build -t ghcr.io/avsk-net/spendwise/spendwise-frontend:latest ./frontend
   docker compose up -d
   ```
4. Install nginx and Certbot, then proxy ports `8001` (API) and `3001` (frontend) behind HTTPS.

The full nginx config and Certbot setup are documented in [`nginx/nginx.conf`](nginx/nginx.conf).

---

## License

MIT

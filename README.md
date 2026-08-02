# Finance Tracker

A single-user personal finance tracker with an Express/Prisma/PostgreSQL API and an offline-friendly Vite/React PWA.

## Local development

Requirements: Node 20+ and npm. The backend uses Prisma migrations against the single Render-managed PostgreSQL database shared by development and production; the frontend talks to it with an httpOnly cookie.

1. Create the Render Postgres instance and copy its External Database URL.

2. Create the backend environment file:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Set all backend variables from `backend/.env.example`: `DATABASE_URL` should be the Render External Database URL, while `JWT_SECRET`, `CRON_SECRET`, `FRONTEND_ORIGIN`, and `PORT` should be set for this environment. Add a bcrypt `PASSWORD_HASH`. Generate a hash without putting the plaintext in source control:

   ```bash
   cd backend
   node -e "require('bcrypt').hash('your-password', 12).then(console.log)"
   ```

   Copy only the resulting hash into `PASSWORD_HASH`.

3. Install and migrate the backend:

   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npm run dev
   ```

4. In another terminal, install and start the frontend:

   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Set VITE_API_BASE_URL to the Render backend URL in .env.local.
   npm run dev
   ```

Open http://localhost:5173. The API health check is at http://localhost:4000/health.

## Production builds

```bash
cd backend && npm ci && npm run build
cd ../frontend && npm ci && npm run build
```

## Render deployment

`backend/render.yaml` defines the web service, managed Postgres database, and weekly cron job. Create a Blueprint from the repository in Render and apply that file.

Set these backend service environment variables in Render:

- `DATABASE_URL` is supplied by the managed database in the Blueprint.
- `JWT_SECRET` and `CRON_SECRET` can be generated values.
- `PASSWORD_HASH` is the bcrypt hash for the one allowed password.
- `FRONTEND_ORIGIN` is the deployed Vercel origin, for example `https://finance.example.com`.

The cron runs at `15:59 UTC` every Sunday, which is `23:59 SGT`, and calls the protected weekly-report endpoint with `X-Cron-Secret`.

## Vercel deployment

Create a Vercel project rooted at `frontend/`. The included `vercel.json` uses `npm run build` and publishes `dist`.

Set `VITE_API_BASE_URL` from `frontend/.env.example` to the public Render backend URL, for example `https://finance-tracker-api.onrender.com`. Because authentication uses cookies, the Render `FRONTEND_ORIGIN` must match the Vercel origin exactly.

## API overview

- `POST /api/auth/login` — password login and 30-day httpOnly JWT cookie.
- `GET|POST /api/transactions` — list and idempotent transaction creation.
- `PATCH|DELETE /api/transactions/:id` — edit or remove a transaction.
- `GET /api/analytics/summary?range=week|month|ytd` — totals and daily/category data.
- `GET /api/reports/weekly` and `/api/reports/weekly/latest` — generated reports.
- `POST /api/reports/generate` — cron-only previous-week aggregation.

Writes created through Quick Add are stored in IndexedDB first, rendered optimistically, and retried with client IDs so reconnects are safe.
# tracly

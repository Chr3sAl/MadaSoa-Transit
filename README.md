# MadaSoa Transit

A bilingual shipment tracking and logistics suite built with Next.js, Auth.js, Prisma, and PostgreSQL-ready data modeling.

## What is included

- Public tracking portal at `/fr` and `/en`
- Guest search by tracking number or client reference
- Admin dashboard for shipments, customers, imports, reports, and team accounts
- Role-aware access for `admin`, `operator`, and `finance`
- CSV/XLSX preview-first import flow
- Prisma schema for PostgreSQL plus demo-mode fallback data for local development

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the local environment template:

```bash
copy .env.example .env.local
```

3. Update `.env.local` for your local PostgreSQL database:

```env
NEXTAUTH_SECRET=change-me-in-production
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://madasoa_app:your-url-encoded-password@localhost:5432/madasoa_transit?schema=public
DEMO_MODE=false
```

4. Generate Prisma, apply the initial migration, and seed the database:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

If you only want the UI demo mode, you can leave `DATABASE_URL` unset in `.env.local`, set `DEMO_MODE=true`, and skip the Prisma database commands.

Production notes:

- `NEXTAUTH_SECRET` is required in production builds and deployments.
- `DATABASE_URL` is required for real production deployments. The app no longer falls back to demo mode automatically in production.
- `NEXTAUTH_URL` should be set explicitly for Railway and any custom-domain deployment.

## Demo accounts

The demo accounts below are shown in the login UI only when demo mode is enabled.

- `admin@madasoatransit.local` / `Admin123!`
- `operator@madasoatransit.local` / `Operator123!`
- `finance@madasoatransit.local` / `Finance123!`

## Local PostgreSQL + pgAdmin 4 setup

Use these local names for the branded setup:

- Database: `madasoa_transit`
- App role: `madasoa_app`
- Host: `localhost`
- Port: `5432`

1. Open pgAdmin 4 and connect to your local PostgreSQL server as `postgres`.
2. Create a login role named `madasoa_app`.
   Set a password and enable `Can login`.
3. Create a database named `madasoa_transit`.
   Set the owner to `madasoa_app`.
4. Put the connection string into `.env.local`:

```env
DATABASE_URL=postgresql://madasoa_app:your-url-encoded-password@localhost:5432/madasoa_transit?schema=public
```

5. Run the local database commands:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
npm run db:seed
```

## Validation

```bash
npm run lint
npm run test
npm run build
```

GitHub Actions also runs the same validation pipeline on every push and pull request through `.github/workflows/ci.yml`.

## Deployment

- Railway is configured with [`railway.toml`](./railway.toml) and uses `/api/health` for health checks.
- Production deploy preparation runs through `npm run deploy:prepare`, which validates env vars and applies Prisma migrations when `DATABASE_URL` is configured.
- Vercel builds now validate deployment env vars during `npm run build`.
- A full deploy checklist is available in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Import guardrails

- Only `.csv` and `.xlsx` uploads are accepted by the import preview endpoint.
- Import files must be non-empty and 5 MB or smaller.
- The public lookup API now applies a small per-client rate limit to reduce abuse.

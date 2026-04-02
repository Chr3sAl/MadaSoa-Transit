# Deployment Guide

This project is ready to deploy on both Railway and Vercel, but the safe path is slightly different on each platform.

## Required environment variables

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DATABASE_URL` unless you are intentionally deploying a demo-only instance with `DEMO_MODE=true`
- `DEMO_MODE=false` for real deployments

## Railway

1. Provision a PostgreSQL service in the same Railway project.
2. Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` in the Railway service variables.
3. Confirm `DATABASE_URL` is available to the web service.
4. Deploy with the included [`railway.toml`](./railway.toml).

Railway will:

- run `npm run build`
- run `npm run deploy:prepare` before start
- apply Prisma migrations with `prisma migrate deploy`
- health check the app at `/api/health`

## Vercel

1. Add the same env vars in the Vercel project settings.
2. Make sure `NEXTAUTH_URL` points at your production domain or primary `vercel.app` URL.
3. Let the normal Vercel build run `npm run build`.

The build now validates deployment env vars automatically on Vercel. It will fail early if the deployment is missing auth or database configuration.

## Migrations

This repo now includes an initial Prisma migration under `prisma/migrations`.

- Apply migrations with `npm run prisma:migrate:deploy`
- Seed with `npm run db:seed`

For Vercel, run migrations from a trusted environment before or alongside production promotion. For Railway, `npm run deploy:prepare` handles that automatically.

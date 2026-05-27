# Avito Catalog Uploader

Full-stack MVP for creating parent products, managing color/size variants with photos, exporting Avito autoload feeds, publishing through a queue, and exporting the internal catalog to Excel.

## Stack

- Next.js App Router, React, TypeScript
- PostgreSQL + Prisma
- Redis + BullMQ
- Local upload storage
- Server-side XML/CSV/XLSX generation
- Avito OAuth2 Client Credentials integration

PostgreSQL is exposed on host port `55432` to avoid conflicts with a locally installed PostgreSQL on Windows.

## Local Start

```bash
npm install
copy .env.example .env
docker compose up -d
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Run the worker in a second terminal:

```bash
npm run worker
```

Seed login defaults to `ADMIN_EMAIL` and `ADMIN_PASSWORD` when provided. If `ADMIN_PASSWORD_HASH` is set, use the password that generated that bcrypt hash.

## Key URLs

- Admin: `http://localhost:3433`
- Avito XML feed: `/feed/avito.xml?token=FEED_PUBLIC_TOKEN`
- Avito CSV feed: `/feed/avito.csv?token=FEED_PUBLIC_TOKEN`
- Excel export: `/api/exports/catalog.xlsx`

## Production Port

The app is configured to run on port `3433`:

```bash
npm run build
npm run start
```

For nginx deployment on `https://amsterdam2.sebog1.ru`, proxy traffic to `127.0.0.1:3433` and set `APP_PUBLIC_URL="https://amsterdam2.sebog1.ru"` on the server.

## Modules

- `src/server/modules/auth`: single-admin login and JWT cookie session
- `src/server/modules/avitoApi`: OAuth2 token cache, authenticated API client, Items API adapter
- `src/server/modules/products`: product and variant CRUD
- `src/server/modules/variants`: photo upload/delete
- `src/server/modules/exports`: feed row normalization, XML/CSV/Excel exporters
- `src/server/modules/jobs`: BullMQ publication and status sync jobs

## Avito Notes

`AVITO_CLIENT_ID` and `AVITO_CLIENT_SECRET` are read only from environment variables. Endpoint paths are configurable because available Avito API methods and category field schemas depend on account access. XML/CSV autoload is the default MVP publication mode; direct Items API mode publishes each ready variant as a separate listing.

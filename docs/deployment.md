# Deployment

## Local Run

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run build
npm run start
```

Local app URL: `http://localhost:3000`.

## Vercel Deployment

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Set build command: `npm run build`.
4. Set environment variables:
   - `DATABASE_URL`
   - `AI_BASE_URL`
   - `AI_API_KEY`
   - `AI_MODEL`
   - `SESSION_SECRET`
   - `APP_URL`
5. Use a hosted PostgreSQL database instead of local SQLite.
6. Run Prisma migration/push as part of deployment setup.

## PostgreSQL Migration

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then run:

```bash
npm run db:generate
npx prisma db push
npm run db:seed
```

For production, replace `db push` with migrations once the schema stabilizes.

## Object Storage

The MVP uses preloaded assets under `public/demo-materials`. Production image upload should use:

- Vercel Blob
- AWS S3
- Cloudflare R2
- Volcengine TOS

Store only metadata and public/object keys in `Material`.

## Fallback Mode

If object storage is not available, keep the preloaded demo materials enabled. The materials library and creation flow still work for review and demo.

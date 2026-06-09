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
   - or the Ark aliases `ARK_API_KEY` plus `ARK_MODEL`/`ARK_ENDPOINT_ID`
   - `SESSION_SECRET`
   - `VERIFICATION_CODE_SECRET`
   - `REVIEW_TOKEN_SECRET`
   - `APP_URL`
   - `SMS_DELIVERY_MODE=mock` for demo deployments that simulate phone codes
   - Volc SMS variables: `VOLC_ACCESSKEY`, `VOLC_SECRETKEY`, `VOLC_SMS_ACCOUNT`, `VOLC_SMS_SIGN`, `VOLC_SMS_TEMPLATE_ID`
   - Volc mail SMTP variables: `VOLC_EMAIL_SMTP_HOST`, `VOLC_EMAIL_SMTP_PORT`, `VOLC_EMAIL_SMTP_USER`, `VOLC_EMAIL_SMTP_PASS`, `VOLC_EMAIL_FROM`
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

## Secret Handling

Do not commit real Ark EPs, API keys, `.env`, screenshots of the key, or copied TRAE/IDE configuration. Put challenge credentials only in local `.env` or the deployment platform secret panel. The tracked `.env.example` intentionally uses placeholders.

## Verification Delivery

Local development falls back to mock verification codes and shows them on the login page. Demo deployments can set `SMS_DELIVERY_MODE=mock` to keep phone login simulated and display the demo code even when `NODE_ENV=production`.

Production should configure:

- Volcengine SMS verification through `SendSmsVerifyCode` / `CheckSmsVerifyCode`.
- A Volc mail SMTP channel for registration email codes.

When a real provider is configured, the API does not return the verification code to the browser.

# Liora Labs Shipping

White-label shipping rates and labels. Customers see **Liora Labs** only. Carrier rates come from Easyship, are marked up, charged through Stripe, and a label is purchased only after payment succeeds.

**Database:** [Neon](https://neon.tech) Postgres  
**Host:** [Netlify](https://www.netlify.com) (Next.js App Router)

Labels once fetched cannot be returned.

## Architecture

1. **Rate quote** — `POST /api/quote` calls Easyship `/rates`, applies markup, stores `QUOTED` shipments, returns branded prices only.
2. **Checkout** — `POST /api/checkout` creates a Stripe PaymentIntent for `customerTotalCents`. No label is bought here.
3. **Fulfillment** — Stripe webhook `POST /api/webhooks/stripe` (and the confirmation page) buy the label only after payment succeeds.
4. **Delivery** — label PDF is proxied from `/api/shipments/[id]/label`. Tracking lives at `/track/[trackingNumber]`. A copy is emailed from Gmail to the customer.

Markup is controlled by `APP_MARKUP_PERCENT` (default **10**). Optional `APP_MARKUP_FLAT_CENTS` / `APP_MARKUP_CAP_CENTS` set a dollar floor or cap (`0` = off).

## Local development

```bash
cp .env.example .env   # paste Neon + Stripe + Easyship keys. Never commit .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open http://localhost:3000

Forward Stripe webhooks while developing locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Push to Git, host on Netlify

1. Create a GitHub (or GitLab/Bitbucket) repository.
2. Push this project. `.env` is gitignored so keys stay off Git.
3. In Netlify: **Add new site → Import an existing project** and select that repo.
4. Netlify reads `netlify.toml` (`npm run build`, publish `.next`, Node 20). Do not set a static publish folder like `out`.
5. Before the first deploy, add every variable from `.env.example` in **Site configuration → Environment variables**. Then set:
   - `NEXT_PUBLIC_APP_URL` to `https://your-site.netlify.app` (or your custom domain)
   - `GMAIL_APP_PASSWORD` (Google App Password, not your Gmail login)
   - Leave `NEXT_PUBLIC_APP_URL` blank on Netlify — the HTTPS site URL is applied automatically
   - After deploy, Stripe webhook: `https://your-site.netlify.app/api/webhooks/stripe`
   - `CRON_SECRET` to a long random string
   - `FOREZSHIPS_MOCK=false`
6. Deploy. The build runs Prisma migrations, then `next build`.
7. After the first successful deploy, run courier name seed once from your machine (with production `DATABASE_URL`):

```bash
npx prisma db seed
```

8. In Stripe, add a webhook: `https://your-site.netlify.app/api/webhooks/stripe` for `payment_intent.succeeded` and `payment_intent.payment_failed`. Paste the signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.

Health check: `GET /api/health`

### Neon connection strings

| Env var | Neon connection | Why |
|---|---|---|
| `DATABASE_URL` | **Pooled** (host contains `-pooler`) | Serverless queries on Netlify |
| `DIRECT_URL` | **Direct** (no `-pooler`) | Prisma migrations during build |

Append `?sslmode=require` to both. If `DIRECT_URL` is empty, the app derives it from `DATABASE_URL`.

## Reconciliation

Netlify scheduled function `netlify/functions/reconcile.ts` hits `GET /api/cron/reconcile` every 5 minutes on the production site. Protect it with `CRON_SECRET`.

```bash
npm run reconcile
```

## Tests

```bash
npm test
```

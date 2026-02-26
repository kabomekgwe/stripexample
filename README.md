# Stripe Billing Service (DB-First)

Production-oriented NestJS Stripe integration where your database is the source of truth and Stripe is synchronized as an external processor.

## What is implemented

- Stripe domains: Customers, PaymentIntents, Checkout Sessions, Subscriptions, Invoices, Refunds, Webhooks
- Shared payments utilities:
  - `src/payments/utils/account.util.ts`
  - `src/payments/utils/payment-method-config.util.ts`
- Shared Stripe client provider:
  - `src/stripe-client/stripe-client.service.ts`
- Layered modules with repository/service/controller structure
- Drizzle ORM schema and repositories for internal billing state
- Redis-backed idempotency and webhook/event locks
- Usage-based monthly billing workflow (DB amount -> Stripe invoice item)
- Docker + docker-compose with API, SQLite, Redis

## Key architecture decisions

- DB-first writes: persist internal business intent first, then sync Stripe.
- Idempotent mutation endpoints via `Idempotency-Key` header.
- Webhook dedupe by unique Stripe event ID and Redis distributed lock.
- Keep implementation simple and modular; no microservices split.

## Environment

Copy `.env.example` to `.env` and provide valid Stripe keys.

Required:

- `DATABASE_URL`
- `REDIS_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Swagger (optional):

- `SWAGGER_ENABLED` (`true`/`false`)
- `SWAGGER_PATH` (default `docs`)
- `SWAGGER_DOCS_TOKEN` (optional docs protection token)

## Install and run

```bash
pnpm install
pnpm run build
pnpm run start:dev
```

## Docker

```bash
docker compose up --build
```

Services:

- API: `http://localhost:3000`
- SQLite file: `/app/data/sqlite.db` (inside container)
- Redis: `localhost:6379`

## Main endpoints

- `POST /customers`
- `GET /customers/:id`
- `GET /payments/payment-methods/enabled`
- `GET /payments/payment-methods/policies`
- `PUT /payments/payment-methods/policies`
- `POST /payments/payment-methods/attach`
- `POST /payments/payment-methods/detach`
- `POST /payments/setup-intents`
- `POST /payments/payment-methods/default`
- `GET /payments/customers/:customerId/payment-methods/default`
- `GET /payments/customers/:customerId/payment-methods`
- `POST /payment-intents`
- `GET /payment-intents/:id`
- `POST /checkout/sessions`
- `POST /subscriptions`
- `PATCH /subscriptions/:id`
- `POST /subscriptions/:id/cancel`
- `GET /subscriptions/:id`
- `GET /invoices`
- `GET /invoices/:id`
- `POST /refunds`
- `POST /billing/usage-monthly`
- `POST /webhooks/stripe`
- `GET /health`

## API docs (Swagger)

- UI: `GET /docs` (or your `SWAGGER_PATH`)
- OpenAPI JSON: `GET /docs-json`
- OpenAPI YAML: `GET /docs-yaml`

Production-safe behavior:

- Swagger is on by default in non-production.
- In production, set `SWAGGER_ENABLED=true` to expose docs.
- If `SWAGGER_DOCS_TOKEN` is set, send `x-docs-token` header for docs access.

## Usage-based billing flow

1. Send `POST /billing/usage-monthly` with company usage for `YYYY-MM`.
2. Service stores/upserts usage in DB.
3. Outbox event is created.
4. Scheduled billing processor finalizes usage and creates Stripe invoice item.
5. DB stores Stripe linkage and marks usage as finalized.

## Notes

- This code includes schema definitions but does not include generated migration files yet.
- Recommended next step is to add `drizzle-kit` migration generation and CI migration checks.

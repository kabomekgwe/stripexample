# Stripe Usage Billing Service (DB-First)

Production-oriented NestJS Stripe integration where your database is the source of truth and Stripe is synchronized as an external processor.

## What is implemented

- Stripe domains: Customers, PaymentIntents, Checkout Sessions, Invoices, Refunds, Webhooks, Billing Meters
- Shared payments utilities:
  - `src/payments/utils/account.util.ts`
  - `src/payments/utils/payment-method-config.util.ts`
- Shared Stripe client provider:
  - `src/stripe-client/stripe-client.service.ts`
- Layered modules with repository/service/controller structure
- Drizzle ORM schema and repositories for internal billing state
- Redis-backed idempotency and webhook/event locks
- Usage-based monthly billing workflow (DB amount -> Stripe invoice item)
- Usage-based metering APIs (single and batch meter event ingestion)
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
- `BILLING_EMAIL_WEBHOOK_URL` (optional, for internal invoice email delivery)
- `BILLING_USAGE_METER_EVENT_NAME` (optional, default `monthly_usage`)

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
- `POST /payments/setup-intents/confirm`
- `POST /payments/payment-methods/default`
- `POST /payments/customers/:customerId/payment-methods/flows/attach`
- `POST /payments/customers/:customerId/payment-methods/flows/add-more`
- `GET /payments/customers/:customerId/payment-methods/flows/summary`
- `GET /payments/customers/:customerId/payment-methods/default`
- `GET /payments/customers/:customerId/payment-methods`
- `POST /payment-intents`
- `GET /payment-intents/:id`
- `POST /checkout/sessions`
- `POST /refunds`
- `POST /billing/usage-monthly`
- `GET /billing/usage-monthly/visible`
- `POST /billing/usage-subscription`
- `POST /billing/usage-subscription/batch`
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
4. On the 25th (`0 5 25 * *`), scheduler processes usage rows and writes Stripe meter events.
5. DB stores Stripe meter event linkage and marks usage as finalized.
6. Usage rows become client-visible from next month day one via `GET /billing/usage-monthly/visible`.

For Stripe usage-based subscriptions (meters), call `POST /billing/usage-subscription`.
It writes Stripe Billing Meter Events with payload keys:

- `stripe_customer_id`
- `value`

Use `POST /billing/usage-subscription/batch` to send multiple meter events in one request.

Subscription lifecycle APIs were intentionally removed from routing in favor of usage metering.

## Usage metering request examples

Single meter event:

```json
{
  "eventName": "api_tokens_used",
  "stripeCustomerId": "cus_123456789",
  "value": 2450000,
  "identifier": "usage-evt-2026-02-cus_123456789",
  "timestamp": 1767139200
}
```

Batch meter events:

```json
{
  "continueOnError": true,
  "events": [
    {
      "eventName": "api_tokens_used",
      "stripeCustomerId": "cus_123456789",
      "value": 1200,
      "identifier": "usage-evt-1"
    },
    {
      "eventName": "api_tokens_used",
      "stripeCustomerId": "cus_987654321",
      "value": 980,
      "identifier": "usage-evt-2"
    }
  ]
}
```

## Notes

- Stripe invoice objects still exist for payment accounting, but customer-facing invoice emails are emitted from this API.
- Configure `BILLING_EMAIL_WEBHOOK_URL` to receive invoice email events from outbox topics:
  - `billing.invoice-issued`
  - `billing.invoice-paid`
  - `billing.invoice-payment-failed`
- Disable Stripe customer invoice emails in Stripe Dashboard to avoid duplicate customer notifications.

## Stripe dashboard setup checklist

1. Create Billing Meter(s) in Stripe and set mapping keys:
   - Customer key: `stripe_customer_id`
   - Value key: `value`
   - Meter event name should match `BILLING_USAGE_METER_EVENT_NAME` (default `monthly_usage`)
2. Ensure your pricing model is configured to consume meter usage for invoicing.
3. Configure webhook endpoint to this API (`POST /webhooks/stripe`) and subscribe to at least:
   - `invoice.finalized`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.*`
   - `setup_intent.*`
   - `payment_method.*`
4. Disable Stripe customer-facing invoice/subscription emails to avoid duplicate sends.
5. Set `BILLING_EMAIL_WEBHOOK_URL` so this API can forward invoice email events to your internal mail service.

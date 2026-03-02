# ARCHITECTURE_GOVERNANCE.md

## 1. Coding Standards
- **Strict TypeScript**: `strict: true` must remain enabled in all `tsconfig.json` files.
- **Clean Code**: Follow SOLID principles. Keep functions small and focused.
- **Naming**: Use descriptive, domain-aligned names (e.g., `billingPaymentIntents` instead of `payments`).

## 2. Module Boundaries
- **Encapsulation**: Domain modules should only expose what is necessary via their Module's `exports`.
- **Dependency Flow**: Avoid circular dependencies. Infrastructure should depend on nothing; Domain should depend on Infrastructure; Controllers should depend on Domain.

## 3. API Design
- **Versioning**: Not currently implemented, but plan for `/v1/` prefixing for future public-facing endpoints.
- **Idempotency**: All mutations must support idempotency where applicable.
- **Validation**: Every DTO must use `class-validator` decorators. Use Zod for runtime schema validation on external data.

## 4. Database Governance
- **Migrations**: All schema changes must be implemented via `drizzle-kit generate` and checked into source control.
- **Indexes**: Proactively add indexes for frequently queried columns (IDs, Status fields, Foreign Keys).

## 5. Security & Compliance
- **PCI Compliance**: Never log or store raw credit card data. Rely entirely on Stripe tokens/IDs.
- **Secrets Management**: Use `.env` files for local development. Use production secrets manager for deployments.
- **Audit Logs**: Ensure all critical billing changes are logged in the `stripe_webhook_events` or `integration_outbox` tables.

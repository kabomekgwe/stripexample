import { randomUUID } from 'node:crypto';
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const idColumn = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID());

const timestampColumn = (name: string) =>
  integer(name, { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date());

const optionalTimestampColumn = (name: string) =>
  integer(name, { mode: 'timestamp_ms' });

export const billingCustomers = sqliteTable(
  'billing_customers',
  {
    id: idColumn(),
    userId: text('user_id'),
    email: text('email').notNull(),
    stripeCustomerId: text('stripe_customer_id'),
    syncStatus: text('sync_status').notNull().default('pending'),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
  },
  (table) => [uniqueIndex('billing_customers_email_idx').on(table.email)],
);

export const billingPaymentIntents = sqliteTable('billing_payment_intents', {
  id: idColumn(),
  customerId: text('customer_id').notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull(),
  status: text('status').notNull().default('requires_payment_method'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  createdAt: timestampColumn('created_at'),
  updatedAt: timestampColumn('updated_at'),
});

export const billingSubscriptions = sqliteTable('billing_subscriptions', {
  id: idColumn(),
  customerId: text('customer_id').notNull(),
  planCode: text('plan_code').notNull(),
  status: text('status').notNull().default('pending'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  currentPeriodStart: optionalTimestampColumn('current_period_start'),
  currentPeriodEnd: optionalTimestampColumn('current_period_end'),
  canceledAt: optionalTimestampColumn('canceled_at'),
  createdAt: timestampColumn('created_at'),
  updatedAt: timestampColumn('updated_at'),
});

export const billingCheckoutSessions = sqliteTable(
  'billing_checkout_sessions',
  {
    id: idColumn(),
    customerId: text('customer_id').notNull(),
    mode: text('mode').notNull(),
    successUrl: text('success_url').notNull(),
    cancelUrl: text('cancel_url').notNull(),
    stripeCheckoutSessionId: text('stripe_checkout_session_id'),
    status: text('status').notNull().default('pending'),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
  },
);

export const billingInvoices = sqliteTable('billing_invoices', {
  id: idColumn(),
  subscriptionId: text('subscription_id'),
  stripeInvoiceId: text('stripe_invoice_id'),
  amountDueCents: integer('amount_due_cents').notNull().default(0),
  amountPaidCents: integer('amount_paid_cents').notNull().default(0),
  currency: text('currency').notNull().default('usd'),
  status: text('status').notNull().default('draft'),
  invoiceUrl: text('invoice_url'),
  createdAt: timestampColumn('created_at'),
  updatedAt: timestampColumn('updated_at'),
});

export const billingRefunds = sqliteTable('billing_refunds', {
  id: idColumn(),
  paymentIntentId: text('payment_intent_id').notNull(),
  amountCents: integer('amount_cents').notNull(),
  reason: text('reason'),
  status: text('status').notNull().default('pending'),
  stripeRefundId: text('stripe_refund_id'),
  createdAt: timestampColumn('created_at'),
  updatedAt: timestampColumn('updated_at'),
});

export const billingUsageMonthly = sqliteTable(
  'billing_usage_monthly',
  {
    id: idColumn(),
    billingPeriod: text('billing_period').notNull(),
    usageQuantity: integer('usage_quantity').notNull().default(0),
    unitPriceCents: integer('unit_price_cents').notNull().default(0),
    amountCents: integer('amount_cents').notNull().default(0),
    finalized: integer('finalized', { mode: 'boolean' })
      .notNull()
      .default(false),
    stripeInvoiceItemId: text('stripe_invoice_item_id'),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
  },
  (table) => [
    uniqueIndex('billing_usage_monthly_period_idx').on(table.billingPeriod),
  ],
);

export const stripeWebhookEvents = sqliteTable('stripe_webhook_events', {
  id: idColumn(),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  type: text('type').notNull(),
  status: text('status').notNull().default('received'),
  payload: text('payload', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull(),
  lastError: text('last_error'),
  attemptCount: integer('attempt_count').notNull().default(0),
  createdAt: timestampColumn('created_at'),
  updatedAt: timestampColumn('updated_at'),
});

export const integrationOutbox = sqliteTable('integration_outbox', {
  id: idColumn(),
  topic: text('topic').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  payload: text('payload', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull(),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  nextRunAt: timestampColumn('next_run_at'),
  lastError: text('last_error'),
  createdAt: timestampColumn('created_at'),
  updatedAt: timestampColumn('updated_at'),
});

export const schema = {
  billingCustomers,
  billingPaymentIntents,
  billingSubscriptions,
  billingCheckoutSessions,
  billingInvoices,
  billingRefunds,
  billingUsageMonthly,
  stripeWebhookEvents,
  integrationOutbox,
};

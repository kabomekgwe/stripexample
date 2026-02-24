import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const billingCustomers = pgTable(
  'billing_customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: varchar('user_id', { length: 128 }),
    email: varchar('email', { length: 320 }).notNull(),
    stripeCustomerId: varchar('stripe_customer_id', { length: 128 }),
    syncStatus: varchar('sync_status', { length: 32 })
      .notNull()
      .default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex('billing_customers_email_idx').on(table.email)],
);

export const billingPaymentIntents = pgTable('billing_payment_intents', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull(),
  amountCents: integer('amount_cents').notNull(),
  currency: varchar('currency', { length: 8 }).notNull(),
  status: varchar('status', { length: 32 })
    .notNull()
    .default('requires_payment_method'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const billingSubscriptions = pgTable('billing_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull(),
  planCode: varchar('plan_code', { length: 64 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 128 }),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const billingCheckoutSessions = pgTable('billing_checkout_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull(),
  mode: varchar('mode', { length: 32 }).notNull(),
  successUrl: text('success_url').notNull(),
  cancelUrl: text('cancel_url').notNull(),
  stripeCheckoutSessionId: varchar('stripe_checkout_session_id', {
    length: 128,
  }),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const billingInvoices = pgTable('billing_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  subscriptionId: uuid('subscription_id'),
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 128 }),
  amountDueCents: integer('amount_due_cents').notNull().default(0),
  amountPaidCents: integer('amount_paid_cents').notNull().default(0),
  currency: varchar('currency', { length: 8 }).notNull().default('usd'),
  status: varchar('status', { length: 32 }).notNull().default('draft'),
  invoiceUrl: text('invoice_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const billingRefunds = pgTable('billing_refunds', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentIntentId: uuid('payment_intent_id').notNull(),
  amountCents: integer('amount_cents').notNull(),
  reason: varchar('reason', { length: 64 }),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  stripeRefundId: varchar('stripe_refund_id', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const billingUsageMonthly = pgTable(
  'billing_usage_monthly',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    billingPeriod: varchar('billing_period', { length: 7 }).notNull(),
    usageQuantity: integer('usage_quantity').notNull().default(0),
    unitPriceCents: integer('unit_price_cents').notNull().default(0),
    amountCents: integer('amount_cents').notNull().default(0),
    finalized: boolean('finalized').notNull().default(false),
    stripeInvoiceItemId: varchar('stripe_invoice_item_id', { length: 128 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('billing_usage_monthly_period_idx').on(table.billingPeriod),
  ],
);

export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  stripeEventId: varchar('stripe_event_id', { length: 128 }).notNull().unique(),
  type: varchar('type', { length: 120 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('received'),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  lastError: text('last_error'),
  attemptCount: integer('attempt_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const integrationOutbox = pgTable('integration_outbox', {
  id: uuid('id').defaultRandom().primaryKey(),
  topic: varchar('topic', { length: 128 }).notNull(),
  aggregateId: varchar('aggregate_id', { length: 128 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  nextRunAt: timestamp('next_run_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
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

import { randomUUID } from 'node:crypto';
import {
  index,
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
  (table) => [
    uniqueIndex('billing_customers_email_idx').on(table.email),
    uniqueIndex('billing_customers_stripe_customer_id_idx').on(
      table.stripeCustomerId,
    ),
  ],
);

export const billingPaymentIntents = sqliteTable(
  'billing_payment_intents',
  {
    id: idColumn(),
    customerId: text('customer_id').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull(),
    status: text('status').notNull().default('requires_payment_method'),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
  },
  (table) => [
    uniqueIndex('billing_payment_intents_stripe_payment_intent_id_idx').on(
      table.stripePaymentIntentId,
    ),
  ],
);

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
  (table) => [
    uniqueIndex('billing_checkout_sessions_stripe_checkout_session_id_idx').on(
      table.stripeCheckoutSessionId,
    ),
  ],
);

export const billingInvoices = sqliteTable(
  'billing_invoices',
  {
    id: idColumn(),
    stripeInvoiceId: text('stripe_invoice_id'),
    amountDueCents: integer('amount_due_cents').notNull().default(0),
    amountPaidCents: integer('amount_paid_cents').notNull().default(0),
    currency: text('currency').notNull().default('usd'),
    status: text('status').notNull().default('draft'),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
  },
  (table) => [
    uniqueIndex('billing_invoices_stripe_invoice_id_idx').on(
      table.stripeInvoiceId,
    ),
  ],
);

export const billingRefunds = sqliteTable(
  'billing_refunds',
  {
    id: idColumn(),
    paymentIntentId: text('payment_intent_id').notNull(),
    amountCents: integer('amount_cents').notNull(),
    reason: text('reason'),
    status: text('status').notNull().default('pending'),
    stripeRefundId: text('stripe_refund_id'),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
  },
  (table) => [
    uniqueIndex('billing_refunds_stripe_refund_id_idx').on(
      table.stripeRefundId,
    ),
  ],
);

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

export const integrationOutbox = sqliteTable(
  'integration_outbox',
  {
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
  },
  (table) => [
    index('integration_outbox_status_next_run_at_aggregate_id_idx').on(
      table.status,
      table.nextRunAt,
      table.aggregateId,
    ),
  ],
);

export const billingPaymentMethodPolicies = sqliteTable(
  'billing_payment_method_policies',
  {
    id: idColumn(),
    paymentMethodType: text('payment_method_type').notNull(),
    currency: text('currency').notNull().default(''),
    country: text('country').notNull().default(''),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    priority: integer('priority').notNull().default(100),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
  },
  (table) => [
    uniqueIndex('billing_payment_method_policies_scope_idx').on(
      table.paymentMethodType,
      table.currency,
      table.country,
    ),
    index('billing_payment_method_policies_type_priority_enabled_idx').on(
      table.paymentMethodType,
      table.priority,
      table.enabled,
    ),
  ],
);

export const billingSetupIntents = sqliteTable(
  'billing_setup_intents',
  {
    id: idColumn(),
    stripeSetupIntentId: text('stripe_setup_intent_id').notNull().unique(),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    stripePaymentMethodId: text('stripe_payment_method_id'),
    status: text('status').notNull(),
    usage: text('usage'),
    lastSetupError: text('last_setup_error'),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
  },
  (table) => [
    index('billing_setup_intents_customer_created_at_idx').on(
      table.stripeCustomerId,
      table.createdAt,
    ),
    index('billing_setup_intents_payment_method_id_idx').on(
      table.stripePaymentMethodId,
    ),
  ],
);

export const billingCustomerPaymentMethods = sqliteTable(
  'billing_customer_payment_methods',
  {
    id: idColumn(),
    customerId: text('customer_id'),
    stripeCustomerId: text('stripe_customer_id'),
    stripePaymentMethodId: text('stripe_payment_method_id').notNull().unique(),
    type: text('type').notNull(),
    status: text('status').notNull().default('attached'),
    isDefault: integer('is_default', { mode: 'boolean' })
      .notNull()
      .default(false),
    mandateId: text('mandate_id'),
    details: text('details', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
  },
  (table) => [
    uniqueIndex('billing_customer_payment_methods_scope_idx').on(
      table.stripeCustomerId,
      table.stripePaymentMethodId,
    ),
    index('billing_customer_payment_methods_customer_default_status_idx').on(
      table.stripeCustomerId,
      table.isDefault,
      table.status,
    ),
  ],
);

export const schema = {
  billingCustomers,
  billingPaymentIntents,
  billingCheckoutSessions,
  billingInvoices,
  billingRefunds,
  billingUsageMonthly,
  stripeWebhookEvents,
  integrationOutbox,
  billingPaymentMethodPolicies,
  billingSetupIntents,
  billingCustomerPaymentMethods,
};

CREATE TABLE `billing_checkout_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`mode` text NOT NULL,
	`success_url` text NOT NULL,
	`cancel_url` text NOT NULL,
	`stripe_checkout_session_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_customer_payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`stripe_customer_id` text,
	`stripe_payment_method_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'attached' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`mandate_id` text,
	`details` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_customer_payment_methods_stripe_payment_method_id_unique` ON `billing_customer_payment_methods` (`stripe_payment_method_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `billing_customer_payment_methods_scope_idx` ON `billing_customer_payment_methods` (`stripe_customer_id`,`stripe_payment_method_id`);--> statement-breakpoint
CREATE TABLE `billing_customers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`stripe_customer_id` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_customers_email_idx` ON `billing_customers` (`email`);--> statement-breakpoint
CREATE TABLE `billing_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text,
	`stripe_invoice_id` text,
	`amount_due_cents` integer DEFAULT 0 NOT NULL,
	`amount_paid_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`invoice_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_payment_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text DEFAULT 'requires_payment_method' NOT NULL,
	`stripe_payment_intent_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_payment_method_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_method_type` text NOT NULL,
	`currency` text DEFAULT '' NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`priority` integer DEFAULT 100 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_payment_method_policies_scope_idx` ON `billing_payment_method_policies` (`payment_method_type`,`currency`,`country`);--> statement-breakpoint
CREATE TABLE `billing_refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_intent_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`stripe_refund_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_setup_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`stripe_setup_intent_id` text NOT NULL,
	`stripe_customer_id` text NOT NULL,
	`stripe_payment_method_id` text,
	`status` text NOT NULL,
	`usage` text,
	`last_setup_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_setup_intents_stripe_setup_intent_id_unique` ON `billing_setup_intents` (`stripe_setup_intent_id`);--> statement-breakpoint
CREATE TABLE `billing_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`plan_code` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`stripe_subscription_id` text,
	`current_period_start` integer,
	`current_period_end` integer,
	`canceled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_usage_monthly` (
	`id` text PRIMARY KEY NOT NULL,
	`billing_period` text NOT NULL,
	`usage_quantity` integer DEFAULT 0 NOT NULL,
	`unit_price_cents` integer DEFAULT 0 NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`finalized` integer DEFAULT false NOT NULL,
	`stripe_invoice_item_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_usage_monthly_period_idx` ON `billing_usage_monthly` (`billing_period`);--> statement-breakpoint
CREATE TABLE `integration_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`aggregate_id` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_run_at` integer NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stripe_webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`stripe_event_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`payload` text NOT NULL,
	`last_error` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_webhook_events_stripe_event_id_unique` ON `stripe_webhook_events` (`stripe_event_id`);
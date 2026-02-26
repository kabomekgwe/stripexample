CREATE UNIQUE INDEX `billing_checkout_sessions_stripe_checkout_session_id_idx` ON `billing_checkout_sessions` (`stripe_checkout_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `billing_customers_stripe_customer_id_idx` ON `billing_customers` (`stripe_customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `billing_invoices_stripe_invoice_id_idx` ON `billing_invoices` (`stripe_invoice_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `billing_payment_intents_stripe_payment_intent_id_idx` ON `billing_payment_intents` (`stripe_payment_intent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `billing_refunds_stripe_refund_id_idx` ON `billing_refunds` (`stripe_refund_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `billing_setup_intents_customer_created_at_idx` ON `billing_setup_intents` (`stripe_customer_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `billing_subscriptions_stripe_subscription_id_idx` ON `billing_subscriptions` (`stripe_subscription_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `integration_outbox_status_next_run_at_aggregate_id_idx` ON `integration_outbox` (`status`,`next_run_at`,`aggregate_id`);
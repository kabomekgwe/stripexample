DROP INDEX `billing_setup_intents_customer_created_at_idx`;--> statement-breakpoint
CREATE INDEX `billing_setup_intents_payment_method_id_idx` ON `billing_setup_intents` (`stripe_payment_method_id`);--> statement-breakpoint
CREATE INDEX `billing_setup_intents_customer_created_at_idx` ON `billing_setup_intents` (`stripe_customer_id`,`created_at`);--> statement-breakpoint
DROP INDEX `integration_outbox_status_next_run_at_aggregate_id_idx`;--> statement-breakpoint
CREATE INDEX `integration_outbox_status_next_run_at_aggregate_id_idx` ON `integration_outbox` (`status`,`next_run_at`,`aggregate_id`);--> statement-breakpoint
CREATE INDEX `billing_customer_payment_methods_customer_default_status_idx` ON `billing_customer_payment_methods` (`stripe_customer_id`,`is_default`,`status`);--> statement-breakpoint
CREATE INDEX `billing_payment_method_policies_type_priority_enabled_idx` ON `billing_payment_method_policies` (`payment_method_type`,`priority`,`enabled`);
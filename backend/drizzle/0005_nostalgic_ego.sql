PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_billing_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`stripe_invoice_id` text,
	`amount_due_cents` integer DEFAULT 0 NOT NULL,
	`amount_paid_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'gbp' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_billing_invoices`("id", "stripe_invoice_id", "amount_due_cents", "amount_paid_cents", "currency", "status", "created_at", "updated_at") SELECT "id", "stripe_invoice_id", "amount_due_cents", "amount_paid_cents", "currency", "status", "created_at", "updated_at" FROM `billing_invoices`;--> statement-breakpoint
DROP TABLE `billing_invoices`;--> statement-breakpoint
ALTER TABLE `__new_billing_invoices` RENAME TO `billing_invoices`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `billing_invoices_stripe_invoice_id_idx` ON `billing_invoices` (`stripe_invoice_id`);
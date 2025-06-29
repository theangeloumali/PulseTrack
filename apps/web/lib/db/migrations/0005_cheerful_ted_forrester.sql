ALTER TABLE "company_billing_settings" ADD COLUMN "currency" text DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "company_billing_settings" DROP COLUMN "default_hourly_rate";--> statement-breakpoint
ALTER TABLE "company_billing_settings" DROP COLUMN "default_currency";
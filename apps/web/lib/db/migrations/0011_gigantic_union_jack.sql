ALTER TABLE "company_billing_settings" ADD COLUMN "company_logo_url" text;--> statement-breakpoint
ALTER TABLE "company_billing_settings" ADD COLUMN "company_address" text;--> statement-breakpoint
ALTER TABLE "company_billing_settings" ADD COLUMN "company_phone" text;--> statement-breakpoint
ALTER TABLE "company_billing_settings" ADD COLUMN "company_email" text;--> statement-breakpoint
ALTER TABLE "company_billing_settings" ADD COLUMN "company_website" text;--> statement-breakpoint
ALTER TABLE "company_billing_settings" ADD COLUMN "invoice_footer" text;--> statement-breakpoint
ALTER TABLE "company_billing_settings" ADD COLUMN "brand_primary_color" text DEFAULT '#3b82f6';--> statement-breakpoint
ALTER TABLE "company_billing_settings" ADD COLUMN "brand_secondary_color" text DEFAULT '#64748b';
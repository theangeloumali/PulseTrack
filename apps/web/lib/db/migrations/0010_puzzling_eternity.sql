CREATE TABLE "payment_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billing_period_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "billing_periods" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_periods" ADD COLUMN "payment_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "billing_periods" ADD COLUMN "invoice_sent_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_periods" ADD COLUMN "payment_due_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_periods" ADD COLUMN "payment_received_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_periods" ADD COLUMN "payment_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "billing_periods" ADD COLUMN "payment_reference" text;--> statement-breakpoint
ALTER TABLE "billing_periods" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_billing_period_id_billing_periods_id_fk" FOREIGN KEY ("billing_period_id") REFERENCES "public"."billing_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_history_billing_period_id_idx" ON "payment_history" USING btree ("billing_period_id");--> statement-breakpoint
CREATE INDEX "payment_history_user_id_idx" ON "payment_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_history_action_idx" ON "payment_history" USING btree ("action");--> statement-breakpoint
CREATE INDEX "payment_history_created_at_idx" ON "payment_history" USING btree ("created_at");
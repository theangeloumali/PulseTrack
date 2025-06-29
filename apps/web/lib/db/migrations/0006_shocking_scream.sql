CREATE TABLE "ticket_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "time_entries" ALTER COLUMN "duration" SET DATA TYPE numeric(8, 2);--> statement-breakpoint
ALTER TABLE "time_entry_billing" ALTER COLUMN "is_billable" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "time_entry_billing" ALTER COLUMN "is_billable" SET DATA TYPE boolean USING 
  CASE 
    WHEN "is_billable"::text = 'true' THEN TRUE 
    WHEN "is_billable"::text = 't' THEN TRUE 
    WHEN "is_billable"::text = '1' THEN TRUE 
    WHEN "is_billable"::text = 'TRUE' THEN TRUE 
    ELSE FALSE 
  END;--> statement-breakpoint
ALTER TABLE "time_entry_billing" ALTER COLUMN "is_billable" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_history_ticket_id_idx" ON "ticket_history" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_history_user_id_idx" ON "ticket_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ticket_history_field_name_idx" ON "ticket_history" USING btree ("field_name");--> statement-breakpoint
CREATE INDEX "ticket_history_created_at_idx" ON "ticket_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "billing_periods_company_id_idx" ON "billing_periods" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "billing_periods_status_idx" ON "billing_periods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_periods_frequency_idx" ON "billing_periods" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX "billing_periods_start_date_idx" ON "billing_periods" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "billing_periods_end_date_idx" ON "billing_periods" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "billing_rates_company_id_idx" ON "billing_rates" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "billing_rates_user_id_idx" ON "billing_rates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "billing_rates_project_id_idx" ON "billing_rates" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "billing_rates_effective_from_idx" ON "billing_rates" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "billing_rates_effective_to_idx" ON "billing_rates" USING btree ("effective_to");--> statement-breakpoint
CREATE INDEX "comments_ticket_id_idx" ON "comments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "comments_user_id_idx" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comments_created_at_idx" ON "comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "companies_name_idx" ON "companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "companies_slug_idx" ON "companies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "company_billing_settings_company_id_idx" ON "company_billing_settings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "project_members_project_id_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_user_id_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_company_id_idx" ON "projects" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "projects_owner_id_idx" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_name_idx" ON "projects" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tickets_project_id_idx" ON "tickets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tickets_assignee_id_idx" ON "tickets" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "tickets_reporter_id_idx" ON "tickets" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_priority_idx" ON "tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tickets_due_date_idx" ON "tickets" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "tickets_title_idx" ON "tickets" USING btree ("title");--> statement-breakpoint
CREATE INDEX "time_entries_ticket_id_idx" ON "time_entries" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "time_entries_user_id_idx" ON "time_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time_entries_start_time_idx" ON "time_entries" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "time_entries_created_at_idx" ON "time_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "time_entry_billing_time_entry_id_idx" ON "time_entry_billing" USING btree ("time_entry_id");--> statement-breakpoint
CREATE INDEX "time_entry_billing_billing_period_id_idx" ON "time_entry_billing" USING btree ("billing_period_id");--> statement-breakpoint
CREATE INDEX "time_entry_billing_is_billable_idx" ON "time_entry_billing" USING btree ("is_billable");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_company_id_idx" ON "users" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");
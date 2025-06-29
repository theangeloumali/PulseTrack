ALTER TABLE "comments" DROP CONSTRAINT "comments_ticket_id_tickets_id_fk";
--> statement-breakpoint
ALTER TABLE "ticket_history" DROP CONSTRAINT "ticket_history_ticket_id_tickets_id_fk";
--> statement-breakpoint
ALTER TABLE "time_entries" DROP CONSTRAINT "time_entries_ticket_id_tickets_id_fk";
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tickets_deleted_at_idx" ON "tickets" USING btree ("deleted_at");
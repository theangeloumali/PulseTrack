-- Drizzle Migration: Initial Schema
-- Created using Drizzle Kit

-- Create enums
DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('admin', 'manager', 'user');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "project_status" AS ENUM('active', 'archived', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "ticket_status" AS ENUM('new', 'in_progress', 'review', 'done');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "ticket_priority" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create companies table
CREATE TABLE IF NOT EXISTS "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'user',
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_company_id_unique" UNIQUE("email","company_id")
);

-- Create projects table
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'active',
	"company_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "ticket_status" DEFAULT 'new',
	"priority" "ticket_priority" DEFAULT 'medium',
	"project_id" uuid NOT NULL,
	"assignee_id" uuid,
	"reporter_id" uuid NOT NULL,
	"estimated_hours" integer,
	"actual_hours" integer,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"duration" integer,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create comments table
CREATE TABLE IF NOT EXISTS "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "time_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for companies
CREATE POLICY "Users can view their own company" ON "companies" FOR SELECT USING (
    id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
);

CREATE POLICY "Admins can update their company" ON "companies" FOR UPDATE USING (
    id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Authenticated users can create companies" ON "companies" FOR INSERT 
TO authenticated WITH CHECK (true);

-- Create RLS policies for users
CREATE POLICY "Users can view users in their company" ON "users" FOR SELECT USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update their own profile" ON "users" FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage users in their company" ON "users" FOR ALL USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "Users can create their own user record" ON "users" FOR INSERT 
TO authenticated WITH CHECK (id = auth.uid());

-- Create RLS policies for projects
CREATE POLICY "Users can view projects in their company" ON "projects" FOR SELECT USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can create projects in their company" ON "projects" FOR INSERT 
TO authenticated WITH CHECK (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
);

CREATE POLICY "Project owners and admins can update projects" ON "projects" FOR UPDATE USING (
    owner_id = auth.uid() OR 
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "Admins can delete projects in their company" ON "projects" FOR DELETE USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Create RLS policies for tickets
CREATE POLICY "Users can view tickets in their company projects" ON "tickets" FOR SELECT USING (
    project_id IN (
        SELECT id FROM projects WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can create tickets in their company projects" ON "tickets" FOR INSERT 
TO authenticated WITH CHECK (
    project_id IN (
        SELECT id FROM projects WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update tickets they created or are assigned to" ON "tickets" FOR UPDATE USING (
    reporter_id = auth.uid() OR 
    assignee_id = auth.uid() OR
    project_id IN (
        SELECT id FROM projects WHERE 
        owner_id = auth.uid() OR 
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    )
);

-- Create RLS policies for time_entries
CREATE POLICY "Users can view time entries for tickets in their company" ON "time_entries" FOR SELECT USING (
    ticket_id IN (
        SELECT id FROM tickets WHERE project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    )
);

CREATE POLICY "Users can create their own time entries" ON "time_entries" FOR INSERT 
TO authenticated WITH CHECK (
    user_id = auth.uid() AND
    ticket_id IN (
        SELECT id FROM tickets WHERE project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    )
);

CREATE POLICY "Users can update their own time entries" ON "time_entries" FOR UPDATE USING (user_id = auth.uid());

-- Create RLS policies for comments
CREATE POLICY "Users can view comments on tickets in their company" ON "comments" FOR SELECT USING (
    ticket_id IN (
        SELECT id FROM tickets WHERE project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    )
);

CREATE POLICY "Users can create comments on tickets in their company" ON "comments" FOR INSERT 
TO authenticated WITH CHECK (
    user_id = auth.uid() AND
    ticket_id IN (
        SELECT id FROM tickets WHERE project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    )
);

CREATE POLICY "Users can update their own comments" ON "comments" FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON "comments" FOR DELETE USING (user_id = auth.uid());

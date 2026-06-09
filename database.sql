-- Create enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('active', 'archived', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('new', 'in_progress', 'review', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(email, company_id)
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status project_status DEFAULT 'active',
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status ticket_status DEFAULT 'new',
    priority ticket_priority DEFAULT 'medium',
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
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
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for companies
CREATE POLICY "Users can view their own company" ON companies FOR SELECT USING (
    id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
);

CREATE POLICY "Admins can update their company" ON companies FOR UPDATE USING (
    id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow authenticated users to create companies (for signup)
CREATE POLICY "Authenticated users can create companies" ON companies FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
);

-- Create RLS policies for users
CREATE POLICY "Users can view users in their company" ON users FOR SELECT USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage users in their company" ON users FOR ALL USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Allow authenticated users to create their own user record (for signup)
CREATE POLICY "Users can create their own record" ON users FOR INSERT WITH CHECK (
    auth.uid() = id
);

-- Create RLS policies for projects
CREATE POLICY "Users can view projects in their company" ON projects FOR SELECT USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can create projects in their company" ON projects FOR INSERT WITH CHECK (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
);

CREATE POLICY "Project creators and managers can update projects" ON projects FOR UPDATE USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND (role IN ('admin', 'manager') OR id = created_by)
    )
);

-- Create RLS policies for tickets
CREATE POLICY "Users can view tickets in their company projects" ON tickets FOR SELECT USING (
    project_id IN (
        SELECT p.id FROM projects p
        JOIN users u ON p.company_id = u.company_id
        WHERE u.id = auth.uid()
    )
);

CREATE POLICY "Users can create tickets in their company projects" ON tickets FOR INSERT WITH CHECK (
    project_id IN (
        SELECT p.id FROM projects p
        JOIN users u ON p.company_id = u.company_id
        WHERE u.id = auth.uid()
    )
);

CREATE POLICY "Users can update tickets they created or are assigned to" ON tickets FOR UPDATE USING (
    created_by = auth.uid() OR assigned_to = auth.uid() OR
    project_id IN (
        SELECT p.id FROM projects p
        JOIN users u ON p.company_id = u.company_id
        WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
    )
);

-- Create RLS policies for time_entries
CREATE POLICY "Users can view their own time entries" ON time_entries FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own time entries" ON time_entries FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    ticket_id IN (
        SELECT t.id FROM tickets t
        JOIN projects p ON t.project_id = p.id
        JOIN users u ON p.company_id = u.company_id
        WHERE u.id = auth.uid()
    )
);

CREATE POLICY "Users can update their own time entries" ON time_entries FOR UPDATE USING (user_id = auth.uid());

-- Create RLS policies for comments
CREATE POLICY "Users can view comments on tickets in their company" ON comments FOR SELECT USING (
    ticket_id IN (
        SELECT t.id FROM tickets t
        JOIN projects p ON t.project_id = p.id
        JOIN users u ON p.company_id = u.company_id
        WHERE u.id = auth.uid()
    )
);

CREATE POLICY "Users can create comments on tickets in their company" ON comments FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    ticket_id IN (
        SELECT t.id FROM tickets t
        JOIN projects p ON t.project_id = p.id
        JOIN users u ON p.company_id = u.company_id
        WHERE u.id = auth.uid()
    )
);

CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project_id ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_time_entries_ticket_id ON time_entries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON comments(ticket_id);

-- Note: User creation is handled client-side through the ensureUserRecord function
-- This approach is more reliable and easier to debug than database triggers

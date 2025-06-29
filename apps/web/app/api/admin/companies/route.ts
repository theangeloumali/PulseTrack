import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { createServerClient } from '@supabase/ssr';

async function handler(req: NextRequest) {
  if (req.method === 'GET') {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return req.cookies.getAll();
            },
            setAll() {
              // No-op for read-only operations
            },
          },
        }
      );

      // Get all companies with user counts and other statistics
      const { data: companies, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          slug,
          created_at,
          updated_at,
          users:users(count),
          projects:projects(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching companies:', error);
        return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
      }

      // Get detailed statistics for each company
      const companiesWithStats = await Promise.all(
        (companies || []).map(async (company) => {
          // Get user statistics
          const { data: userStats } = await supabase
            .from('users')
            .select('role, status')
            .eq('company_id', company.id);

          // Get project statistics
          const { data: projectStats } = await supabase
            .from('projects')
            .select('status')
            .eq('company_id', company.id);

          // Get ticket statistics
          const { data: ticketStats } = await supabase
            .from('tickets')
            .select('status, projects!inner(company_id)')
            .eq('projects.company_id', company.id);

          return {
            ...company,
            stats: {
              users: {
                total: userStats?.length || 0,
                active: userStats?.filter(u => u.status === 'active').length || 0,
                admins: userStats?.filter(u => ['super_admin', 'system_admin', 'company_admin'].includes(u.role)).length || 0,
              },
              projects: {
                total: projectStats?.length || 0,
                active: projectStats?.filter(p => p.status === 'active').length || 0,
              },
              tickets: {
                total: ticketStats?.length || 0,
                inProgress: ticketStats?.filter(t => t.status === 'in_progress').length || 0,
                done: ticketStats?.filter(t => t.status === 'done').length || 0,
              }
            }
          };
        })
      );

      return NextResponse.json(companiesWithStats);
    } catch (error) {
      console.error('Super admin companies API error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: `Method ${req.method} Not Allowed` }, { status: 405 });
}

// Only super_admins can access this endpoint
export const GET = withAuth(handler, ['super_admin']);
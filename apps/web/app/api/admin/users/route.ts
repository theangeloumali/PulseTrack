import {NextRequest, NextResponse} from 'next/server';
import {withAuth} from '@/lib/auth-utils';
import {createServerClient} from '@supabase/ssr';

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
        },
      );

      // Get all users across all companies with company information
      const {data: users, error} = await supabase
        .from('users')
        .select(
          `
          id,
          email,
          first_name,
          last_name,
          role,
          status,
          hourly_rate,
          invited_by,
          invited_at,
          created_at,
          updated_at,
          companies:company_id (
            id,
            name,
            slug
          )
        `,
        )
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({error: 'Failed to fetch users'}, {status: 500});
      }

      return NextResponse.json(users);
    } catch (error) {
      console.error('Super admin users API error:', error);
      return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
  }

  return NextResponse.json({error: `Method ${req.method} Not Allowed`}, {status: 405});
}

// Only super_admins can access this endpoint
export const GET = withAuth(handler, ['super_admin']);

import {NextRequest, NextResponse} from 'next/server';
import {withAuth} from '@/lib/auth-utils';
import {createServerClient} from '@supabase/ssr';
import {z} from 'zod';

const queryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

async function handler(req: NextRequest) {
  if (req.method === 'GET') {
    try {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const parsed = queryParamsSchema.safeParse(searchParams);

      if (!parsed.success) {
        return NextResponse.json(
          {error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors},
          {status: 400},
        );
      }

      const {page, limit} = parsed.data;
      const offset = (page - 1) * limit;

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
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

      // Get paginated users - hourly_rate intentionally excluded (sensitive salary data)
      const {
        data: users,
        error,
        count,
      } = await supabase
        .from('users')
        .select(
          `
          id,
          email,
          first_name,
          last_name,
          role,
          status,
          invited_by,
          invited_at,
          created_at,
          updated_at,
          company:companies!users_company_id_companies_id_fk (
            id,
            name,
            slug
          )
        `,
          {count: 'exact'},
        )
        .order('created_at', {ascending: false})
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({error: 'Failed to fetch users'}, {status: 500});
      }

      return NextResponse.json({
        data: users,
        pagination: {
          page,
          limit,
          total: count ?? 0,
          totalPages: count ? Math.ceil(count / limit) : 0,
        },
      });
    } catch (error) {
      console.error('Super admin users API error:', error);
      return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
  }

  return NextResponse.json({error: `Method ${req.method} Not Allowed`}, {status: 405});
}

// Only super_admins can access this endpoint
export const GET = withAuth(handler, ['super_admin']);

import {NextRequest, NextResponse} from 'next/server';
import {withAuth} from '@/lib/auth-utils';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

async function handler(req: NextRequest, context: {params: Promise<{id: string}>}) {
  const {id: companyId} = await context.params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({name, value, options}) => cookieStore.set(name, value, options));
          } catch {
            // Cookies can only be set in server actions or Route Handlers
          }
        },
      },
    },
  );

  // Get the authenticated user
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  if (req.method === 'POST') {
    // Archive company
    try {
      const {error} = await supabase.rpc('archive_company', {
        p_company_id: companyId,
        p_archived_by: user.id,
      });

      if (error) {
        console.error('Error archiving company:', error);
        return NextResponse.json({error: 'Failed to archive company'}, {status: 500});
      }

      return NextResponse.json({
        success: true,
        message: 'Company and all its users have been archived successfully.',
      });
    } catch (error) {
      console.error('Archive company error:', error);
      return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
  } else if (req.method === 'DELETE') {
    // Restore company
    try {
      const {error} = await supabase.rpc('restore_company', {
        p_company_id: companyId,
        p_restored_by: user.id,
      });

      if (error) {
        console.error('Error restoring company:', error);
        return NextResponse.json({error: 'Failed to restore company'}, {status: 500});
      }

      return NextResponse.json({
        success: true,
        message: 'Company and all its users have been restored successfully.',
      });
    } catch (error) {
      console.error('Restore company error:', error);
      return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
  }

  return NextResponse.json({error: `Method ${req.method} Not Allowed`}, {status: 405});
}

// Only super_admins can archive/restore companies
export const POST = withAuth(handler, ['super_admin']);
export const DELETE = withAuth(handler, ['super_admin']);

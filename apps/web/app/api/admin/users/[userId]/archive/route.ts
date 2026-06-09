import {NextRequest, NextResponse} from 'next/server';
import {withAuth} from '@/lib/auth-utils';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

async function handler(req: NextRequest, context: {params: Promise<{userId: string}>}) {
  const {userId} = await context.params;
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
    // Archive user
    try {
      const {error} = await supabase.rpc('archive_user', {
        p_user_id: userId,
        p_archived_by: user.id,
      });

      if (error) {
        console.error('Error archiving user:', error);
        return NextResponse.json({error: 'Failed to archive user'}, {status: 500});
      }

      return NextResponse.json({
        success: true,
        message: 'User has been archived successfully.',
      });
    } catch (error) {
      console.error('Archive user error:', error);
      return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
  } else if (req.method === 'DELETE') {
    // Restore user
    try {
      const {error} = await supabase.rpc('restore_user', {
        p_user_id: userId,
        p_restored_by: user.id,
      });

      if (error) {
        console.error('Error restoring user:', error);
        return NextResponse.json({error: 'Failed to restore user'}, {status: 500});
      }

      return NextResponse.json({
        success: true,
        message: 'User has been restored successfully.',
      });
    } catch (error) {
      console.error('Restore user error:', error);
      return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
  }

  return NextResponse.json({error: `Method ${req.method} Not Allowed`}, {status: 405});
}

// Only super_admins and system_admins can archive/restore users
export const POST = withAuth(handler, ['super_admin', 'system_admin']);
export const DELETE = withAuth(handler, ['super_admin', 'system_admin']);

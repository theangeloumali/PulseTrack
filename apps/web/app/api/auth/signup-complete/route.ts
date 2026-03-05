import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

// Service-role client bypasses RLS — required because new users
// don't exist in public.users yet, so RLS policies block inserts.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

function hasServiceRoleCredential(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    return false;
  }

  if (key.startsWith('sb_publishable_')) {
    return false;
  }

  if (key.startsWith('sb_secret_')) {
    return true;
  }

  const parts = key.split('.');
  if (parts.length !== 3) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as {
      role?: string;
    };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

const FULL_USER_WITH_COMPANY_FIELDS =
  'id, first_name, last_name, email, avatar_url, role, company_id, created_at, updated_at, company:companies!users_company_id_companies_id_fk(id,name,slug,created_at,updated_at)';

async function getFullUserWithCompany(userId: string, maxAttempts: number = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const {data, error} = await supabaseAdmin
      .from('users')
      .select(FULL_USER_WITH_COMPANY_FIELDS)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') ?? `signup-complete-${Date.now()}`;

  try {
    console.log(`[signup-complete:${correlationId}] Request received`);

    if (!hasServiceRoleCredential()) {
      console.error(`[signup-complete:${correlationId}] Misconfigured SUPABASE_SERVICE_ROLE_KEY`);
      return NextResponse.json(
        {
          error:
            'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY must be a service role credential',
          correlationId,
        },
        {status: 500},
      );
    }

    // Authenticate via Bearer token — avoids cookie timing race with @supabase/ssr
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!accessToken) {
      console.warn(`[signup-complete:${correlationId}] Missing bearer token`);
      return NextResponse.json({error: 'Unauthorized', correlationId}, {status: 401});
    }

    const {
      data: {user: authUser},
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !authUser) {
      console.warn(`[signup-complete:${correlationId}] Bearer token rejected`, {
        authError: authError?.message,
      });
      return NextResponse.json({error: 'Unauthorized', correlationId}, {status: 401});
    }

    const body = await request.json();
    const {company, user} = body;

    // Validate required fields
    if (!company?.name || !company?.slug) {
      console.warn(`[signup-complete:${correlationId}] Missing company payload`);
      return NextResponse.json(
        {error: 'Missing company data (name, slug)', correlationId},
        {status: 400},
      );
    }
    if (!user?.id || !user?.email || !user?.role) {
      console.warn(`[signup-complete:${correlationId}] Missing user payload`);
      return NextResponse.json(
        {error: 'Missing user data (id, email, role)', correlationId},
        {status: 400},
      );
    }

    // Prevent creating a user record for someone else
    if (user.id !== authUser.id) {
      console.warn(`[signup-complete:${correlationId}] User ID mismatch`, {
        authUserId: authUser.id,
        payloadUserId: user.id,
      });
      return NextResponse.json(
        {error: 'User ID does not match authenticated user', correlationId},
        {status: 403},
      );
    }

    // Check if user already exists (idempotency)
    // Use maybeSingle() + minimal select to avoid PGRST116 from FK join races
    const {data: existingUser} = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();

    if (existingUser) {
      console.log(
        `[signup-complete:${correlationId}] Existing user found, returning idempotent response`,
        {
          userId: existingUser.id,
        },
      );
      // Fetch full shape via service role so client can hydrate without a browser RLS call
      const fullExisting = await getFullUserWithCompany(existingUser.id);
      return NextResponse.json({data: fullExisting ?? {id: existingUser.id}, correlationId});
    }

    // Check if company slug already taken
    const {data: existingCompany} = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('slug', company.slug)
      .maybeSingle();

    if (existingCompany) {
      console.warn(`[signup-complete:${correlationId}] Company slug already exists`, {
        slug: company.slug,
      });
      return NextResponse.json(
        {error: `Company with slug "${company.slug}" already exists`, correlationId},
        {status: 409},
      );
    }

    console.log(`[signup-complete:${correlationId}] Creating company`, {slug: company.slug});

    // Create company using service_role (bypasses RLS)
    const {data: newCompany, error: companyError} = await supabaseAdmin
      .from('companies')
      .insert({name: company.name, slug: company.slug})
      .select()
      .single();

    if (companyError || !newCompany) {
      console.error(`[signup-complete:${correlationId}] Failed to create company`, companyError);
      return NextResponse.json(
        {
          error: `Failed to create company: ${companyError?.message || 'Unknown error'}`,
          correlationId,
        },
        {status: 500},
      );
    }

    console.log(`[signup-complete:${correlationId}] Company created`, {companyId: newCompany.id});

    // Create user using service_role (bypasses RLS)
    // Select only 'id' — no FK join — to avoid PGRST116 from PostgREST read-after-write race
    const {data: newUser, error: userError} = await supabaseAdmin
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        role: user.role,
        company_id: newCompany.id,
        status: 'active',
      })
      .select('id')
      .single();

    if (userError || !newUser) {
      console.error(
        `[signup-complete:${correlationId}] Failed to create user, cleaning up company`,
        userError,
      );
      // Clean up the orphaned company
      try {
        await supabaseAdmin.from('companies').delete().eq('id', newCompany.id);
      } catch (cleanupError) {
        console.error(
          `[signup-complete:${correlationId}] Failed to clean up company`,
          cleanupError,
        );
      }
      return NextResponse.json(
        {error: `Failed to create user: ${userError?.message || 'Unknown error'}`, correlationId},
        {status: 500},
      );
    }

    console.log(`[signup-complete:${correlationId}] User created`, {userId: newUser.id});

    // Separate SELECT after committed INSERT — service role bypasses RLS and PgBouncer lag
    const fullUser = await getFullUserWithCompany(newUser.id);

    console.log(`[signup-complete:${correlationId}] Provisioning completed`);
    return NextResponse.json({data: fullUser ?? {id: newUser.id}, correlationId});
  } catch (error) {
    console.error(`[signup-complete:${correlationId}] Unhandled API error`, error);
    return NextResponse.json({error: 'Internal server error', correlationId}, {status: 500});
  }
}

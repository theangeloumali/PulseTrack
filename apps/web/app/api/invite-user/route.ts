import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side admin client
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

export async function POST(request: NextRequest) {
  try {
    // First, authenticate the requesting user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the requesting user's details to verify they can invite users
    const { data: requestingUser, error: userError } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (userError || !requestingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has permission to invite (company_admin or higher)
    if (
      !["super_admin", "system_admin", "company_admin", "manager"].includes(
        requestingUser.role,
      )
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions to invite users" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      email,
      role,
      companyId,
      invitedBy,
      firstName,
      lastName,
      hourlyRate,
    } = body;

    // Validate required fields
    if (!email || !role || !companyId || !invitedBy) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify the companyId matches the requesting user's company
    if (companyId !== requestingUser.company_id) {
      return NextResponse.json(
        { error: "Cannot invite users to a different company" },
        { status: 403 },
      );
    }

    // Verify the invitedBy matches the requesting user
    if (invitedBy !== user.id) {
      return NextResponse.json(
        { error: "Invalid invitedBy parameter" },
        { status: 400 },
      );
    }

    // Step 1: Create auth user with Supabase (sends invitation email)
    const { data: authData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          // Pass custom data that will be available in the user metadata
          company_id: companyId,
          invited_by: invitedBy,
          role: role,
          first_name: firstName || null,
          last_name: lastName || null,
          hourly_rate: hourlyRate || null,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`,
      });

    if (inviteError || !authData.user) {
      console.error("Auth invitation error:", inviteError);
      return NextResponse.json(
        {
          error: `Failed to send invitation: ${inviteError?.message || "Unknown error"}`,
        },
        { status: 400 },
      );
    }

    // Step 2: Create user record in our database using regular supabase client
    const { data: result, error: dbError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id, // Use the auth user ID
        email: email,
        role: role,
        company_id: companyId,
        invited_by: invitedBy,
        invited_at: new Date().toISOString(),
        first_name: firstName || null,
        last_name: lastName || null,
        hourly_rate: hourlyRate || null,
        status: "inactive", // Will be activated when they accept invitation
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      // If database insert fails, we should clean up the auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error("Failed to cleanup auth user:", cleanupError);
      }

      return NextResponse.json(
        { error: `Failed to create user record: ${dbError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Invitation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

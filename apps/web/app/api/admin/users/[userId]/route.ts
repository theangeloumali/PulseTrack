import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-utils";
import { createServerClient } from "@supabase/ssr";
import type { UserRole, UserStatus } from "@/lib/db/schema";

async function handler(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const { userId } = params;

  if (req.method === "PATCH") {
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

      const body = await req.json();
      const { role, status, hourlyRate } = body;

      // Build update object dynamically
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (role !== undefined) {
        // Validate role
        const validRoles: UserRole[] = [
          "super_admin",
          "system_admin",
          "company_admin",
          "manager",
          "user",
        ];
        if (!validRoles.includes(role)) {
          return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }
        updates.role = role;
      }

      if (status !== undefined) {
        // Validate status
        const validStatuses: UserStatus[] = ["active", "inactive"];
        if (!validStatuses.includes(status)) {
          return NextResponse.json(
            { error: "Invalid status" },
            { status: 400 },
          );
        }
        updates.status = status;
      }

      if (hourlyRate !== undefined) {
        updates.hourly_rate = hourlyRate;
      }

      // Update the user
      const { data: updatedUser, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userId)
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
        .single();

      if (error) {
        console.error("Error updating user:", error);
        return NextResponse.json(
          { error: "Failed to update user" },
          { status: 500 },
        );
      }

      return NextResponse.json(updatedUser);
    } catch (error) {
      console.error("Super admin user update API error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  }

  if (req.method === "DELETE") {
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

      // Soft delete by setting status to inactive
      const { data: deletedUser, error } = await supabase
        .from("users")
        .update({
          status: "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json(
          { error: "Failed to delete user" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        message: "User deactivated successfully",
        user: deletedUser,
      });
    } catch (error) {
      console.error("Super admin user delete API error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: `Method ${req.method} Not Allowed` },
    { status: 405 },
  );
}

// Only super_admins can access this endpoint
export const PATCH = withAuth(handler, ["super_admin"]);
export const DELETE = withAuth(handler, ["super_admin"]);

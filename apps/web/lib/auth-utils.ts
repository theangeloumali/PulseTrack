import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Auth cleanup utility to handle corrupted auth states
 */
export const clearAuthState = () => {
  if (typeof window === "undefined") return;

  console.log("🧹 Clearing corrupted auth state...");

  // Clear localStorage
  const authKeys = [
    "sb-bqqosmjptqtivinrcfhn-auth-token",
    "supabase.auth.token",
    "currentUser",
  ];

  authKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
      console.log("🧹 Cleared localStorage key:", key);
    } catch (error) {
      console.warn("🧹 Failed to clear localStorage key:", key, error);
    }
  });

  // Clear sessionStorage
  try {
    sessionStorage.clear();
    console.log("🧹 Cleared sessionStorage");
  } catch (error) {
    console.warn("🧹 Failed to clear sessionStorage:", error);
  }

  console.log("🧹 Auth state cleanup complete");
};

export const isRefreshTokenError = (error: unknown): boolean => {
  const errorMessage = (error as Error)?.message || "";
  return (
    errorMessage.includes("refresh_token_not_found") ||
    errorMessage.includes("Invalid Refresh Token") ||
    errorMessage.includes("refresh token not found")
  );
};

type Role =
  | "super_admin"
  | "system_admin"
  | "company_admin"
  | "manager"
  | "user";

type AuthenticatedHandler = (
  req: NextRequest,
  ...args: any[]
) => Promise<NextResponse | Response>;

/**
 * Role hierarchy helper functions
 */
export const roleHierarchy: Record<Role, number> = {
  super_admin: 5,
  system_admin: 4,
  company_admin: 3,
  manager: 2,
  user: 1,
};

export const hasRoleLevel = (userRole: Role, requiredRole: Role): boolean => {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export const canElevateRole = (
  currentUserRole: Role,
  targetRole: Role,
): boolean => {
  // Super admins can elevate anyone to any role
  if (currentUserRole === "super_admin") return true;

  // System admins can elevate up to company_admin
  if (
    currentUserRole === "system_admin" &&
    roleHierarchy[targetRole] <= roleHierarchy.company_admin
  )
    return true;

  // Company admins can elevate up to manager
  if (
    currentUserRole === "company_admin" &&
    roleHierarchy[targetRole] <= roleHierarchy.manager
  )
    return true;

  return false;
};

export const getRolePermissions = (role: Role) => {
  return {
    canManageUsers: hasRoleLevel(role, "company_admin"),
    canManageProjects: hasRoleLevel(role, "manager"),
    canManageTickets: hasRoleLevel(role, "user"),
    canViewBilling: hasRoleLevel(role, "user"),
    canManageBilling: hasRoleLevel(role, "company_admin"),
    canAccessSystemSettings: hasRoleLevel(role, "system_admin"),
    canAccessSuperAdminPanel: role === "super_admin",
  };
};

export const withAuth = (
  handler: AuthenticatedHandler,
  allowedRoles: Role[],
) => {
  return async (req: NextRequest, ...args: any[]) => {
    const cookiesToSet: {
      name: string;
      value: string;
      options: CookieOptions;
    }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(allCookies) {
            cookiesToSet.push(...allCookies);
          },
        },
      },
    );

    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();

    if (!sessionUser) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 },
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", sessionUser.id)
      .single();

    if (userError) {
      console.error("Error fetching user role:", userError);
      return NextResponse.json(
        { message: "Internal server error" },
        { status: 500 },
      );
    }

    if (!user || !allowedRoles.includes(user.role as Role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const response = await handler(req, ...args);

    const nextResponse =
      response instanceof NextResponse
        ? response
        : new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });

    cookiesToSet.forEach(({ name, value, options }) => {
      nextResponse.cookies.set(name, value, options);
    });

    return nextResponse;
  };
};

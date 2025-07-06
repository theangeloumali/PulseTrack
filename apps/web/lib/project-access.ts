import React from "react";
import { supabase } from "@/lib/db";
import type { User, Project } from "@/lib/db/schema";

/**
 * Project access control utilities
 * These functions implement the project-based access control logic
 */

export interface ProjectAccessResult {
  hasAccess: boolean;
  reason?: string;
  userRole?: string;
  projectRole?: string;
}

/**
 * Check if a user can access a project based on visibility and membership
 */
export async function checkProjectAccess(
  projectId: string,
  userId: string,
): Promise<ProjectAccessResult> {
  try {
    // Get project and user information
    const [projectResult, userResult] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, visibility, company_id, owner_id")
        .eq("id", projectId)
        .single(),
      supabase
        .from("users")
        .select("id, role, company_id")
        .eq("id", userId)
        .single(),
    ]);

    if (projectResult.error || !projectResult.data) {
      return { hasAccess: false, reason: "Project not found" };
    }

    if (userResult.error || !userResult.data) {
      return { hasAccess: false, reason: "User not found" };
    }

    const project = projectResult.data;
    const user = userResult.data;

    // Super admins and system admins can access everything
    if (user.role === "super_admin" || user.role === "system_admin") {
      return { hasAccess: true, userRole: user.role };
    }

    // Company admins can access projects in their company
    if (
      user.role === "company_admin" &&
      user.company_id === project.company_id
    ) {
      return { hasAccess: true, userRole: user.role };
    }

    // Project owner can always access
    if (project.owner_id === userId) {
      return { hasAccess: true, userRole: user.role, projectRole: "owner" };
    }

    // Check project visibility
    if (project.visibility === "public") {
      return { hasAccess: true, userRole: user.role };
    }

    // For company visibility, check if user is in same company
    if (
      project.visibility === "company" &&
      user.company_id === project.company_id
    ) {
      return { hasAccess: true, userRole: user.role };
    }

    // For private projects, check project membership
    if (project.visibility === "private") {
      const { data: membership, error: membershipError } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .single();

      if (membershipError || !membership) {
        return { hasAccess: false, reason: "Not a project member" };
      }

      return {
        hasAccess: true,
        userRole: user.role,
        projectRole: membership.role,
      };
    }

    // For company projects, also check if explicitly added as member for enhanced permissions
    if (project.visibility === "company") {
      const { data: membership } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .single();

      return {
        hasAccess: true,
        userRole: user.role,
        projectRole: membership?.role,
      };
    }

    return { hasAccess: false, reason: "Insufficient permissions" };
  } catch (error) {
    console.error("Error checking project access:", error);
    return { hasAccess: false, reason: "Access check failed" };
  }
}

/**
 * Check if user is a member of a project
 */
export async function isProjectMember(
  projectId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Get user's role in a project
 */
export async function getUserProjectRole(
  projectId: string,
  userId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .single();

    return error || !data ? null : data.role;
  } catch {
    return null;
  }
}

/**
 * Check if user can modify a project (admin access)
 */
export async function canModifyProject(
  projectId: string,
  userId: string,
): Promise<boolean> {
  try {
    const access = await checkProjectAccess(projectId, userId);

    if (!access.hasAccess) return false;

    // Super admins, system admins can modify any project
    if (
      access.userRole === "super_admin" ||
      access.userRole === "system_admin"
    ) {
      return true;
    }

    // Company admins can modify projects in their company
    if (access.userRole === "company_admin") {
      return true;
    }

    // Project owners can modify their projects
    if (access.projectRole === "owner") {
      return true;
    }

    // Project leads can modify projects
    if (access.projectRole === "lead") {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get list of projects accessible by a user
 */
export async function getUserAccessibleProjects(
  userId: string,
): Promise<Project[]> {
  try {
    const userResult = await supabase
      .from("users")
      .select("id, role, company_id")
      .eq("id", userId)
      .single();

    if (userResult.error || !userResult.data) {
      return [];
    }

    const user = userResult.data;

    // Super admins and system admins can see all projects
    if (user.role === "super_admin" || user.role === "system_admin") {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      return error ? [] : data || [];
    }

    // Company admins can see all projects in their company
    if (user.role === "company_admin") {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", user.company_id)
        .order("created_at", { ascending: false });

      return error ? [] : data || [];
    }

    // Regular users: get projects they own, are members of, or public/company projects
    const [ownedProjects, memberProjects, companyProjects] = await Promise.all([
      // Projects they own
      supabase.from("projects").select("*").eq("owner_id", userId),

      // Projects they're members of
      supabase
        .from("project_members")
        .select("projects(*)")
        .eq("user_id", userId),

      // Public and company projects in their company
      supabase
        .from("projects")
        .select("*")
        .eq("company_id", user.company_id)
        .in("visibility", ["public", "company"]),
    ]);

    const allProjects = new Map<string, Project>();

    // Add owned projects
    ownedProjects.data?.forEach((project) => {
      allProjects.set(project.id, project);
    });

    // Add member projects
    memberProjects.data?.forEach((member) => {
      const project = Array.isArray(member.projects)
        ? member.projects[0]
        : member.projects;
      if (project) {
        allProjects.set(project.id, project);
      }
    });

    // Add public/company projects
    companyProjects.data?.forEach((project) => {
      allProjects.set(project.id, project);
    });

    return Array.from(allProjects.values()).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  } catch (error) {
    console.error("Error getting user accessible projects:", error);
    return [];
  }
}

/**
 * Middleware function to validate project access in API routes
 */
export async function validateProjectAccess(
  projectId: string,
  userId: string,
  requiredAccess: "read" | "write" = "read",
): Promise<{ success: boolean; error?: string; access?: ProjectAccessResult }> {
  try {
    const access = await checkProjectAccess(projectId, userId);

    if (!access.hasAccess) {
      return {
        success: false,
        error: access.reason || "Access denied",
        access,
      };
    }

    // For write access, check if user can modify
    if (requiredAccess === "write") {
      const canModify = await canModifyProject(projectId, userId);
      if (!canModify) {
        return {
          success: false,
          error: "Insufficient permissions to modify project",
          access,
        };
      }
    }

    return { success: true, access };
  } catch (error) {
    console.error("Project access validation error:", error);
    return {
      success: false,
      error: "Failed to validate project access",
    };
  }
}

/**
 * React hook for project access validation
 */
export function useProjectAccess(projectId?: string, userId?: string) {
  const [access, setAccess] = React.useState<ProjectAccessResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!projectId || !userId) {
      setAccess(null);
      return;
    }

    setLoading(true);
    checkProjectAccess(projectId, userId)
      .then(setAccess)
      .finally(() => setLoading(false));
  }, [projectId, userId]);

  return { access, loading };
}

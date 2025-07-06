import { NextRequest, NextResponse } from "next/server";
import {
  getBillingPeriodsByCompany,
  generateBillingPeriodForCycle,
  generateNextBillingPeriod,
  generateBillingPeriodForUser,
  generateBillingPeriodWithCustomDates,
  generateBillingPeriodForUserWithCustomDates,
  deleteBillingPeriod,
  recalculateBillingPeriodAmount,
} from "@/lib/db/billing-service";
import { createClient } from "@/lib/supabase/server";
import type { BillingFrequency } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and company info
    const { data: user } = await supabase
      .from("users")
      .select("id, company_id, role")
      .eq("id", authUser.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.company_id) {
      return NextResponse.json(
        { error: "User is not associated with a company" },
        { status: 400 },
      );
    }

    // Check if user is admin - if not, filter to user-specific data
    const isAdmin = ["company_admin", "system_admin", "super_admin"].includes(
      user.role,
    );
    const filterUserId = isAdmin ? undefined : user.id;

    const periods = await getBillingPeriodsByCompany(
      user.company_id,
      filterUserId,
    );
    return NextResponse.json(periods);
  } catch (error) {
    console.error("Error fetching billing periods:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and check permissions
    const { data: user } = await supabase
      .from("users")
      .select("id, company_id, role")
      .eq("id", authUser.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.company_id) {
      return NextResponse.json(
        { error: "User is not associated with a company" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const {
      action,
      frequency,
      start_date,
      current_period_id,
      target_user_id,
      billing_period_id,
      custom_start_date,
      custom_end_date,
    } = body;

    // Check if user is admin
    const isAdmin = ["company_admin", "system_admin", "super_admin"].includes(
      user.role,
    );

    let result;

    switch (action) {
      case "generate":
        // Only admins can generate company-wide billing periods
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 },
          );
        }

        if (!frequency) {
          return NextResponse.json(
            { error: "Frequency is required" },
            { status: 400 },
          );
        }

        // Check if custom date range is provided
        if (custom_start_date && custom_end_date) {
          result = await generateBillingPeriodWithCustomDates(
            supabase,
            user.company_id,
            frequency as BillingFrequency,
            custom_start_date,
            custom_end_date,
            user.id,
          );
        } else {
          const startDate = start_date ? new Date(start_date) : undefined;
          result = await generateBillingPeriodForCycle(
            supabase,
            user.company_id,
            frequency as BillingFrequency,
            startDate,
            user.id,
          );
        }

        break;

      case "generate_next":
        // Only admins can generate next billing periods
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 },
          );
        }

        if (!current_period_id) {
          return NextResponse.json(
            { error: "Current period ID is required" },
            { status: 400 },
          );
        }

        result = await generateNextBillingPeriod(
          supabase,
          user.company_id,
          current_period_id,
          user.id,
        );

        break;

      case "generate_for_user":
        if (!frequency || !target_user_id) {
          return NextResponse.json(
            { error: "Frequency and target user ID are required" },
            { status: 400 },
          );
        }

        // Regular users can only generate for themselves, admins can generate for any user
        if (!isAdmin && target_user_id !== user.id) {
          return NextResponse.json(
            { error: "You can only generate billing periods for yourself" },
            { status: 403 },
          );
        }

        // Check if custom date range is provided
        if (custom_start_date && custom_end_date) {
          result = await generateBillingPeriodForUserWithCustomDates(
            supabase,
            user.company_id,
            target_user_id,
            frequency as BillingFrequency,
            custom_start_date,
            custom_end_date,
            user.id,
          );
        } else {
          const userStartDate = start_date ? new Date(start_date) : undefined;
          result = await generateBillingPeriodForUser(
            supabase,
            user.company_id,
            target_user_id,
            frequency as BillingFrequency,
            userStartDate,
            user.id,
          );
        }

        break;

      case "recalculate_amount":
        // Only admins can recalculate billing period amounts
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 },
          );
        }

        if (!billing_period_id) {
          return NextResponse.json(
            { error: "Billing period ID is required" },
            { status: 400 },
          );
        }

        result = await recalculateBillingPeriodAmount(
          supabase,
          billing_period_id,
        );

        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating billing period:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and check permissions
    const { data: user } = await supabase
      .from("users")
      .select("id, company_id, role")
      .eq("id", authUser.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.company_id) {
      return NextResponse.json(
        { error: "User is not associated with a company" },
        { status: 400 },
      );
    }

    // Only admins can delete billing periods
    if (!["company_admin", "system_admin", "super_admin"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const billingPeriodId = searchParams.get("id");

    if (!billingPeriodId) {
      return NextResponse.json(
        { error: "Billing period ID is required" },
        { status: 400 },
      );
    }

    const result = await deleteBillingPeriod(supabase, billingPeriodId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting billing period:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

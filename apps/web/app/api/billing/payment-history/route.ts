import { NextRequest, NextResponse } from "next/server";
import {
  getPaymentHistory,
  createPaymentHistoryEntry,
} from "@/lib/db/billing-service";
import { createClient } from "@/lib/supabase/server";

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

    const { searchParams } = new URL(request.url);
    const billingPeriodId = searchParams.get("billing_period_id");

    if (!billingPeriodId) {
      return NextResponse.json(
        { error: "Billing period ID is required" },
        { status: 400 },
      );
    }

    // Verify user has access to this billing period
    const { data: user } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", authUser.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if billing period belongs to user's company
    const { data: billingPeriod } = await supabase
      .from("billing_periods")
      .select("company_id")
      .eq("id", billingPeriodId)
      .eq("company_id", user.company_id)
      .single();

    if (!billingPeriod) {
      return NextResponse.json(
        { error: "Billing period not found or access denied" },
        { status: 404 },
      );
    }

    const history = await getPaymentHistory(billingPeriodId);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching payment history:", error);
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

    // Only admins can create payment history entries
    if (!["company_admin", "system_admin", "super_admin"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { billing_period_id, action, old_value, new_value, notes } = body;

    if (!billing_period_id || !action) {
      return NextResponse.json(
        {
          error: "Billing period ID and action are required",
        },
        { status: 400 },
      );
    }

    // Verify billing period belongs to user's company
    const { data: billingPeriod } = await supabase
      .from("billing_periods")
      .select("company_id")
      .eq("id", billing_period_id)
      .eq("company_id", user.company_id)
      .single();

    if (!billingPeriod) {
      return NextResponse.json(
        {
          error: "Billing period not found or access denied",
        },
        { status: 404 },
      );
    }

    const historyEntry = await createPaymentHistoryEntry({
      billing_period_id,
      user_id: user.id,
      action,
      old_value,
      new_value,
      notes,
    });

    return NextResponse.json(historyEntry);
  } catch (error) {
    console.error("Error creating payment history entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

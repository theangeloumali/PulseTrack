import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod/v4';
import {
  deletePaymentHistory,
  resetBillingPeriodPaymentStatus,
  deleteAllPaymentHistory,
  deleteMultipleOutstandingPayments,
  deleteOutstandingPaymentsByStatus,
} from '@/lib/db/billing-service';
import {createClient} from '@/lib/supabase/server';

const paymentDeleteSchema = z.object({
  action: z.enum([
    'delete_payment_history',
    'reset_payment_status',
    'delete_all_payment_history',
    'delete_multiple_outstanding',
    'delete_by_status',
  ]),
  payment_history_id: z.uuid().optional(),
  billing_period_id: z.uuid().optional(),
  billing_period_ids: z.string().optional(),
  statuses: z.string().optional(),
});

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: {user: authUser},
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    // Get user and check permissions
    const {data: user} = await supabase
      .from('users')
      .select('id, company_id, role')
      .eq('id', authUser.id)
      .single();

    if (!user) {
      return NextResponse.json({error: 'User not found'}, {status: 404});
    }

    if (!user.company_id) {
      return NextResponse.json({error: 'User is not associated with a company'}, {status: 400});
    }

    // Only admins can delete payments
    if (!['company_admin', 'system_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({error: 'Insufficient permissions'}, {status: 403});
    }

    const {searchParams} = new URL(request.url);
    const rawParams = {
      action: searchParams.get('action') ?? undefined,
      payment_history_id: searchParams.get('payment_history_id') ?? undefined,
      billing_period_id: searchParams.get('billing_period_id') ?? undefined,
      billing_period_ids: searchParams.get('billing_period_ids') ?? undefined,
      statuses: searchParams.get('statuses') ?? undefined,
    };

    const parseResult = paymentDeleteSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          issues: parseResult.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        {status: 400},
      );
    }

    const {
      action,
      payment_history_id: paymentHistoryId,
      billing_period_id: billingPeriodId,
    } = parseResult.data;

    let result;

    switch (action) {
      case 'delete_payment_history':
        if (!paymentHistoryId) {
          return NextResponse.json({error: 'Payment history ID is required'}, {status: 400});
        }

        // Verify the payment history belongs to the user's company
        const {data: paymentHistory} = await supabase
          .from('payment_history')
          .select(
            `
                        id,
                        billing_periods!inner (
                            company_id
                        )
                    `,
          )
          .eq('id', paymentHistoryId)
          .single();

        if (
          !paymentHistory ||
          (paymentHistory.billing_periods as any)?.company_id !== user.company_id
        ) {
          return NextResponse.json(
            {error: 'Payment history not found or access denied'},
            {status: 404},
          );
        }

        result = await deletePaymentHistory(supabase, paymentHistoryId);
        break;

      case 'reset_payment_status':
        if (!billingPeriodId) {
          return NextResponse.json({error: 'Billing period ID is required'}, {status: 400});
        }

        // Verify the billing period belongs to the user's company
        const {data: billingPeriod} = await supabase
          .from('billing_periods')
          .select('id, company_id')
          .eq('id', billingPeriodId)
          .eq('company_id', user.company_id)
          .single();

        if (!billingPeriod) {
          return NextResponse.json(
            {error: 'Billing period not found or access denied'},
            {status: 404},
          );
        }

        result = await resetBillingPeriodPaymentStatus(supabase, billingPeriodId, user.id);
        break;

      case 'delete_all_payment_history':
        if (!billingPeriodId) {
          return NextResponse.json({error: 'Billing period ID is required'}, {status: 400});
        }

        // Verify the billing period belongs to the user's company
        const {data: billingPeriodForAll} = await supabase
          .from('billing_periods')
          .select('id, company_id')
          .eq('id', billingPeriodId)
          .eq('company_id', user.company_id)
          .single();

        if (!billingPeriodForAll) {
          return NextResponse.json(
            {error: 'Billing period not found or access denied'},
            {status: 404},
          );
        }

        result = await deleteAllPaymentHistory(supabase, billingPeriodId, user.id);
        break;

      case 'delete_multiple_outstanding':
        const billingPeriodIds = parseResult.data.billing_period_ids;
        if (!billingPeriodIds) {
          return NextResponse.json({error: 'Billing period IDs are required'}, {status: 400});
        }

        const idsArray = billingPeriodIds.split(',').filter(Boolean);
        if (idsArray.length === 0) {
          return NextResponse.json(
            {error: 'At least one billing period ID is required'},
            {status: 400},
          );
        }

        // Verify all billing periods belong to the user's company
        const {data: periodsToDelete} = await supabase
          .from('billing_periods')
          .select('id, company_id')
          .in('id', idsArray)
          .eq('company_id', user.company_id);

        if (!periodsToDelete || periodsToDelete.length !== idsArray.length) {
          return NextResponse.json(
            {error: 'Some billing periods not found or access denied'},
            {status: 404},
          );
        }

        result = await deleteMultipleOutstandingPayments(supabase, idsArray, user.id);
        break;

      case 'delete_by_status':
        const statuses = parseResult.data.statuses;
        if (!statuses) {
          return NextResponse.json({error: 'Payment statuses are required'}, {status: 400});
        }

        const statusArray = statuses.split(',').filter(Boolean);
        if (statusArray.length === 0) {
          return NextResponse.json({error: 'At least one status is required'}, {status: 400});
        }

        result = await deleteOutstandingPaymentsByStatus(
          supabase,
          user.company_id,
          statusArray,
          user.id,
        );
        break;

      default:
        return NextResponse.json({error: 'Invalid action'}, {status: 400});
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing payment deletion request:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      {status: 500},
    );
  }
}

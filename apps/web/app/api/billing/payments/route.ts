import { NextRequest, NextResponse } from 'next/server';
import { 
    deletePaymentHistory, 
    resetBillingPeriodPaymentStatus, 
    deleteAllPaymentHistory 
} from '@/lib/db/billing-service';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user and check permissions
        const { data: user } = await supabase
            .from('users')
            .select('id, company_id, role')
            .eq('id', authUser.id)
            .single();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.company_id) {
            return NextResponse.json({ error: 'User is not associated with a company' }, { status: 400 });
        }

        // Only admins can delete payments
        if (!['company_admin', 'system_admin', 'super_admin'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const paymentHistoryId = searchParams.get('payment_history_id');
        const billingPeriodId = searchParams.get('billing_period_id');

        if (!action) {
            return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 });
        }

        let result;

        switch (action) {
            case 'delete_payment_history':
                if (!paymentHistoryId) {
                    return NextResponse.json({ error: 'Payment history ID is required' }, { status: 400 });
                }
                
                // Verify the payment history belongs to the user's company
                const { data: paymentHistory } = await supabase
                    .from('payment_history')
                    .select(`
                        id,
                        billing_periods!inner (
                            company_id
                        )
                    `)
                    .eq('id', paymentHistoryId)
                    .single();

                if (!paymentHistory || paymentHistory.billing_periods.company_id !== user.company_id) {
                    return NextResponse.json({ error: 'Payment history not found or access denied' }, { status: 404 });
                }

                result = await deletePaymentHistory(supabase, paymentHistoryId);
                break;

            case 'reset_payment_status':
                if (!billingPeriodId) {
                    return NextResponse.json({ error: 'Billing period ID is required' }, { status: 400 });
                }

                // Verify the billing period belongs to the user's company
                const { data: billingPeriod } = await supabase
                    .from('billing_periods')
                    .select('id, company_id')
                    .eq('id', billingPeriodId)
                    .eq('company_id', user.company_id)
                    .single();

                if (!billingPeriod) {
                    return NextResponse.json({ error: 'Billing period not found or access denied' }, { status: 404 });
                }

                result = await resetBillingPeriodPaymentStatus(supabase, billingPeriodId, user.id);
                break;

            case 'delete_all_payment_history':
                if (!billingPeriodId) {
                    return NextResponse.json({ error: 'Billing period ID is required' }, { status: 400 });
                }

                // Verify the billing period belongs to the user's company
                const { data: billingPeriodForAll } = await supabase
                    .from('billing_periods')
                    .select('id, company_id')
                    .eq('id', billingPeriodId)
                    .eq('company_id', user.company_id)
                    .single();

                if (!billingPeriodForAll) {
                    return NextResponse.json({ error: 'Billing period not found or access denied' }, { status: 404 });
                }

                result = await deleteAllPaymentHistory(supabase, billingPeriodId, user.id);
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error processing payment deletion request:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
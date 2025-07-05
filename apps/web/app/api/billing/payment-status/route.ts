import { NextRequest, NextResponse } from 'next/server';
import { 
    updateBillingPeriodPaymentStatus, 
    getOutstandingPayments, 
    getOverduePayments,
    markInvoiceAsSent,
    markPaymentAsReceived,
    getBillingCycleStats 
} from '@/lib/db/billing-service';
import { createClient } from '@/lib/supabase/server';
import { getApiPath } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user and company info
        const { data: user } = await supabase
            .from('users')
            .select('id, company_id, role')
            .eq('id', session.user.id)
            .single();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const year = searchParams.get('year');

        switch (action) {
            case 'outstanding':
                const outstanding = await getOutstandingPayments(user.company_id);
                return NextResponse.json(outstanding);

            case 'overdue':
                const overdue = await getOverduePayments(user.company_id);
                return NextResponse.json(overdue);

            case 'stats':
                const yearNum = year ? parseInt(year) : undefined;
                const stats = await getBillingCycleStats(user.company_id, yearNum);
                return NextResponse.json(stats);

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error in payment status API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user and check permissions
        const { data: user } = await supabase
            .from('users')
            .select('id, company_id, role')
            .eq('id', session.user.id)
            .single();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Only admins can update payment status
        if (!['company_admin', 'system_admin', 'super_admin'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const { billing_period_id, payment_status, action, ...additionalData } = body;

        if (!billing_period_id) {
            return NextResponse.json({ error: 'Billing period ID is required' }, { status: 400 });
        }

        let result;

        switch (action) {
            case 'mark_sent':
                result = await markInvoiceAsSent(billing_period_id, additionalData.due_date);
                break;

            case 'mark_paid':
                result = await markPaymentAsReceived(
                    billing_period_id, 
                    additionalData.amount, 
                    additionalData.reference
                );
                break;

            case 'update_status':
                if (!payment_status) {
                    return NextResponse.json({ error: 'Payment status is required' }, { status: 400 });
                }
                result = await updateBillingPeriodPaymentStatus(
                    billing_period_id, 
                    payment_status, 
                    additionalData
                );
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error updating payment status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
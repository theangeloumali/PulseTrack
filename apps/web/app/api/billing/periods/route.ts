import { NextRequest, NextResponse } from 'next/server';
import { 
    getBillingPeriodsByCompany, 
    generateBillingPeriodForCycle, 
    generateNextBillingPeriod 
} from '@/lib/db/billing-service';
import { createClient } from '@/lib/supabase/server';
import type { BillingFrequency } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user and company info
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

        const periods = await getBillingPeriodsByCompany(user.company_id);
        return NextResponse.json(periods);
    } catch (error) {
        console.error('Error fetching billing periods:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
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

        // Only admins can create billing periods
        if (!['company_admin', 'system_admin', 'super_admin'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const { action, frequency, start_date, current_period_id } = body;

        let result;

        switch (action) {
            case 'generate':
                if (!frequency) {
                    return NextResponse.json({ error: 'Frequency is required' }, { status: 400 });
                }
                
                const startDate = start_date ? new Date(start_date) : undefined;
                result = await generateBillingPeriodForCycle(user.company_id, frequency as BillingFrequency, startDate, user.id);
                
                break;

            case 'generate_next':
                if (!current_period_id) {
                    return NextResponse.json({ error: 'Current period ID is required' }, { status: 400 });
                }
                
                result = await generateNextBillingPeriod(user.company_id, current_period_id, user.id);
                
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error creating billing period:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
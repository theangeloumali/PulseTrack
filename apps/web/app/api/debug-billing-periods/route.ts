import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
            .select('id, company_id, role, first_name, last_name')
            .eq('id', authUser.id)
            .single();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.company_id) {
            return NextResponse.json({ error: 'User is not associated with a company' }, { status: 400 });
        }

        // Get all billing periods for the company (no filtering)
        const { data: allPeriods, error: allPeriodsError } = await supabase
            .from('billing_periods')
            .select('*')
            .eq('company_id', user.company_id)
            .order('start_date', { ascending: false });

        if (allPeriodsError) {
            return NextResponse.json({ error: allPeriodsError.message }, { status: 500 });
        }

        // Check if user is admin
        const isAdmin = ['company_admin', 'system_admin', 'super_admin'].includes(user.role);
        
        // Test various filter patterns
        const testPatterns = [
            `notes.ilike.%Generated for user: %${user.id})%`,
            `notes.ilike.*Generated for user: *${user.id})*`,
            `notes.like.%Generated for user: %${user.id})%`,
        ];

        const patternResults = [];
        
        for (const pattern of testPatterns) {
            try {
                const { data: patternData, error: patternError } = await supabase
                    .from('billing_periods')
                    .select('*')
                    .eq('company_id', user.company_id)
                    .or(`${pattern},created_by.eq.${user.id}`)
                    .order('start_date', { ascending: false });
                
                patternResults.push({
                    pattern,
                    success: !patternError,
                    error: patternError?.message,
                    count: patternData?.length || 0,
                    data: patternData
                });
            } catch (err) {
                patternResults.push({
                    pattern,
                    success: false,
                    error: err instanceof Error ? err.message : 'Unknown error',
                    count: 0,
                    data: null
                });
            }
        }

        // Check periods created by this user
        const { data: createdByUser, error: createdByUserError } = await supabase
            .from('billing_periods')
            .select('*')
            .eq('company_id', user.company_id)
            .eq('created_by', user.id)
            .order('start_date', { ascending: false });

        return NextResponse.json({
            user: {
                id: user.id,
                role: user.role,
                isAdmin,
                company_id: user.company_id,
                name: `${user.first_name} ${user.last_name}`
            },
            allPeriods: allPeriods || [],
            allPeriodsCount: allPeriods?.length || 0,
            createdByUser: createdByUser || [],
            createdByUserCount: createdByUser?.length || 0,
            createdByUserError: createdByUserError?.message,
            patternResults,
            // Show sample notes to debug pattern matching
            sampleNotes: allPeriods?.map(p => ({ id: p.id, notes: p.notes, created_by: p.created_by })) || []
        });
    } catch (error) {
        console.error('Error in debug billing periods:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
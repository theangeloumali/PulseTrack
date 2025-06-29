import { supabase } from '@/lib/db';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function getMyWeeklySummary(userId: string) {
    const sevenDaysAgo = subDays(new Date(), 7);

    const { data, error } = await supabase
        .from('time_entries')
        .select(`
            id,
            duration,
            description,
            start_time,
            ticket:tickets!inner(title),
            user:users!inner(hourly_rate),
            time_entry_billing (
                hourly_rate,
                billable_amount,
                is_billable
            )
        `)
        .eq('user_id', userId)
        .gte('start_time', startOfDay(sevenDaysAgo).toISOString())
        .lte('start_time', endOfDay(new Date()).toISOString())
        .order('start_time', { ascending: false });

    if (error) throw error;

    return data || [];
}

'use client';

import { useAuthStore } from '@/lib/stores/auth';
import { useMyWeeklySummary } from '@/lib/hooks/useDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Loader2 } from 'lucide-react';

export default function MyWeeklySummary() {
    const { user } = useAuthStore();
    const { data: summary, isLoading, isError } = useMyWeeklySummary(user?.id || '');

    if (isLoading) {
        return (
            <div className='flex items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin' />
            </div>
        );
    }

    if (isError) {
        return <div>Error loading weekly summary.</div>;
    }

    const totalHours = (summary || []).reduce((acc, entry) => acc + (entry.duration || 0), 0) / 3600;
    const totalAmount = (summary || []).reduce((acc, entry) => acc + (entry.duration || 0) / 3600 * parseFloat(entry.user.hourly_rate || '0'), 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Weekly Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className='text-2xl font-bold'>{totalHours.toFixed(2)} hours (${totalAmount.toFixed(2)})</div>
                <p className='text-xs text-muted-foreground'>Total time tracked and billed this week</p>
                <ul className='mt-4 space-y-2'>
                    {summary && summary.map(entry => (
                        <li key={entry.id} className='text-sm'>
                            <span className='font-semibold'>{entry.ticket.title}:</span> {((entry.duration || 0) / 3600).toFixed(2)} hours (${((entry.duration || 0) / 3600 * parseFloat(entry.user.hourly_rate || '0')).toFixed(2)})
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

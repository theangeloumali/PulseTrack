'use client';

import {useAuthStore} from '@/lib/stores/auth';
import {useMyWeeklySummary} from '@/lib/hooks/useDashboard';
import {Card, CardContent, CardHeader, CardTitle} from '@workspace/ui/components/card';
import {Loader2} from 'lucide-react';

export default function MyWeeklySummary() {
  const {user} = useAuthStore();
  const {data: summary, isLoading, isError} = useMyWeeklySummary(user?.id || '');

  // Helper function to format duration hours to HH:MM:SS
  const formatDuration = (hours: number | null) => {
    if (!hours) return '00:00:00';

    const totalSeconds = Math.round(hours * 3600); // Convert hours to seconds
    const wholeHours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return <div>Error loading weekly summary.</div>;
  }

  const totalHours = (summary || []).reduce((acc, entry) => acc + (entry.duration || 0), 0); // Duration is already in hours
  const totalAmount = (summary || []).reduce((acc, entry) => {
    // Use pre-calculated billing amount if available, otherwise fallback to simple calculation
    if (entry.time_entry_billing && entry.time_entry_billing.length > 0) {
      return acc + parseFloat(entry.time_entry_billing[0].billable_amount || '0');
    }
    // Fallback to simple calculation using user's hourly rate
    return acc + (entry.duration || 0) * parseFloat(entry.user.hourly_rate || '0'); // Duration is already in hours
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Weekly Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <span className="font-mono">{formatDuration(totalHours)}</span> ($
          {totalAmount.toFixed(2)})
        </div>
        <p className="text-xs text-muted-foreground">Total time tracked and billed this week</p>
        <ul className="mt-4 space-y-2">
          {summary &&
            summary.map((entry) => {
              // Calculate individual entry amount
              let entryAmount;
              if (entry.time_entry_billing && entry.time_entry_billing.length > 0) {
                entryAmount = parseFloat(entry.time_entry_billing[0].billable_amount || '0');
              } else {
                entryAmount = (entry.duration || 0) * parseFloat(entry.user.hourly_rate || '0'); // Duration is already in hours
              }

              return (
                <li key={entry.id} className="text-sm">
                  <span className="font-semibold">{entry.ticket.title}:</span>{' '}
                  <span className="font-mono">{formatDuration(entry.duration)}</span> ($
                  {entryAmount.toFixed(2)})
                </li>
              );
            })}
        </ul>
      </CardContent>
    </Card>
  );
}

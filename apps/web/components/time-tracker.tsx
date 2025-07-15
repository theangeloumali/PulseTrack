'use client';

import {useState, useEffect} from 'react';
import {Play, Pause, Square, Clock} from 'lucide-react';
import {Button} from '@workspace/ui/components/button';
import {Card} from '@workspace/ui/components/card';
import {Input} from '@workspace/ui/components/input';
import {Label} from '@workspace/ui/components/label';
import {Textarea} from '@workspace/ui/components/textarea';
import {
  useActiveTimeEntry,
  useCreateTimeEntry,
  useUpdateTimeEntry,
} from '@/lib/hooks/useTimeTracking';
import {useTimeTrackingStore} from '@/lib/stores/timeTracking';
import {useAuth} from '@/lib/hooks/useAuth';
import type {Ticket} from '@/lib/db/schema';

interface TimeTrackerProps {
  ticket: Ticket;
  compact?: boolean;
}

export function TimeTracker({ticket, compact = false}: TimeTrackerProps) {
  const {user} = useAuth();
  const {data: activeEntry} = useActiveTimeEntry();
  const createTimeEntryMutation = useCreateTimeEntry();
  const updateTimeEntryMutation = useUpdateTimeEntry();

  const [description, setDescription] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Check if this ticket has an active timer
  const isActiveForTicket = activeEntry?.ticket_id === ticket.id;

  // Update elapsed time for active timer
  useEffect(() => {
    if (isActiveForTicket && activeEntry?.start_time) {
      const startTime = new Date(activeEntry.start_time).getTime();

      const updateElapsed = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);

      return () => clearInterval(interval);
    }
  }, [isActiveForTicket, activeEntry?.start_time]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    // Always show hours:minutes:seconds format
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = async () => {
    if (!user) return;

    try {
      await createTimeEntryMutation.mutateAsync({
        ticket_id: ticket.id,
        user_id: user.id,
        start_time: new Date().toISOString(),
        description: description || null,
      });
      setDescription('');
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const stopTimer = async () => {
    if (!activeEntry) return;

    const endTime = new Date();
    const startTime = new Date(activeEntry.start_time);
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    const durationHours = durationSeconds / 3600; // Convert to decimal hours

    try {
      await updateTimeEntryMutation.mutateAsync({
        id: activeEntry.id,
        data: {
          end_time: endTime.toISOString(),
          duration: durationHours,
        },
      });
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  const addManualEntry = async () => {
    if (!user || (!manualHours && !manualMinutes)) return;

    const hours = parseInt(manualHours) || 0;
    const minutes = parseInt(manualMinutes) || 0;
    const totalHours = hours + minutes / 60; // Convert to decimal hours
    const totalSeconds = totalHours * 3600; // For calculating start time

    const now = new Date();
    const startTime = new Date(now.getTime() - totalSeconds * 1000);

    try {
      await createTimeEntryMutation.mutateAsync({
        ticket_id: ticket.id,
        user_id: user.id,
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        duration: totalHours,
        description: description || null,
      });

      setManualHours('');
      setManualMinutes('');
      setDescription('');
      setShowManualEntry(false);
    } catch (error) {
      console.error('Failed to add manual time entry:', error);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isActiveForTicket ? (
          <>
            <div className="flex items-center gap-1 text-sm font-mono text-green-600">
              <Clock className="w-4 h-4" />
              {formatTime(elapsedTime)}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={stopTimer}
              disabled={updateTimeEntryMutation.isPending}>
              <Square className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={startTimer}
            disabled={createTimeEntryMutation.isPending || !!activeEntry}>
            <Play className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Time Tracking</h3>
          <Button variant="outline" size="sm" onClick={() => setShowManualEntry(!showManualEntry)}>
            Manual Entry
          </Button>
        </div>

        {/* Timer Section */}
        <div className="space-y-3">
          {isActiveForTicket && (
            <div className="text-center">
              <div className="text-3xl font-mono text-green-600 mb-2">
                {formatTime(elapsedTime)}
              </div>
              <p className="text-sm text-gray-600">Timer running</p>
            </div>
          )}

          {!showManualEntry && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(e.target.value)
                  }
                  placeholder="What are you working on?"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                {isActiveForTicket ? (
                  <Button
                    onClick={stopTimer}
                    disabled={updateTimeEntryMutation.isPending}
                    className="flex-1">
                    <Square className="w-4 h-4 mr-2" />
                    Stop Timer
                  </Button>
                ) : (
                  <Button
                    onClick={startTimer}
                    disabled={createTimeEntryMutation.isPending || !!activeEntry}
                    className="flex-1">
                    <Play className="w-4 h-4 mr-2" />
                    Start Timer
                  </Button>
                )}
              </div>

              {activeEntry && !isActiveForTicket && (
                <p className="text-sm text-amber-600">
                  Timer is running on another ticket:{' '}
                  {(activeEntry as any).tickets?.title || 'Unknown ticket'}
                </p>
              )}
            </div>
          )}

          {/* Manual Entry Section */}
          {showManualEntry && (
            <div className="space-y-3 border-t pt-3">
              <h4 className="font-medium">Add Time Manually</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="manual-hours">Hours</Label>
                  <Input
                    id="manual-hours"
                    type="number"
                    min="0"
                    value={manualHours}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setManualHours(e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="manual-minutes">Minutes</Label>
                  <Input
                    id="manual-minutes"
                    type="number"
                    min="0"
                    max="59"
                    value={manualMinutes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setManualMinutes(e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="manual-description">Description (optional)</Label>
                <Textarea
                  id="manual-description"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(e.target.value)
                  }
                  placeholder="What did you work on?"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={addManualEntry}
                  disabled={createTimeEntryMutation.isPending || (!manualHours && !manualMinutes)}
                  className="flex-1">
                  Add Time Entry
                </Button>
                <Button variant="outline" onClick={() => setShowManualEntry(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

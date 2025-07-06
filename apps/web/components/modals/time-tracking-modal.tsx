'use client';

import { useState, useEffect } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Clock, Play, Pause, Square, Loader2 } from 'lucide-react';
import { Ticket } from '@/lib/db/schema';
import { useAuthStore } from '@/lib/stores/auth';

interface TimeTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
}

export function TimeTrackingModal({ isOpen, onClose, ticket }: TimeTrackingModalProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [description, setDescription] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');
  const { user } = useAuthStore();

  // Timer effect
  useEffect(() => {
    if (!isTracking || !startTime) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, startTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    setIsTracking(true);
    setStartTime(new Date());
    setElapsedTime(0);
  };

  const handlePauseTimer = () => {
    setIsTracking(false);
  };

  const handleStopTimer = () => {
    setIsTracking(false);
    setStartTime(null);
    // Here you would save the time entry
    console.log('Time entry:', {
      ticket_id: ticket?.id,
      user_id: user?.id,
      duration: elapsedTime,
      description,
      start_time: startTime,
      end_time: new Date(),
    });
  };

  const handleManualEntry = () => {
    const [hours, minutes] = manualDuration.split(':').map(Number);
    const durationInSeconds = (hours || 0) * 3600 + (minutes || 0) * 60;
    
    console.log('Manual time entry:', {
      ticket_id: ticket?.id,
      user_id: user?.id,
      duration: durationInSeconds,
      description,
    });
  };

  if (!isOpen || !ticket) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-blue-600" />
              <CardTitle className="text-lg">Time Tracking</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant={mode === 'timer' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('timer')}
              >
                Timer
              </Button>
              <Button
                variant={mode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('manual')}
              >
                Manual
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="font-medium text-sm">{ticket.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {ticket.status.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {ticket.priority}
              </Badge>
            </div>
          </div>

          {mode === 'timer' ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-mono font-bold text-blue-600 mb-4">
                  {formatTime(elapsedTime)}
                </div>
                <div className="flex justify-center gap-2">
                  {!isTracking && elapsedTime === 0 && (
                    <Button onClick={handleStartTimer} className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Start
                    </Button>
                  )}
                  {isTracking && (
                    <Button onClick={handlePauseTimer} variant="outline" className="flex items-center gap-2">
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                  )}
                  {!isTracking && elapsedTime > 0 && (
                    <Button onClick={handleStartTimer} className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Resume
                    </Button>
                  )}
                  {elapsedTime > 0 && (
                    <Button onClick={handleStopTimer} variant="destructive" className="flex items-center gap-2">
                      <Square className="h-4 w-4" />
                      Stop & Save
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Duration (HH:MM)</label>
                <Input
                  type="text"
                  placeholder="1:30"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  pattern="[0-9]+:[0-9]{2}"
                />
                <p className="text-xs text-gray-500 mt-1">Format: hours:minutes (e.g., 1:30 for 1 hour 30 minutes)</p>
              </div>
              <Button onClick={handleManualEntry} className="w-full">
                Save Time Entry
              </Button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <Textarea
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
'use client'

import { useState } from 'react'
import { Edit, Trash2, Clock } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Card } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { useTimeEntriesByTicket, useUpdateTimeEntry, useDeleteTimeEntry } from '@/lib/hooks/useTimeTracking'
import type { TimeEntryWithUser } from '@/lib/db/schema'

interface TimeEntriesListProps {
  ticketId: string
}

interface EditingEntry {
  id: string
  description: string
  hours: string
  minutes: string
}

export function TimeEntriesList({ ticketId }: TimeEntriesListProps) {
  const { data: timeEntries = [], isLoading } = useTimeEntriesByTicket(ticketId)
  const updateTimeEntryMutation = useUpdateTimeEntry()
  const deleteTimeEntryMutation = useDeleteTimeEntry()
  
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null)

  const formatDuration = (hours: number | null) => {
    if (!hours) return '00:00:00'
    
    const totalSeconds = Math.round(hours * 3600) // Convert hours to seconds
    const wholeHours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    // Always show hours:minutes:seconds format
    return `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTotalTime = () => {
    return timeEntries.reduce((total, entry) => total + (entry.duration || 0), 0)
  }

  const startEditing = (entry: TimeEntryWithUser) => {
    const totalHours = entry.duration || 0
    const hours = Math.floor(totalHours)
    const minutes = Math.round((totalHours - hours) * 60)
    
    setEditingEntry({
      id: entry.id,
      description: entry.description || '',
      hours: hours.toString(),
      minutes: minutes.toString(),
    })
  }

  const saveEdit = async () => {
    if (!editingEntry) return
    
    const hours = parseInt(editingEntry.hours) || 0
    const minutes = parseInt(editingEntry.minutes) || 0
    const totalHours = hours + (minutes / 60) // Convert to decimal hours
    
    try {
      await updateTimeEntryMutation.mutateAsync({
        id: editingEntry.id,
        data: {
          description: editingEntry.description || null,
          duration: totalHours,
        }
      })
      setEditingEntry(null)
    } catch (error) {
      console.error('Failed to update time entry:', error)
    }
  }

  const cancelEdit = () => {
    setEditingEntry(null)
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return
    
    try {
      await deleteTimeEntryMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to delete time entry:', error)
    }
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </Card>
    )
  }
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Time Entries</h3>
          {timeEntries.length > 0 && (
            <div className="flex items-center gap-1 text-sm font-medium">
              <Clock className="w-4 h-4" />
              Total: {formatDuration(getTotalTime())}
            </div>
          )}
        </div>

        {timeEntries.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No time entries yet. Start tracking time to see entries here.
          </p>
        ) : (
          <div className="space-y-3">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-3">
                {editingEntry?.id === entry.id ? (
                  // Editing mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="edit-hours">Hours</Label>
                        <Input
                          id="edit-hours"
                          type="number"
                          min="0"
                          value={editingEntry?.hours || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            editingEntry && setEditingEntry({ ...editingEntry, hours: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-minutes">Minutes</Label>
                        <Input
                          id="edit-minutes"
                          type="number"
                          min="0"
                          max="59"
                          value={editingEntry?.minutes || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            editingEntry && setEditingEntry({ ...editingEntry, minutes: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={editingEntry?.description || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                          editingEntry && setEditingEntry({ ...editingEntry, description: e.target.value })
                        }
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        disabled={updateTimeEntryMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Display mode
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium">
                          {formatDuration(entry.duration)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(entry.start_time)}
                        </span>
                        <span className="text-sm text-gray-500">
                          by {(entry.users as any)?.first_name || 'Unknown'} {(entry.users as any)?.last_name || ''}
                        </span>
                      </div>
                      {entry.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {entry.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(entry)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteEntry(entry.id)}
                        disabled={deleteTimeEntryMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

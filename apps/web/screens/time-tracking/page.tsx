'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import { Badge } from '@workspace/ui/components/badge'
import { Clock, Play, Square, Plus, Calendar, Filter } from 'lucide-react'
import { TimeTracker } from '@/components/time-tracker'
import { TimeEntriesList } from '@/components/time-entries-list'
import { useQuery } from '@tanstack/react-query'

export function TimeTrackingScreen() {
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedTicket, setSelectedTicket] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'tracker' | 'entries' | 'reports'>('tracker')

  // Fetch projects for filtering
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects')
      if (!response.ok) throw new Error('Failed to fetch projects')
      return response.json()
    },
  })

  // Fetch tickets for selected project
  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets', selectedProject],
    queryFn: async () => {
      if (!selectedProject) return []
      const response = await fetch(`/api/projects/${selectedProject}/tickets`)
      if (!response.ok) throw new Error('Failed to fetch tickets')
      return response.json()
    },
    enabled: !!selectedProject,
  })

  return (
    <div className="h-full px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">Time Tracking</h1>
          <p className="text-muted-foreground">Track your time and manage entries</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Clock className="w-4 h-4 mr-1" />
          Time Management
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex border-b">
          <Button
            variant={activeTab === 'tracker' ? 'default' : 'ghost'}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            onClick={() => setActiveTab('tracker')}
          >
            Active Tracker
          </Button>
          <Button
            variant={activeTab === 'entries' ? 'default' : 'ghost'}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            onClick={() => setActiveTab('entries')}
          >
            Time Entries
          </Button>
          <Button
            variant={activeTab === 'reports' ? 'default' : 'ghost'}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </Button>
        </div>

        {/* Tracker Tab */}
        {activeTab === 'tracker' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Time Tracker
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTicket ? (
                  <TimeTracker ticket={{ id: selectedTicket } as any} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a project and ticket to start tracking time</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Manual Entry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project: any) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticket">Ticket</Label>
                    <Select value={selectedTicket} onValueChange={setSelectedTicket}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ticket" />
                      </SelectTrigger>
                      <SelectContent>
                        {tickets.map((ticket: any) => (
                          <SelectItem key={ticket.id} value={ticket.id}>
                            {ticket.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (hours)</Label>
                    <Input
                      id="duration"
                      type="number"
                      step="0.25"
                      placeholder="e.g., 2.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What did you work on?"
                    rows={3}
                  />
                </div>

                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Entries Tab */}
        {activeTab === 'entries' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Time Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTicket ? (
                <TimeEntriesList ticketId={selectedTicket} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a project and ticket to view time entries</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <Card>
            <CardHeader>
              <CardTitle>Time Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Time reporting features coming soon</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
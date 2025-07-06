"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import {
  Clock,
  Play,
  Square,
  Plus,
  Calendar,
  Filter,
  DollarSign,
} from "lucide-react";
import { TimeTracker } from "@/components/time-tracker";
import { TimeEntriesList } from "@/components/time-entries-list";
import { useAuthStore } from "@/lib/stores/auth";
import { useProjectsQuery } from "@/lib/hooks/useProjects";
import { useProjectTicketsQuery } from "@/lib/hooks/useTickets";
import {
  useActiveTimeEntry,
  useTimeEntriesByUser,
  useCreateTimeEntry,
} from "@/lib/hooks/useTimeTracking";

export function TimeTrackingScreen() {
  const { user } = useAuthStore();

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedTicket, setSelectedTicket] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"tracker" | "entries" | "reports">(
    "tracker",
  );

  // Helper function to format duration hours to HH:MM:SS
  const formatDuration = (hours: number | null) => {
    if (!hours) return "00:00:00";

    const totalSeconds = Math.round(hours * 3600); // Convert hours to seconds
    const wholeHours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${wholeHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Manual entry form state
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Check for active time entry
  const { data: activeTimeEntry } = useActiveTimeEntry();

  // Fetch projects for filtering
  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    isError: isProjectsError,
  } = useProjectsQuery();

  // Fetch tickets for selected project
  const { data: tickets = [], isLoading: isLoadingTickets } =
    useProjectTicketsQuery(selectedProject);

  // Auto-select project and ticket if there's an active timer
  useEffect(() => {
    if (
      activeTimeEntry &&
      activeTimeEntry.tickets &&
      projects.length > 0 &&
      !isLoadingProjects
    ) {
      const ticket = Array.isArray(activeTimeEntry.tickets)
        ? activeTimeEntry.tickets[0]
        : activeTimeEntry.tickets;
      const project =
        ticket?.projects &&
        (Array.isArray(ticket.projects) ? ticket.projects[0] : ticket.projects);

      if (project && ticket && project.id && ticket.id) {
        // Only set if not already set to prevent loops
        if (selectedProject !== project.id) {
          console.log(
            "🎯 Auto-selecting project for active timer:",
            project.name || project.id,
          );
          setSelectedProject(project.id);
        }
        if (selectedTicket !== ticket.id) {
          console.log(
            "🎯 Auto-selecting ticket for active timer:",
            ticket.title || ticket.id,
          );
          setSelectedTicket(ticket.id);
        }
      }
    }
  }, [activeTimeEntry, projects, isLoadingProjects]); // Remove selectedProject and selectedTicket from dependencies

  // Auto-select ticket once tickets are loaded for the selected project (fallback)
  useEffect(() => {
    if (
      activeTimeEntry &&
      activeTimeEntry.tickets &&
      selectedProject &&
      tickets.length > 0 &&
      !isLoadingTickets &&
      !selectedTicket
    ) {
      const ticket = Array.isArray(activeTimeEntry.tickets)
        ? activeTimeEntry.tickets[0]
        : activeTimeEntry.tickets;

      if (ticket && ticket.id) {
        setSelectedTicket(ticket.id);
      }
    }
  }, [
    activeTimeEntry,
    selectedProject,
    tickets,
    isLoadingTickets,
    selectedTicket,
  ]);

  // Fetch user's time entries using the proper hook
  const { data: userTimeEntries = [], isLoading: isLoadingEntries } =
    useTimeEntriesByUser();

  // Manual entry mutation using the proper hook
  const createEntryMutation = useCreateTimeEntry();

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTicket || !duration || !user?.id) {
      alert("Please fill in all required fields");
      return;
    }

    const durationHours = parseFloat(duration);
    if (isNaN(durationHours) || durationHours <= 0) {
      alert("Please enter a valid duration");
      return;
    }

    const startTime = new Date(date + "T09:00:00.000Z").toISOString();

    try {
      await createEntryMutation.mutateAsync({
        ticket_id: selectedTicket,
        user_id: user.id,
        start_time: startTime,
        duration: durationHours,
        description: description || undefined,
      });

      // Reset form on success
      alert("Time entry created successfully!");
      setDuration("");
      setDescription("");
      setSelectedProject("");
      setSelectedTicket("");
      setDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      alert("Failed to create time entry");
      console.error("Error creating time entry:", error);
    }
  };

  return (
    <div className="h-full px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">Time Tracking</h1>
          <p className="text-muted-foreground">
            Track your time and manage entries
          </p>
          {activeTimeEntry && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">
                Timer running for:{" "}
                {(Array.isArray(activeTimeEntry.tickets)
                  ? activeTimeEntry.tickets[0]?.title
                  : (activeTimeEntry.tickets as any)?.title) ||
                  "Unknown Ticket"}
              </span>
            </div>
          )}
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
            variant={activeTab === "tracker" ? "default" : "ghost"}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            onClick={() => setActiveTab("tracker")}
          >
            Active Tracker
          </Button>
          <Button
            variant={activeTab === "entries" ? "default" : "ghost"}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            onClick={() => setActiveTab("entries")}
          >
            Time Entries
          </Button>
          <Button
            variant={activeTab === "reports" ? "default" : "ghost"}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            onClick={() => setActiveTab("reports")}
          >
            Reports
          </Button>
        </div>

        {/* Tracker Tab */}
        {activeTab === "tracker" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {activeTimeEntry ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-600">Active Timer</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Time Tracker
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Project and Ticket Selection for Time Tracker */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tracker-project">Project *</Label>
                      <Select
                        value={selectedProject}
                        onValueChange={setSelectedProject}
                        disabled={isLoadingProjects}
                      >
                        <SelectTrigger id="tracker-project">
                          <SelectValue
                            placeholder={
                              isLoadingProjects
                                ? "Loading projects..."
                                : "Select project"
                            }
                          />
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
                      <Label htmlFor="tracker-ticket">Ticket *</Label>
                      <Select
                        value={selectedTicket}
                        onValueChange={setSelectedTicket}
                        disabled={!selectedProject || isLoadingTickets}
                      >
                        <SelectTrigger id="tracker-ticket">
                          <SelectValue
                            placeholder={
                              !selectedProject
                                ? "Select project first"
                                : isLoadingTickets
                                  ? "Loading tickets..."
                                  : "Select ticket"
                            }
                          />
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

                  {selectedTicket ||
                  (activeTimeEntry && activeTimeEntry.ticket_id) ? (
                    <TimeTracker
                      ticket={
                        {
                          id:
                            selectedTicket || activeTimeEntry?.ticket_id || "",
                          title:
                            tickets.find(
                              (t: any) =>
                                t.id ===
                                (selectedTicket || activeTimeEntry?.ticket_id),
                            )?.title ||
                            (activeTimeEntry?.tickets &&
                            Array.isArray(activeTimeEntry.tickets)
                              ? activeTimeEntry.tickets[0]?.title
                              : (activeTimeEntry?.tickets as any)?.title) ||
                            "Active Timer",
                        } as any
                      }
                    />
                  ) : activeTimeEntry ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Loading active timer...</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Auto-selecting project and ticket
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>
                        Select a project and ticket above to start tracking time
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Manual Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="project">Project *</Label>
                      <Select
                        value={selectedProject}
                        onValueChange={setSelectedProject}
                        disabled={isLoadingProjects}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingProjects
                                ? "Loading projects..."
                                : "Select project"
                            }
                          />
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
                      <Label htmlFor="ticket">Ticket *</Label>
                      <Select
                        value={selectedTicket}
                        onValueChange={setSelectedTicket}
                        disabled={!selectedProject || isLoadingTickets}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedProject
                                ? "Select project first"
                                : isLoadingTickets
                                  ? "Loading tickets..."
                                  : "Select ticket"
                            }
                          />
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
                      <Label htmlFor="duration">Duration (hours) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        step="0.25"
                        placeholder="e.g., 2.5"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="What did you work on?"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createEntryMutation.isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {createEntryMutation.isPending ? "Adding..." : "Add Entry"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Entries Tab */}
        {activeTab === "entries" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                My Time Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingEntries ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">
                    Loading time entries...
                  </p>
                </div>
              ) : userTimeEntries.length > 0 ? (
                <div className="space-y-4">
                  {userTimeEntries.map((entry: any) => (
                    <div key={entry.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-medium font-mono">
                              {formatDuration(entry.duration)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(entry.start_time).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">
                              {entry.tickets?.title}
                            </span>
                            {entry.tickets?.projects?.name && (
                              <span className="text-gray-500">
                                {" "}
                                • {entry.tickets.projects.name}
                              </span>
                            )}
                          </div>
                          {entry.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {entry.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            $
                            {(
                              (entry.duration || 0) *
                              parseFloat(String(user?.hourly_rate || "0"))
                            ).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            @${user?.hourly_rate || "0"}/hr
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No time entries found</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Add your first time entry using the form above
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Total Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    {formatDuration(
                      userTimeEntries.reduce(
                        (acc, entry) => acc + (entry.duration || 0),
                        0,
                      ),
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All time tracked
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    $
                    {userTimeEntries
                      .reduce(
                        (acc, entry) =>
                          acc +
                          (entry.duration || 0) *
                            parseFloat(String(user?.hourly_rate || "0")),
                        0,
                      )
                      .toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Based on hourly rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Entries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {userTimeEntries.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total time entries
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {userTimeEntries.slice(0, 5).map((entry: any) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {entry.tickets?.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(entry.start_time).toLocaleDateString()} •{" "}
                        <span className="font-mono">
                          {formatDuration(entry.duration)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      $
                      {(
                        (entry.duration || 0) *
                        parseFloat(String(user?.hourly_rate || "0"))
                      ).toFixed(2)}
                    </div>
                  </div>
                ))}
                {userTimeEntries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No time entries yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

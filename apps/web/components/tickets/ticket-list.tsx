"use client";

import { useState } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Ticket, TicketStatus } from "@/lib/db/schema";
import { DeleteTicketModal } from "@/components/modals/delete-ticket-modal";
import { TimeTrackingModal } from "@/components/modals/time-tracking-modal";
import { stripMarkdown } from "@/components/ui/markdown-viewer";
import { useUpdateTicket } from "@/lib/hooks/useTickets";
import {
  MoreVertical,
  Trash2,
  Clock,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";

interface TicketListProps {
  tickets: Ticket[];
  isLoading: boolean;
}

export function TicketList({ tickets, isLoading }: TicketListProps) {
  const [selectedTicketForDelete, setSelectedTicketForDelete] =
    useState<Ticket | null>(null);
  const [selectedTicketForTime, setSelectedTicketForTime] =
    useState<Ticket | null>(null);
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);

  const updateTicketMutation = useUpdateTicket();

  const handleStatusChange = (ticket: Ticket, newStatus: TicketStatus) => {
    updateTicketMutation.mutate({
      id: ticket.id,
      data: { status: newStatus },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-gray-100 text-gray-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "review":
        return "bg-yellow-100 text-yellow-800";
      case "done":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "critical":
      case "high":
        return <AlertCircle className="h-3 w-3" />;
      case "medium":
        return <FileText className="h-3 w-3" />;
      case "low":
        return <CheckCircle2 className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No tickets found
          </h3>
          <p className="text-gray-500 text-center">
            Tickets will appear here when they are created.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Priority Icon */}
                <div className="flex-shrink-0">
                  <div
                    className={`p-2 rounded-full ${getPriorityColor(ticket.priority)}`}
                  >
                    {getPriorityIcon(ticket.priority)}
                  </div>
                </div>

                {/* Title and Description */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/projects/${ticket.project_id}/tickets/${ticket.id}`}
                    className="block hover:text-blue-600"
                  >
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {ticket.title}
                    </h4>
                    {ticket.description && (
                      <p
                        className="text-xs text-gray-600 truncate mt-1"
                        title={stripMarkdown(ticket.description)}
                      >
                        {stripMarkdown(ticket.description)}
                      </p>
                    )}
                  </Link>
                </div>

                {/* Project */}
                <div className="flex-shrink-0 min-w-0 w-32">
                  <div className="flex items-center text-xs text-gray-500">
                    <FolderOpen className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">
                      {(ticket as any).projects?.name || "Unknown"}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex-shrink-0 min-w-0 w-32">
                  <Select
                    value={ticket.status}
                    onValueChange={(value: TicketStatus) =>
                      handleStatusChange(ticket, value)
                    }
                  >
                    <SelectTrigger className="h-6 text-xs border-0 shadow-none p-1 focus:ring-0 bg-transparent">
                      <SelectValue>
                        <Badge
                          className={`${getStatusColor(ticket.status)} text-xs border-0`}
                        >
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">
                        <Badge
                          className={`${getStatusColor("new")} text-xs border-0`}
                        >
                          New
                        </Badge>
                      </SelectItem>
                      <SelectItem value="in_progress">
                        <Badge
                          className={`${getStatusColor("in_progress")} text-xs border-0`}
                        >
                          In Progress
                        </Badge>
                      </SelectItem>
                      <SelectItem value="review">
                        <Badge
                          className={`${getStatusColor("review")} text-xs border-0`}
                        >
                          Review
                        </Badge>
                      </SelectItem>
                      <SelectItem value="done">
                        <Badge
                          className={`${getStatusColor("done")} text-xs border-0`}
                        >
                          Done
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="flex-shrink-0">
                  <Badge
                    className={`${getPriorityColor(ticket.priority)} text-xs`}
                  >
                    {ticket.priority}
                  </Badge>
                </div>

                {/* Assignee */}
                <div className="flex-shrink-0 min-w-0 w-24">
                  <div className="flex items-center text-xs text-gray-500">
                    <User className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">
                      {(ticket as any).assignee?.first_name || "Unassigned"}
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="flex-shrink-0 min-w-0 w-20">
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedDropdown(
                        expandedDropdown === ticket.id ? null : ticket.id,
                      )
                    }
                    className="h-8 w-8 p-0 text-gray-400"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  {expandedDropdown === ticket.id && (
                    <div className="absolute right-0 top-9 bg-white border rounded-md shadow-lg z-50 py-1 min-w-[150px]">
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b">
                        Quick Status Change
                      </div>
                      {["new", "in_progress", "review", "done"].map(
                        (status) => (
                          <button
                            key={status}
                            onClick={() => {
                              handleStatusChange(
                                ticket,
                                status as TicketStatus,
                              );
                              setExpandedDropdown(null);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left ${
                              ticket.status === status
                                ? "bg-blue-50 text-blue-700"
                                : ""
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${getStatusColor(status).replace("text-", "bg-").replace("100", "500")}`}
                            />
                            {status.replace("_", " ")}
                            {ticket.status === status && (
                              <span className="ml-auto text-xs">✓</span>
                            )}
                          </button>
                        ),
                      )}
                      <div className="border-t mt-1">
                        <button
                          onClick={() => {
                            setSelectedTicketForTime(ticket);
                            setExpandedDropdown(null);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left"
                        >
                          <Clock className="h-4 w-4" />
                          Time Tracking
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTicketForDelete(ticket);
                            setExpandedDropdown(null);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modals */}
      <DeleteTicketModal
        isOpen={!!selectedTicketForDelete}
        onClose={() => setSelectedTicketForDelete(null)}
        ticket={selectedTicketForDelete}
        onSuccess={() => setSelectedTicketForDelete(null)}
      />

      <TimeTrackingModal
        isOpen={!!selectedTicketForTime}
        onClose={() => setSelectedTicketForTime(null)}
        ticket={selectedTicketForTime}
      />
    </>
  );
}

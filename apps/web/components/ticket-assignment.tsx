"use client";

import { useState } from "react";
import { User, UserPlus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { useAssignableUsers } from "@/lib/hooks/useUsers";
import { useUpdateTicket } from "@/lib/hooks/useTickets";
import type { Ticket } from "@/lib/db/schema";

interface TicketAssignmentProps {
  ticket: Ticket;
  compact?: boolean;
}

export function TicketAssignment({
  ticket,
  compact = false,
}: TicketAssignmentProps) {
  const { data: users = [], isLoading: usersLoading } = useAssignableUsers();
  const updateTicketMutation = useUpdateTicket();

  const [isAssigning, setIsAssigning] = useState(false);

  const assignedUser = users.find((user) => user.id === ticket.assignee_id);

  const assignTicket = async (userId: string | null) => {
    try {
      await updateTicketMutation.mutateAsync({
        id: ticket.id,
        data: { assignee_id: userId },
      });
      setIsAssigning(false);
      // The mutation will automatically invalidate the ticket cache and update the UI
    } catch (error) {
      console.error("Failed to assign ticket:", error);
      alert("Failed to assign ticket. Please try again.");
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {assignedUser ? (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4" />
            <span>
              {assignedUser.first_name} {assignedUser.last_name}
            </span>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAssigning(true)}
            disabled={updateTicketMutation.isPending}
          >
            <UserPlus className="w-3 h-3" />
            Assign
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Assignment</h3>
          {assignedUser && !isAssigning && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAssigning(true)}
            >
              Change
            </Button>
          )}
        </div>

        {!isAssigning ? (
          <div className="space-y-3">
            {assignedUser ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">
                    {assignedUser.first_name} {assignedUser.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{assignedUser.email}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <UserPlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 mb-3">No one assigned</p>
                <Button
                  onClick={() => setIsAssigning(true)}
                  disabled={updateTicketMutation.isPending}
                >
                  Assign Ticket
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Assign to</Label>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                {/* Unassign option */}
                <button
                  onClick={() => assignTicket(null)}
                  disabled={updateTicketMutation.isPending}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-3 h-3 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Unassigned</p>
                    <p className="text-sm text-gray-400">Remove assignment</p>
                  </div>
                </button>

                {/* User options */}
                {usersLoading ? (
                  <div className="p-3 text-center text-gray-500">
                    Loading users...
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-3 text-center text-gray-500">
                    No users found
                  </div>
                ) : (
                  users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => assignTicket(user.id)}
                      disabled={updateTicketMutation.isPending}
                      className={`w-full text-left p-3 border rounded-lg hover:bg-gray-50 flex items-center gap-3 ${
                        user.id === ticket.assignee_id
                          ? "bg-blue-50 border-blue-200"
                          : ""
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-3 h-3 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      {user.id === ticket.assignee_id && (
                        <div className="ml-auto">
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                            Current
                          </span>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAssigning(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

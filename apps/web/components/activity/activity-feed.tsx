"use client";

import { useState } from "react";
import { useActivityFeed } from "@/lib/hooks/useActivities";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Filter,
  User2,
  FolderOpen,
  Ticket,
  Clock,
  UserPlus,
  UserMinus,
  Settings,
  MoreHorizontal,
} from "lucide-react";

interface ActivityFeedProps {
  projectId?: string;
  userId?: string;
  companyId?: string;
  limit?: number;
  showFilters?: boolean;
  title?: string;
}

const activityIcons = {
  project_created: FolderOpen,
  project_updated: Settings,
  project_archived: FolderOpen,
  ticket_created: Ticket,
  ticket_updated: Ticket,
  ticket_deleted: Ticket,
  ticket_assigned: UserPlus,
  comment_created: MoreHorizontal,
  user_added_to_project: UserPlus,
  user_removed_from_project: UserMinus,
  time_entry_created: Clock,
  time_entry_updated: Clock,
} as const;

const activityColors = {
  project_created: "bg-green-100 text-green-800",
  project_updated: "bg-blue-100 text-blue-800",
  project_archived: "bg-gray-100 text-gray-800",
  ticket_created: "bg-purple-100 text-purple-800",
  ticket_updated: "bg-yellow-100 text-yellow-800",
  ticket_deleted: "bg-red-100 text-red-800",
  ticket_assigned: "bg-indigo-100 text-indigo-800",
  comment_created: "bg-orange-100 text-orange-800",
  user_added_to_project: "bg-green-100 text-green-800",
  user_removed_from_project: "bg-red-100 text-red-800",
  time_entry_created: "bg-cyan-100 text-cyan-800",
  time_entry_updated: "bg-cyan-100 text-cyan-800",
} as const;

function getActivityIcon(type: string) {
  const Icon =
    activityIcons[type as keyof typeof activityIcons] || MoreHorizontal;
  return <Icon className="h-4 w-4" />;
}

function getActivityColor(type: string) {
  return (
    activityColors[type as keyof typeof activityColors] ||
    "bg-gray-100 text-gray-800"
  );
}

function ActivityItem({ activity }: { activity: any }) {
  const user = activity.user;
  const targetUser = activity.target_user;
  const project = activity.project;
  const ticket = activity.ticket;

  return (
    <div className="flex items-start space-x-3 p-4 border-b border-gray-100 last:border-b-0">
      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
        {user?.first_name?.[0]}
        {user?.last_name?.[0]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge className={getActivityColor(activity.type)}>
            {getActivityIcon(activity.type)}
            <span className="ml-1 capitalize">
              {activity.type.replace(/_/g, " ")}
            </span>
          </Badge>

          <span className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(activity.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>

        <div className="text-sm">
          <span className="font-medium">
            {user?.first_name} {user?.last_name}
          </span>
          <span className="text-gray-600 ml-1">{activity.title}</span>
        </div>

        {activity.description && (
          <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
        )}

        <div className="flex items-center gap-2 mt-2">
          {project && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <FolderOpen className="h-3 w-3" />
              {project.name}
            </span>
          )}

          {ticket && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Ticket className="h-3 w-3" />
              {ticket.title}
            </span>
          )}

          {targetUser && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <User2 className="h-3 w-3" />
              {targetUser.first_name} {targetUser.last_name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start space-x-3 p-4">
      <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function ActivityFeed({
  projectId,
  userId,
  companyId,
  limit = 20,
  showFilters = true,
  title = "Recent Activity",
}: ActivityFeedProps) {
  const { user } = useAuth();
  const [activityType, setActivityType] = useState<string>("all");

  const {
    data: activities,
    isLoading,
    error,
    refetch,
  } = useActivityFeed({
    projectId,
    userId,
    companyId,
    limit,
  });

  // Filter activities by type if selected
  const filteredActivities =
    activities?.filter(
      (activity) => activityType === "all" || activity.type === activityType,
    ) || [];

  // Get unique activity types for filter
  const availableTypes = Array.from(
    new Set(activities?.map((a) => a.type) || []),
  );

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">
            Error Loading Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Failed to load activity feed. Please try again.
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>

          {showFilters && availableTypes.length > 0 && (
            <div className="relative">
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1 pr-8 text-sm"
              >
                <option value="all">All Activities</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </option>
                ))}
              </select>
              <Filter className="h-4 w-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <ActivitySkeleton key={i} />
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <MoreHorizontal className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No activities yet
            </h3>
            <p className="text-gray-500">
              {activityType === "all"
                ? "Activities will appear here as team members work on projects."
                : `No ${activityType.replace(/_/g, " ")} activities found.`}
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {filteredActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

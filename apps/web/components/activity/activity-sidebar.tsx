"use client";

import { useRecentActivities } from "@/lib/hooks/useActivities";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import {
  FolderOpen,
  Ticket,
  Clock,
  UserPlus,
  Settings,
  MoreHorizontal,
  Activity,
} from "lucide-react";

const activityIcons = {
  project_created: FolderOpen,
  project_updated: Settings,
  ticket_created: Ticket,
  ticket_updated: Ticket,
  ticket_assigned: UserPlus,
  time_entry_created: Clock,
  user_added_to_project: UserPlus,
} as const;

function getActivityIcon(type: string) {
  const Icon =
    activityIcons[type as keyof typeof activityIcons] || MoreHorizontal;
  return <Icon className="h-3 w-3" />;
}

interface ActivitySidebarProps {
  limit?: number;
}

export function ActivitySidebar({ limit = 5 }: ActivitySidebarProps) {
  const { user } = useAuth();
  const { data: activities, isLoading } = useRecentActivities(limit);

  if (!user) return null;

  return (
    <div className="px-3 py-3 border-t border-sidebar-border">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-sidebar-foreground" />
        <span className="text-sm font-medium text-sidebar-foreground">
          Recent Activity
        </span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="h-3 w-3 bg-gray-200 rounded-full animate-pulse mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-2 w-1/2 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          activities.map((activity: any) => {
            const user = Array.isArray(activity.user)
              ? activity.user[0]
              : activity.user;
            const project = Array.isArray(activity.project)
              ? activity.project[0]
              : activity.project;

            return (
              <div key={activity.id} className="flex items-start gap-2 group">
                <div className="mt-1 p-1 rounded-full bg-sidebar-accent">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-sidebar-foreground truncate">
                    <span className="font-medium">
                      {user?.first_name} {user?.last_name}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      {activity.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  {project && (
                    <div className="text-xs text-muted-foreground truncate">
                      {project.name}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4">
            <MoreHorizontal className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">No recent activity</p>
          </div>
        )}
      </div>

      {activities && activities.length > 0 && (
        <div className="mt-3 pt-2 border-t border-sidebar-border">
          <button className="text-xs text-sidebar-primary hover:underline w-full text-left">
            View all activity
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Plus,
  Users,
  Clock,
  Target,
  FileText,
  Settings,
  TrendingUp,
  Zap,
  Calendar,
  MessageSquare,
  BarChart3,
  UserPlus,
  FolderPlus,
  PlayCircle,
  PauseCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { DashboardStatistics } from "@/lib/db/dashboard-service";
import type { UserRole } from "@/lib/db/schema";

interface ContextualActionCenterProps {
  userId: string;
  companyId: string;
  userRole: UserRole;
  stats?: DashboardStatistics;
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  priority: "high" | "medium" | "low";
  category: "create" | "manage" | "analyze" | "settings";
  badge?: {
    text: string;
    variant: "default" | "destructive" | "secondary" | "outline";
  };
  condition?: boolean;
}

export function ContextualActionCenter({
  userId,
  companyId,
  userRole,
  stats,
}: ContextualActionCenterProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "create" | "manage" | "analyze" | "settings"
  >("all");

  // Generate contextual actions based on user data and role
  const getContextualActions = (): ActionItem[] => {
    const hasProjects = (stats?.projects.total || 0) > 0;
    const hasActiveTickets = (stats?.tickets.total || 0) > 0;
    const hasTimeToday = (stats?.timeTracking.today || 0) > 0;
    const isAdmin = ["super_admin", "system_admin", "company_admin"].includes(
      userRole,
    );
    const isManager = userRole === "manager" || isAdmin;
    const hasTeam = (stats?.team.totalMembers || 0) > 1;
    const pendingPayments = stats?.billing?.pendingPayments || 0;

    const actions: ActionItem[] = [
      // Creation Actions
      {
        id: "create-project",
        title: "New Project",
        description: "Start organizing your work with a new project",
        icon: <FolderPlus className="h-4 w-4" />,
        href: "/projects/new",
        priority: hasProjects ? "medium" : "high",
        category: "create",
        badge: !hasProjects
          ? { text: "Get Started", variant: "default" }
          : undefined,
      },
      {
        id: "create-ticket",
        title: "Add Task",
        description: hasProjects
          ? "Create a new task in your projects"
          : "Create a project first to add tasks",
        icon: <Plus className="h-4 w-4" />,
        href: hasProjects ? "/tickets/new" : "/projects/new",
        priority: hasProjects && !hasActiveTickets ? "high" : "medium",
        category: "create",
        condition: true,
      },
      {
        id: "start-timer",
        title: hasTimeToday ? "Continue Tracking" : "Start Time Tracking",
        description: hasTimeToday
          ? "Resume tracking time on your tasks"
          : "Begin tracking time for better productivity",
        icon: hasTimeToday ? (
          <PlayCircle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        ),
        href: "/time-tracking",
        priority: !hasTimeToday ? "high" : "medium",
        category: "create",
        badge: !hasTimeToday
          ? { text: "Start Now", variant: "outline" }
          : undefined,
      },

      // Management Actions
      {
        id: "active-tickets",
        title: "Manage Active Tasks",
        description: `${(stats?.tickets.in_progress || 0) + (stats?.tickets.new || 0)} tasks need attention`,
        icon: <Target className="h-4 w-4" />,
        href: "/tickets",
        priority: hasActiveTickets ? "high" : "low",
        category: "manage",
        badge: hasActiveTickets
          ? {
              text: `${(stats?.tickets.in_progress || 0) + (stats?.tickets.new || 0)}`,
              variant: "destructive",
            }
          : undefined,
        condition: hasActiveTickets,
      },
      {
        id: "project-overview",
        title: "Project Overview",
        description: `Manage your ${stats?.projects.total || 0} projects`,
        icon: <BarChart3 className="h-4 w-4" />,
        href: "/projects",
        priority: "medium",
        category: "manage",
        condition: hasProjects,
      },
      {
        id: "invite-team",
        title: "Invite Team Members",
        description: hasTeam
          ? "Manage your team"
          : "Collaborate with team members",
        icon: <UserPlus className="h-4 w-4" />,
        href: "/company/users",
        priority: !hasTeam && isManager ? "high" : "low",
        category: "manage",
        condition: isManager,
        badge: !hasTeam
          ? { text: "Collaborate", variant: "outline" }
          : undefined,
      },

      // Analysis Actions
      {
        id: "time-reports",
        title: "Time Reports",
        description: "Analyze your time tracking data",
        icon: <TrendingUp className="h-4 w-4" />,
        href: "/time-tracking",
        priority: hasTimeToday ? "medium" : "low",
        category: "analyze",
        condition: hasTimeToday,
      },
      {
        id: "billing-overview",
        title: "Billing Overview",
        description:
          pendingPayments > 0
            ? `$${pendingPayments.toFixed(2)} pending payments`
            : "Review billing and payments",
        icon: <FileText className="h-4 w-4" />,
        href: "/billing",
        priority: pendingPayments > 0 ? "high" : "medium",
        category: "analyze",
        condition: !!stats?.billing,
        badge:
          pendingPayments > 0
            ? {
                text: "Action Needed",
                variant: "destructive",
              }
            : undefined,
      },
      {
        id: "activity-feed",
        title: "Team Activity",
        description: "See what your team is working on",
        icon: <MessageSquare className="h-4 w-4" />,
        href: "/activity",
        priority: "low",
        category: "analyze",
        condition: hasTeam,
      },

      // Settings Actions
      {
        id: "company-settings",
        title: "Company Settings",
        description: "Manage company preferences and integrations",
        icon: <Settings className="h-4 w-4" />,
        href: "/settings",
        priority: "low",
        category: "settings",
        condition: isAdmin,
      },
      {
        id: "user-profile",
        title: "Profile Settings",
        description: "Update your personal preferences",
        icon: <Settings className="h-4 w-4" />,
        href: "/profile",
        priority: "low",
        category: "settings",
      },
    ];

    return actions.filter((action) => action.condition !== false);
  };

  const actions = getContextualActions();
  const filteredActions =
    selectedCategory === "all"
      ? actions
      : actions.filter((action) => action.category === selectedCategory);

  const priorityActions = filteredActions.filter(
    (action) => action.priority === "high",
  );
  const recommendedActions = filteredActions.filter(
    (action) => action.priority === "medium",
  );
  const otherActions = filteredActions.filter(
    (action) => action.priority === "low",
  );

  const categories = [
    { id: "all", label: "All", icon: <Sparkles className="h-3 w-3" /> },
    { id: "create", label: "Create", icon: <Plus className="h-3 w-3" /> },
    { id: "manage", label: "Manage", icon: <Target className="h-3 w-3" /> },
    {
      id: "analyze",
      label: "Analyze",
      icon: <BarChart3 className="h-3 w-3" />,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-3 w-3" />,
    },
  ] as const;

  const ActionButton = ({ action }: { action: ActionItem }) => (
    <Link href={action.href} key={action.id}>
      <Button
        variant="ghost"
        className="w-full justify-start h-auto p-3 hover:bg-muted/50 border border-transparent hover:border-border"
      >
        <div className="flex items-start gap-3 text-left w-full">
          <div className="flex-shrink-0 mt-0.5">{action.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{action.title}</span>
              {action.badge && (
                <Badge variant={action.badge.variant} className="text-xs">
                  {action.badge.text}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {action.description}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </Button>
    </Link>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
        <CardDescription>
          Contextual actions based on your current work
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filter */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(category.id as any)}
              className="text-xs whitespace-nowrap"
            >
              {category.icon}
              <span className="ml-1">{category.label}</span>
            </Button>
          ))}
        </div>

        {/* Priority Actions */}
        {priorityActions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">Priority Actions</h4>
              <Badge variant="destructive" className="text-xs">
                {priorityActions.length}
              </Badge>
            </div>
            <div className="space-y-1">
              {priorityActions.map((action) => (
                <ActionButton key={action.id} action={action} />
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {recommendedActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recommended</h4>
            <div className="space-y-1">
              {recommendedActions.map((action) => (
                <ActionButton key={action.id} action={action} />
              ))}
            </div>
          </div>
        )}

        {/* Other Actions */}
        {otherActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              More Actions
            </h4>
            <div className="space-y-1">
              {otherActions.map((action) => (
                <ActionButton key={action.id} action={action} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredActions.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm">No actions available in this category</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

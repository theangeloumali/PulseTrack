"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { Badge } from "@workspace/ui/components/badge";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Target,
  Users,
  Zap,
  Clock,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import type { DashboardStatistics } from "@/lib/db/dashboard-service";
import type { UserRole } from "@/lib/db/schema";

interface SmartProgressTrackerProps {
  userId: string;
  companyId: string;
  userRole: UserRole;
  stats?: DashboardStatistics;
}

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  action?: {
    label: string;
    href: string;
  };
  icon: React.ReactNode;
}

export function SmartProgressTracker({
  userId,
  companyId,
  userRole,
  stats,
}: SmartProgressTrackerProps) {
  const [selectedTab, setSelectedTab] = useState<"today" | "week" | "setup">(
    "today",
  );

  // Calculate intelligent progress steps based on actual data
  const getProgressSteps = () => {
    const hasProjects = (stats?.projects.total || 0) > 0;
    const hasActiveTickets = (stats?.tickets.total || 0) > 0;
    const hasTimeTracked = (stats?.timeTracking.today || 0) > 0;
    const hasTeamMembers = (stats?.team.totalMembers || 0) > 1;

    const setupSteps: ProgressStep[] = [
      {
        id: "account",
        title: "Account Setup",
        description: "Profile and company workspace configured",
        completed: true,
        priority: "high",
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      },
      {
        id: "project",
        title: "Create First Project",
        description: hasProjects
          ? "Projects created and active"
          : "Organize your work with projects",
        completed: hasProjects,
        priority: "high",
        action: hasProjects
          ? undefined
          : {
              label: "Create Project",
              href: "/projects/new",
            },
        icon: hasProjects ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        ),
      },
      {
        id: "tickets",
        title: "Add Tasks",
        description: hasActiveTickets
          ? "Tasks created and being tracked"
          : "Break down work into manageable tasks",
        completed: hasActiveTickets,
        priority: hasProjects ? "high" : "medium",
        action:
          !hasActiveTickets && hasProjects
            ? {
                label: "Add Tasks",
                href: "/tickets/new",
              }
            : undefined,
        icon: hasActiveTickets ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        ),
      },
      {
        id: "team",
        title: "Invite Team Members",
        description: hasTeamMembers
          ? "Team members actively collaborating"
          : "Collaborate with your team",
        completed: hasTeamMembers,
        priority: userRole === "user" ? "low" : "medium",
        action:
          !hasTeamMembers && userRole !== "user"
            ? {
                label: "Invite Team",
                href: "/company/users",
              }
            : undefined,
        icon: hasTeamMembers ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        ),
      },
    ];

    const todaySteps: ProgressStep[] = [
      {
        id: "time-tracking",
        title: "Track Time Today",
        description: hasTimeTracked
          ? `${Math.floor(stats?.timeTracking.today || 0)}h ${Math.round(((stats?.timeTracking.today || 0) % 1) * 60)}m tracked`
          : "Start tracking time on your tasks",
        completed: hasTimeTracked,
        priority: "high",
        action: !hasTimeTracked
          ? {
              label: "Start Timer",
              href: "/time-tracking",
            }
          : undefined,
        icon: hasTimeTracked ? (
          <Clock className="h-4 w-4 text-blue-600" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground" />
        ),
      },
      {
        id: "active-tasks",
        title: "Work on Active Tasks",
        description: `${(stats?.tickets.in_progress || 0) + (stats?.tickets.new || 0)} tasks need attention`,
        completed: (stats?.tickets.in_progress || 0) > 0,
        priority: "high",
        action: {
          label: "View Tasks",
          href: "/tickets",
        },
        icon: <Target className="h-4 w-4 text-orange-600" />,
      },
    ];

    const weekSteps: ProgressStep[] = [
      {
        id: "week-time",
        title: "Weekly Time Goal",
        description: `${Math.floor(stats?.timeTracking.thisWeek || 0)}h tracked this week`,
        completed: (stats?.timeTracking.thisWeek || 0) >= 20, // 20 hours target
        priority: "medium",
        icon: <Zap className="h-4 w-4 text-purple-600" />,
      },
      {
        id: "team-collaboration",
        title: "Team Collaboration",
        description: `${stats?.team.activeMembers || 0} active team members`,
        completed: (stats?.team.activeMembers || 0) > 1,
        priority: "medium",
        icon: <Users className="h-4 w-4 text-green-600" />,
      },
    ];

    switch (selectedTab) {
      case "today":
        return todaySteps;
      case "week":
        return weekSteps;
      case "setup":
        return setupSteps;
      default:
        return setupSteps;
    }
  };

  const steps = getProgressSteps();
  const completedSteps = steps.filter((step) => step.completed).length;
  const progressPercentage =
    steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  const getTabData = () => {
    switch (selectedTab) {
      case "today":
        return {
          title: "Today's Focus",
          subtitle: "Your daily productivity goals",
          completedText: `${completedSteps} of ${steps.length} goals completed today`,
        };
      case "week":
        return {
          title: "Weekly Progress",
          subtitle: "Track your weekly achievements",
          completedText: `${completedSteps} of ${steps.length} weekly goals achieved`,
        };
      case "setup":
        return {
          title: "Workspace Setup",
          subtitle: "Get the most out of PulseTrack",
          completedText: `${completedSteps} of ${steps.length} setup steps completed`,
        };
      default:
        return {
          title: "Progress Tracker",
          subtitle: "Track your productivity",
          completedText: `${completedSteps} of ${steps.length} completed`,
        };
    }
  };

  const tabData = getTabData();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{tabData.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {tabData.subtitle}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant={selectedTab === "today" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedTab("today")}
            >
              Today
            </Button>
            <Button
              variant={selectedTab === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedTab("week")}
            >
              Week
            </Button>
            <Button
              variant={selectedTab === "setup" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedTab("setup")}
            >
              Setup
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {tabData.completedText}
            </span>
            <span className="font-medium">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                step.completed
                  ? "border-green-200 bg-green-50/50"
                  : step.priority === "high"
                    ? "border-orange-200 bg-orange-50/50"
                    : "border-border bg-card"
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">{step.icon}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{step.title}</h4>
                  {step.priority === "high" && !step.completed && (
                    <Badge variant="destructive" className="text-xs">
                      Priority
                    </Badge>
                  )}
                  {step.completed && (
                    <Badge
                      variant="default"
                      className="text-xs bg-green-100 text-green-700"
                    >
                      Complete
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>

              {step.action && !step.completed && (
                <Link href={step.action.href}>
                  <Button size="sm" variant="outline" className="text-xs">
                    {step.action.label}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Completion Message */}
        {progressPercentage === 100 && (
          <div className="text-center py-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-900">Excellent work!</p>
            <p className="text-sm text-green-700">
              You've completed all {selectedTab} goals. Keep up the momentum!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

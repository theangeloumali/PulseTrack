"use client";

import { useAuthStore } from "@/lib/stores/auth";
import { useDashboardStatistics } from "@/lib/hooks/useDashboard";
import type { DashboardStatistics } from "@/lib/db/dashboard-service";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Plus,
  Users,
  FolderOpen,
  Timer,
  AlertCircle,
  DollarSign,
  Loader2,
  TrendingUp,
  Calendar,
  Clock,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { SmartProgressTracker } from "@/components/dashboard/smart-progress-tracker";
import { ContextualActionCenter } from "@/components/dashboard/contextual-action-center";
import { PriorityInsights } from "@/components/dashboard/priority-insights";
import { PerformanceMetrics } from "@/components/dashboard/performance-metrics";
import { QuickTicketCreator } from "@/components/dashboard/quick-ticket-creator";
import { ProjectHealthDashboard } from "@/components/dashboard/project-health-dashboard";

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Get dashboard statistics
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  }: {
    data: DashboardStatistics | undefined;
    isLoading: boolean;
    isError: boolean;
  } = useDashboardStatistics(
    user?.id || "",
    user?.company_id || "",
    user?.role || "user",
  );

  // Helper function to format hours to HH:MM
  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  if (statsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Failed to load dashboard data. Please try refreshing.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.first_name || "User"}!
          </h1>
          <p className="text-muted-foreground mt-2">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>
      </div>

      {/* Key Metrics - Enhanced with trends */}
      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${
          stats?.billing ? "xl:grid-cols-5" : ""
        }`}
      >
        <Link href="/projects" className="group">
          <Card className="hover:shadow-md transition-all duration-200 group-hover:border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <div className="text-2xl font-bold">-</div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {stats?.projects.total || 0}
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <p className="text-xs text-muted-foreground">
                      {stats?.projects.active || 0} active
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/tickets" className="group">
          <Card className="hover:shadow-md transition-all duration-200 group-hover:border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Tasks
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <div className="text-2xl font-bold">-</div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {(stats?.tickets.in_progress || 0) +
                      (stats?.tickets.new || 0)}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target className="h-3 w-3 text-blue-600" />
                    <p className="text-xs text-muted-foreground">
                      {stats?.tickets.total || 0} total
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/time-tracking" className="group">
          <Card className="hover:shadow-md transition-all duration-200 group-hover:border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Time
              </CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <div className="text-2xl font-bold">-</div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {formatHours(stats?.timeTracking.today || 0)}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-orange-600" />
                    <p className="text-xs text-muted-foreground">
                      {formatHours(stats?.timeTracking.thisWeek || 0)} this week
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/company/users" className="group">
          <Card className="hover:shadow-md transition-all duration-200 group-hover:border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <div className="text-2xl font-bold">-</div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {stats?.team.totalMembers || 1}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Zap className="h-3 w-3 text-green-600" />
                    <p className="text-xs text-muted-foreground">
                      {stats?.team.activeMembers || 1} active
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Billing Card - Only for admins */}
        {stats?.billing && (
          <Link href="/billing" className="group">
            <Card className="hover:shadow-md transition-all duration-200 group-hover:border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <div className="text-2xl font-bold">-</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">
                      {formatCurrency(stats.billing.monthlyEarnings)}
                    </div>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(stats.billing.pendingPayments)} pending
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Priority & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Smart Progress Tracker */}
          <SmartProgressTracker
            userId={user?.id || ""}
            companyId={user?.company_id || ""}
            userRole={user?.role || "user"}
            stats={stats}
          />

          {/* Priority Insights */}
          <PriorityInsights
            userId={user?.id || ""}
            companyId={user?.company_id || ""}
            userRole={user?.role || "user"}
          />

          {/* Performance Metrics */}
          <PerformanceMetrics
            userId={user?.id || ""}
            stats={stats}
            isLoading={statsLoading}
          />

          {/* Project Health Dashboard */}
          <ProjectHealthDashboard
            userId={user?.id || ""}
            companyId={user?.company_id || ""}
            userRole={user?.role || "user"}
          />
        </div>

        {/* Right Column - Actions & Activity */}
        <div className="space-y-6">
          {/* Contextual Action Center */}
          <ContextualActionCenter
            userId={user?.id || ""}
            companyId={user?.company_id || ""}
            userRole={user?.role || "user"}
            stats={stats}
          />

          {/* Quick Ticket Creator */}
          <QuickTicketCreator
            userId={user?.id || ""}
            companyId={user?.company_id || ""}
          />

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest updates from your team</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ActivityFeed limit={8} showFilters={false} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

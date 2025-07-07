"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import { Button } from "@workspace/ui/components/button";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Target,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  BarChart3,
  Activity,
  ArrowRight,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@/lib/db/schema";

interface ProjectHealthDashboardProps {
  userId: string;
  companyId: string;
  userRole: UserRole;
}

interface ProjectHealth {
  id: string;
  name: string;
  status: "active" | "completed" | "on-hold" | "at-risk";
  progress: number;
  health: "excellent" | "good" | "warning" | "critical";
  metrics: {
    tasksCompleted: number;
    totalTasks: number;
    teamMembers: number;
    daysRemaining?: number;
    velocity: number; // tasks per week
    blockers: number;
  };
  trends: {
    progress: number; // percentage change
    velocity: number; // percentage change
  };
  lastActivity: string;
}

// Mock data fetcher - replace with actual API call
const fetchProjectHealth = async (
  userId: string,
  companyId: string,
  userRole: UserRole,
): Promise<ProjectHealth[]> => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1200));

  return [
    {
      id: "1",
      name: "Website Redesign",
      status: "active",
      progress: 75,
      health: "good",
      metrics: {
        tasksCompleted: 15,
        totalTasks: 20,
        teamMembers: 4,
        daysRemaining: 12,
        velocity: 3.2,
        blockers: 0,
      },
      trends: {
        progress: 12,
        velocity: 8,
      },
      lastActivity: "2 hours ago",
    },
    {
      id: "2",
      name: "Mobile App Development",
      status: "active",
      progress: 45,
      health: "warning",
      metrics: {
        tasksCompleted: 12,
        totalTasks: 28,
        teamMembers: 6,
        daysRemaining: 25,
        velocity: 2.1,
        blockers: 3,
      },
      trends: {
        progress: -5,
        velocity: -15,
      },
      lastActivity: "1 day ago",
    },
    {
      id: "3",
      name: "Security Audit",
      status: "active",
      progress: 90,
      health: "excellent",
      metrics: {
        tasksCompleted: 18,
        totalTasks: 20,
        teamMembers: 2,
        daysRemaining: 3,
        velocity: 4.5,
        blockers: 0,
      },
      trends: {
        progress: 25,
        velocity: 20,
      },
      lastActivity: "30 minutes ago",
    },
    {
      id: "4",
      name: "Data Migration",
      status: "at-risk",
      progress: 25,
      health: "critical",
      metrics: {
        tasksCompleted: 5,
        totalTasks: 22,
        teamMembers: 3,
        daysRemaining: 8,
        velocity: 1.2,
        blockers: 5,
      },
      trends: {
        progress: -8,
        velocity: -30,
      },
      lastActivity: "3 days ago",
    },
  ];
};

export function ProjectHealthDashboard({
  userId,
  companyId,
  userRole,
}: ProjectHealthDashboardProps) {
  const {
    data: projects,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["project-health", userId, companyId, userRole],
    queryFn: () => fetchProjectHealth(userId, companyId, userRole),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getHealthColor = (health: ProjectHealth["health"]) => {
    switch (health) {
      case "excellent":
        return "text-green-600 bg-green-50 border-green-200";
      case "good":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "warning":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getHealthIcon = (health: ProjectHealth["health"]) => {
    switch (health) {
      case "excellent":
        return <CheckCircle2 className="h-4 w-4" />;
      case "good":
        return <Target className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "critical":
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: ProjectHealth["status"]) => {
    const variants = {
      active: "default",
      completed: "default",
      "on-hold": "secondary",
      "at-risk": "destructive",
    } as const;

    return (
      <Badge variant={variants[status]} className="text-xs">
        {status.replace("-", " ")}
      </Badge>
    );
  };

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? (
      <TrendingUp className="h-3 w-3 text-green-600" />
    ) : (
      <TrendingDown className="h-3 w-3 text-red-600" />
    );
  };

  const ProjectCard = ({ project }: { project: ProjectHealth }) => (
    <Link href={`/projects/${project.id}`}>
      <div
        className={`p-4 rounded-lg border transition-all hover:shadow-md hover:border-primary/20 ${getHealthColor(project.health)}`}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate">{project.name}</h4>
                <div className="flex items-center gap-1">
                  {getHealthIcon(project.health)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(project.status)}
                <span className="text-xs text-muted-foreground">
                  {project.lastActivity}
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Progress</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-1.5" />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span>
                {project.metrics.tasksCompleted}/{project.metrics.totalTasks}{" "}
                tasks
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span>{project.metrics.teamMembers} members</span>
            </div>
            {project.metrics.daysRemaining && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>{project.metrics.daysRemaining} days left</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-muted-foreground" />
              <span>{project.metrics.velocity} tasks/week</span>
            </div>
          </div>

          {/* Trends */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              {getTrendIcon(project.trends.progress)}
              <span>
                {project.trends.progress > 0 ? "+" : ""}
                {project.trends.progress}% progress
              </span>
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(project.trends.velocity)}
              <span>
                {project.trends.velocity > 0 ? "+" : ""}
                {project.trends.velocity}% velocity
              </span>
            </div>
          </div>

          {/* Blockers */}
          {project.metrics.blockers > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              <AlertTriangle className="h-3 w-3" />
              <span>{project.metrics.blockers} blockers</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );

  const OverallHealthSummary = () => {
    if (!projects) return null;

    const healthCounts = projects.reduce(
      (acc, project) => {
        acc[project.health] = (acc[project.health] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalProjects = projects.length;
    const atRiskProjects = projects.filter(
      (p) => p.status === "at-risk" || p.health === "critical",
    ).length;
    const avgProgress =
      projects.reduce((sum, p) => sum + p.progress, 0) / totalProjects;

    return (
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-lg font-bold">{totalProjects}</div>
          <div className="text-xs text-muted-foreground">Total Projects</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-lg font-bold">{Math.round(avgProgress)}%</div>
          <div className="text-xs text-muted-foreground">Avg Progress</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div
            className={`text-lg font-bold ${atRiskProjects > 0 ? "text-red-600" : "text-green-600"}`}
          >
            {atRiskProjects}
          </div>
          <div className="text-xs text-muted-foreground">At Risk</div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Health</CardTitle>
          <CardDescription>
            Monitor project progress and team performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg" />
              ))}
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Health</CardTitle>
          <CardDescription>
            Monitor project progress and team performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load project health data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!projects?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Health</CardTitle>
          <CardDescription>
            Monitor project progress and team performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-8 w-8 mx-auto mb-3" />
            <p className="mb-3">No projects to monitor yet</p>
            <Button asChild size="sm">
              <Link href="/projects/new">
                <FolderOpen className="h-4 w-4 mr-2" />
                Create Your First Project
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Project Health
            </CardTitle>
            <CardDescription>
              Monitor project progress and team performance
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/projects">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Summary */}
        <OverallHealthSummary />

        {/* Project Cards */}
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

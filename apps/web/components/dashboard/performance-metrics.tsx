'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@workspace/ui/components/card';
import {Badge} from '@workspace/ui/components/badge';
import {Progress} from '@workspace/ui/components/progress';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Calendar,
  Zap,
  Award,
  BarChart3,
  Timer,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import {getPerformanceMetrics} from '@/lib/db/performance-metrics-service';
import type {UserRole} from '@/lib/db/schema';
import type {DashboardStatistics} from '@/lib/db/dashboard-service';

interface PerformanceMetricsProps {
  userId: string;
  companyId: string;
  userRole: UserRole;
  stats?: DashboardStatistics;
  isLoading: boolean;
}

interface MetricCard {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: 'green' | 'red' | 'blue' | 'orange' | 'purple';
  description: string;
}

export function PerformanceMetrics({
  userId,
  companyId,
  userRole,
  stats,
  isLoading,
}: PerformanceMetricsProps) {
  // Fetch enhanced performance metrics
  const {
    data: performanceMetrics,
    isLoading: metricsLoading,
    isError: metricsError,
  } = useQuery({
    queryKey: ['performance-metrics', userId, companyId, userRole],
    queryFn: () => getPerformanceMetrics(userId, companyId, userRole),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId && !!companyId && !!userRole,
  });
  // Calculate metrics and trends using enhanced data
  const calculateMetrics = (): MetricCard[] => {
    if (!performanceMetrics && !stats) return [];

    // Use enhanced metrics when available, fallback to basic stats
    const productivity = performanceMetrics?.productivity || {
      todayHours: stats?.timeTracking.today || 0,
      weekHours: stats?.timeTracking.thisWeek || 0,
      monthHours: stats?.timeTracking.thisMonth || 0,
      weeklyTrend: 0,
      dailyAverage: (stats?.timeTracking.thisWeek || 0) / 7,
    };

    const taskCompletion = performanceMetrics?.taskCompletion || {
      completionRate: stats
        ? ((stats.tickets.done || 0) / Math.max(stats.tickets.total || 1, 1)) * 100
        : 0,
      completedThisWeek: stats?.tickets.done || 0,
      totalThisWeek: stats?.tickets.total || 0,
      completionTrend: 0,
    };

    const velocity = performanceMetrics?.velocity || {
      tasksPerWeek: stats?.tickets.done || 0,
      velocityTrend: 0,
      averageCompletionTime: 0,
    };

    return [
      {
        title: "Today's Focus",
        value: `${Math.floor(productivity.todayHours)}h ${Math.round((productivity.todayHours % 1) * 60)}m`,
        change: productivity.todayHours > productivity.dailyAverage ? 15 : -10,
        changeLabel: 'vs daily avg',
        icon: <Clock className="h-4 w-4" />,
        color: productivity.todayHours > productivity.dailyAverage ? 'green' : 'red',
        description: `Daily target: ${Math.round(productivity.dailyAverage * 10) / 10}h`,
      },
      {
        title: 'Weekly Productivity',
        value: `${Math.floor(productivity.weekHours)}h`,
        change: productivity.weeklyTrend,
        changeLabel: 'vs last week',
        icon: <TrendingUp className="h-4 w-4" />,
        color: productivity.weeklyTrend > 0 ? 'green' : 'red',
        description: 'Time tracked this week',
      },
      {
        title: 'Task Completion',
        value: `${Math.round(taskCompletion.completionRate)}%`,
        change: taskCompletion.completionTrend,
        changeLabel: 'completion rate',
        icon: <Target className="h-4 w-4" />,
        color:
          taskCompletion.completionRate > 70
            ? 'green'
            : taskCompletion.completionRate > 50
              ? 'orange'
              : 'red',
        description: `${taskCompletion.completedThisWeek}/${taskCompletion.totalThisWeek} tasks done`,
      },
      {
        title: 'Team Velocity',
        value: `${velocity.tasksPerWeek}`,
        change: velocity.velocityTrend,
        changeLabel: 'tasks/week',
        icon: <Zap className="h-4 w-4" />,
        color: velocity.velocityTrend > 0 ? 'green' : 'red',
        description: 'Weekly task completion',
      },
    ];
  };

  const metrics = calculateMetrics();

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          text: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
        };
      case 'red':
        return {
          text: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
        };
      case 'blue':
        return {
          text: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
        };
      case 'orange':
        return {
          text: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
        };
      case 'purple':
        return {
          text: 'text-purple-600',
          bg: 'bg-purple-50',
          border: 'border-purple-200',
        };
      default:
        return {
          text: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
        };
    }
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change}%`;
  };

  const getTrendIcon = (change: number) => {
    return change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  };

  // Weekly goals progress
  const weeklyGoals = [
    {
      title: 'Time Tracking Goal',
      current: stats?.timeTracking.thisWeek || 0,
      target: 35,
      unit: 'hours',
    },
    {
      title: 'Task Completion Goal',
      current: stats?.tickets.done || 0,
      target: 12,
      unit: 'tasks',
    },
  ];

  if (isLoading || metricsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Metrics</CardTitle>
          <CardDescription>Track your productivity trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-lg" />
              ))}
            </div>
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (metricsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
          <CardDescription>Track your productivity trends and achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load performance metrics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
        <CardDescription>Track your productivity trends and achievements</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric, index) => {
            const colors = getColorClasses(metric.color);
            return (
              <div key={index} className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1 rounded ${colors.text}`}>{metric.icon}</div>
                  <div className={`flex items-center gap-1 text-xs ${colors.text}`}>
                    {getTrendIcon(metric.change)}
                    <span className="font-medium">{formatChange(metric.change)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-lg font-bold">{metric.value}</div>
                  <div className="text-xs font-medium">{metric.title}</div>
                  <div className="text-xs text-muted-foreground">{metric.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Weekly Goals Progress */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Weekly Goals</h4>
          <div className="space-y-3">
            {weeklyGoals.map((goal, index) => {
              const progress = Math.min((goal.current / goal.target) * 100, 100);
              const isComplete = goal.current >= goal.target;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{goal.title}</span>
                      {isComplete && (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {goal.current}/{goal.target} {goal.unit}
                    </span>
                  </div>
                  <Progress
                    value={progress}
                    className={`h-2 ${isComplete ? 'bg-green-100' : ''}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Insights */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Insights & Recommendations</h4>
          <div className="space-y-2">
            {/* Generate insights based on data */}
            {(stats?.timeTracking.today || 0) < 2 && (
              <div className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                <Timer className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900">Low time tracking today</p>
                  <p className="text-orange-700">
                    Consider tracking time to improve productivity insights
                  </p>
                </div>
              </div>
            )}

            {(stats?.tickets.total || 0) > 0 &&
              (stats?.tickets.done || 0) / (stats?.tickets.total || 1) > 0.8 && (
                <div className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <Award className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Excellent task completion rate!</p>
                    <p className="text-green-700">
                      You're completing{' '}
                      {Math.round(((stats?.tickets.done || 0) / (stats?.tickets.total || 1)) * 100)}
                      % of your tasks
                    </p>
                  </div>
                </div>
              )}

            {(stats?.timeTracking.thisWeek || 0) > 30 && (
              <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Strong weekly performance</p>
                  <p className="text-blue-700">
                    You're on track with {Math.floor(stats?.timeTracking.thisWeek || 0)} hours this
                    week
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

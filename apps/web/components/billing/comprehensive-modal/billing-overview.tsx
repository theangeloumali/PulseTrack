'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import {Badge} from '@workspace/ui/components/badge';
import {Progress} from '@workspace/ui/components/progress';
import type {BillingPeriod} from '@/lib/db/schema';
import {format, differenceInDays} from 'date-fns';
import {
  Clock,
  DollarSign,
  Users,
  FolderOpen,
  TrendingUp,
  Calendar,
  Target,
  PieChart,
} from 'lucide-react';

interface BillingOverviewProps {
  billingPeriod: BillingPeriod;
  billingReport: any;
  summaryStats: {
    totalHours: number;
    totalAmount: number;
    userCount: number;
    projectCount: number;
    billableHours: number;
    nonBillableHours: number;
  };
  isLoading: boolean;
}

export function BillingOverview({
  billingPeriod,
  billingReport,
  summaryStats,
  isLoading,
}: BillingOverviewProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const periodDuration =
    differenceInDays(new Date(billingPeriod.end_date), new Date(billingPeriod.start_date)) + 1;

  const averageHoursPerDay = summaryStats.totalHours / periodDuration;
  const averageRevenuePerDay = summaryStats.totalAmount / periodDuration;

  // Calculate productivity metrics
  const hoursPerUser =
    summaryStats.userCount > 0 ? summaryStats.totalHours / summaryStats.userCount : 0;
  const revenuePerUser =
    summaryStats.userCount > 0 ? summaryStats.totalAmount / summaryStats.userCount : 0;
  const averageHourlyRate =
    summaryStats.totalHours > 0 ? summaryStats.totalAmount / summaryStats.totalHours : 0;

  // Get user breakdown data
  const userBreakdown = getUserBreakdown(billingReport);
  const projectBreakdown = getProjectBreakdown(billingReport);

  return (
    <div className="space-y-6">
      {/* Period Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
                <div className="text-2xl font-bold">{summaryStats.totalHours.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">
                  {averageHoursPerDay.toFixed(1)} hrs/day avg
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
                <div className="text-2xl font-bold">${summaryStats.totalAmount.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">
                  ${averageRevenuePerDay.toFixed(2)}/day avg
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Users</div>
                <div className="text-2xl font-bold">{summaryStats.userCount}</div>
                <div className="text-xs text-muted-foreground">
                  {hoursPerUser.toFixed(1)} hrs/user avg
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Avg Rate</div>
                <div className="text-2xl font-bold">${averageHourlyRate.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">per hour</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Period Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Duration</div>
              <div className="text-lg">{periodDuration} days</div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(billingPeriod.start_date), 'EEE, MMM dd')} -{' '}
                {format(new Date(billingPeriod.end_date), 'EEE, MMM dd, yyyy')}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Frequency</div>
              <Badge variant="outline" className="text-sm">
                {billingPeriod.frequency.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Status</div>
              <div className="flex flex-col gap-1">
                <Badge variant={billingPeriod.status === 'active' ? 'default' : 'secondary'}>
                  {billingPeriod.status.replace('_', ' ').toUpperCase()}
                </Badge>
                {billingPeriod.payment_due_date && (
                  <div className="text-xs text-muted-foreground">
                    Due: {format(new Date(billingPeriod.payment_due_date), 'MMM dd, yyyy')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Breakdown
            </CardTitle>
            <CardDescription>Hours and revenue contribution by team member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userBreakdown.slice(0, 5).map((user, index) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.hours.toFixed(1)} hours
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${user.amount.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">${user.rate.toFixed(2)}/hr</div>
                  </div>
                </div>
              ))}
              {userBreakdown.length > 5 && (
                <div className="text-sm text-muted-foreground text-center pt-2">
                  +{userBreakdown.length - 5} more users
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Project Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Project Distribution
            </CardTitle>
            <CardDescription>Time allocation across projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectBreakdown.slice(0, 5).map((project, index) => {
                const percentage = (project.hours / summaryStats.totalHours) * 100;
                return (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">{project.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {project.hours.toFixed(1)}h ({percentage.toFixed(0)}%)
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
              {projectBreakdown.length > 5 && (
                <div className="text-sm text-muted-foreground text-center pt-2">
                  +{projectBreakdown.length - 5} more projects
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper functions to process billing report data
function getUserBreakdown(billingReport: any) {
  if (!billingReport) return [];

  const users: {
    [key: string]: {
      name: string;
      hours: number;
      amount: number;
      rate: number;
    };
  } = {};

  Object.entries(billingReport).forEach(([date, dateData]: [string, any]) => {
    Object.entries(dateData).forEach(([userId, userData]: [string, any]) => {
      const userName = `${userData.userFirstName} ${userData.userLastName}`;
      const userHours = userData.totalHours || 0;
      const userAmount = userData.totalAmount || 0;

      if (!users[userId]) {
        users[userId] = {
          name: userName,
          hours: 0,
          amount: 0,
          rate: 0,
        };
      }

      users[userId].hours += userHours;
      users[userId].amount += userAmount;
    });
  });

  // Calculate rates and sort by amount
  return Object.entries(users)
    .map(([id, user]) => ({
      id,
      ...user,
      rate: user.hours > 0 ? user.amount / user.hours : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function getProjectBreakdown(billingReport: any) {
  if (!billingReport) return [];

  const projects: {[key: string]: {name: string; hours: number}} = {};

  Object.entries(billingReport).forEach(([date, dateData]: [string, any]) => {
    Object.entries(dateData).forEach(([userId, userData]: [string, any]) => {
      if (userData.projects) {
        Object.entries(userData.projects).forEach(([projectId, projectData]: [string, any]) => {
          const projectName = projectData.name || `Project ${projectId.slice(0, 8)}`;
          const projectHours = projectData.totalHours || 0;

          if (!projects[projectId]) {
            projects[projectId] = {
              name: projectName,
              hours: 0,
            };
          }

          projects[projectId].hours += projectHours;
        });
      }
    });
  });

  return Object.entries(projects)
    .map(([id, project]) => ({
      id,
      ...project,
    }))
    .sort((a, b) => b.hours - a.hours);
}

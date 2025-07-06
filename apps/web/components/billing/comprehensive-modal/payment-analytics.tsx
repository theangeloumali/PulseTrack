"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Progress } from "@workspace/ui/components/progress";
import type { BillingPeriod } from "@/lib/db/schema";
import {
  format,
  differenceInDays,
  subMonths,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";

interface PaymentAnalyticsProps {
  billingPeriod: BillingPeriod;
  companyId: string;
}

interface MetricCard {
  title: string;
  value: string;
  change: number;
  trend: "up" | "down" | "stable";
  description: string;
  icon: React.ReactNode;
  color: string;
}

export function PaymentAnalytics({
  billingPeriod,
  companyId,
}: PaymentAnalyticsProps) {
  const [timeRange, setTimeRange] = useState("6months");
  const [comparisonMode, setComparisonMode] = useState("previous-period");

  // Mock analytics data - in real implementation, this would come from API
  const analyticsData = useMemo(() => {
    const currentPeriodDays =
      differenceInDays(
        new Date(billingPeriod.end_date),
        new Date(billingPeriod.start_date),
      ) + 1;

    // Mock historical data for comparison
    const mockHistoricalPeriods = Array.from({ length: 12 }, (_, i) => ({
      id: `period-${i}`,
      name: `Period ${12 - i}`,
      start_date: format(
        subMonths(new Date(billingPeriod.start_date), 12 - i),
        "yyyy-MM-dd",
      ),
      end_date: format(
        subMonths(new Date(billingPeriod.end_date), 12 - i),
        "yyyy-MM-dd",
      ),
      total_amount: 15000 + (Math.random() - 0.5) * 5000,
      total_hours: 120 + (Math.random() - 0.5) * 40,
      payment_status: ["pending", "sent", "paid", "overdue"][
        Math.floor(Math.random() * 4)
      ] as any,
      days_to_payment: Math.floor(Math.random() * 45) + 1,
      user_count: 3 + Math.floor(Math.random() * 3),
      project_count: 2 + Math.floor(Math.random() * 3),
    }));

    // Calculate metrics for current period
    const currentAmount = billingPeriod.payment_amount || 18500;
    const currentHours = 140; // Mock hours
    const currentRate = currentHours > 0 ? currentAmount / currentHours : 0;

    // Previous period for comparison
    const previousPeriod =
      mockHistoricalPeriods[mockHistoricalPeriods.length - 1];
    const previousAmount = previousPeriod.total_amount;
    const previousHours = previousPeriod.total_hours;
    const previousRate = previousHours > 0 ? previousAmount / previousHours : 0;

    // Calculate changes
    const amountChange =
      previousAmount > 0
        ? ((currentAmount - previousAmount) / previousAmount) * 100
        : 0;
    const hoursChange =
      previousHours > 0
        ? ((currentHours - previousHours) / previousHours) * 100
        : 0;
    const rateChange =
      previousRate > 0
        ? ((currentRate - previousRate) / previousRate) * 100
        : 0;

    return {
      current: {
        amount: currentAmount,
        hours: currentHours,
        rate: currentRate,
        days: currentPeriodDays,
        userCount: 4,
        projectCount: 3,
      },
      previous: {
        amount: previousAmount,
        hours: previousHours,
        rate: previousRate,
      },
      changes: {
        amount: amountChange,
        hours: hoursChange,
        rate: rateChange,
      },
      historical: mockHistoricalPeriods,
    };
  }, [billingPeriod, timeRange]);

  const metricCards: MetricCard[] = [
    {
      title: "Revenue",
      value: `$${analyticsData.current.amount.toFixed(2)}`,
      change: analyticsData.changes.amount,
      trend:
        analyticsData.changes.amount > 0
          ? "up"
          : analyticsData.changes.amount < 0
            ? "down"
            : "stable",
      description: "Total billing amount",
      icon: <DollarSign className="h-5 w-5" />,
      color: "text-green-600",
    },
    {
      title: "Hours Tracked",
      value: analyticsData.current.hours.toFixed(1),
      change: analyticsData.changes.hours,
      trend:
        analyticsData.changes.hours > 0
          ? "up"
          : analyticsData.changes.hours < 0
            ? "down"
            : "stable",
      description: "Total billable hours",
      icon: <Clock className="h-5 w-5" />,
      color: "text-blue-600",
    },
    {
      title: "Average Rate",
      value: `$${analyticsData.current.rate.toFixed(2)}`,
      change: analyticsData.changes.rate,
      trend:
        analyticsData.changes.rate > 0
          ? "up"
          : analyticsData.changes.rate < 0
            ? "down"
            : "stable",
      description: "Average hourly rate",
      icon: <Target className="h-5 w-5" />,
      color: "text-purple-600",
    },
    {
      title: "Efficiency",
      value: `${(analyticsData.current.amount / analyticsData.current.days).toFixed(0)}`,
      change: 12.5,
      trend: "up",
      description: "Daily revenue average",
      icon: <Activity className="h-5 w-5" />,
      color: "text-orange-600",
    },
  ];

  const paymentStatusDistribution = useMemo(() => {
    const statuses = analyticsData.historical.reduce(
      (acc, period) => {
        acc[period.payment_status] = (acc[period.payment_status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(statuses).map(([status, count]) => ({
      status,
      count,
      percentage: (count / analyticsData.historical.length) * 100,
    }));
  }, [analyticsData.historical]);

  const averagePaymentTime = useMemo(() => {
    const paidPeriods = analyticsData.historical.filter(
      (p) => p.payment_status === "paid",
    );
    if (paidPeriods.length === 0) return 0;

    const totalDays = paidPeriods.reduce(
      (sum, period) => sum + period.days_to_payment,
      0,
    );
    return Math.round(totalDays / paidPeriods.length);
  }, [analyticsData.historical]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payment Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Performance insights and trends
          </p>
        </div>

        <div className="flex gap-2">
          <Select value={comparisonMode} onValueChange={setComparisonMode}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previous-period">vs Previous</SelectItem>
              <SelectItem value="same-period-last-year">
                vs Last Year
              </SelectItem>
              <SelectItem value="average">vs Average</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
              <SelectItem value="2years">2 Years</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className={metric.color}>{metric.icon}</div>
                <div className="flex items-center gap-1 text-sm">
                  {metric.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : metric.trend === "down" ? (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  ) : null}
                  <span
                    className={`font-medium ${
                      metric.trend === "up"
                        ? "text-green-600"
                        : metric.trend === "down"
                          ? "text-red-600"
                          : "text-gray-600"
                    }`}
                  >
                    {metric.change > 0 ? "+" : ""}
                    {metric.change.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="text-sm text-muted-foreground">
                  {metric.description}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Trend Chart (Mock) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue Trend
          </CardTitle>
          <CardDescription>
            Monthly revenue over the selected time period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2 p-4">
            {analyticsData.historical.slice(-6).map((period, index) => {
              const height =
                (period.total_amount /
                  Math.max(
                    ...analyticsData.historical.map((p) => p.total_amount),
                  )) *
                100;
              return (
                <div
                  key={period.id}
                  className="flex flex-col items-center gap-2 flex-1"
                >
                  <div
                    className="bg-blue-500 rounded-t w-full transition-all hover:bg-blue-600"
                    style={{ height: `${height}%` }}
                    title={`$${period.total_amount.toFixed(2)}`}
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {format(new Date(period.start_date), "MMM")}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Payment Status Distribution
            </CardTitle>
            <CardDescription>
              Historical payment status breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentStatusDistribution.map((item) => (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        item.status === "paid"
                          ? "bg-green-500"
                          : item.status === "sent"
                            ? "bg-blue-500"
                            : item.status === "pending"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                      }`}
                    />
                    <span className="capitalize font-medium">
                      {item.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item.count} ({item.percentage.toFixed(1)}%)
                  </div>
                </div>
                <Progress value={item.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Performance Insights
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Average Payment Time</div>
                  <div className="text-sm text-muted-foreground">
                    Days from invoice to payment
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-600">
                  {averagePaymentTime} days
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">Collection Rate</div>
                  <div className="text-sm text-muted-foreground">
                    Percentage of invoices paid
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">
                  {(
                    paymentStatusDistribution.find((s) => s.status === "paid")
                      ?.percentage || 0
                  ).toFixed(0)}
                  %
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="font-medium">Resource Utilization</div>
                  <div className="text-sm text-muted-foreground">
                    Hours per team member
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-purple-600">
                  {(
                    analyticsData.current.hours /
                    analyticsData.current.userCount
                  ).toFixed(1)}
                  h
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="font-medium">Growth Rate</div>
                  <div className="text-sm text-muted-foreground">
                    Revenue change vs previous
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-xl font-bold ${
                    analyticsData.changes.amount > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {analyticsData.changes.amount > 0 ? "+" : ""}
                  {analyticsData.changes.amount.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Recommendations
          </CardTitle>
          <CardDescription>
            AI-powered insights to improve your billing performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analyticsData.changes.amount < -10 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <div className="font-medium text-red-800">
                    Revenue Decline Detected
                  </div>
                  <div className="text-sm text-red-700">
                    Revenue is down{" "}
                    {Math.abs(analyticsData.changes.amount).toFixed(1)}%
                    compared to the previous period. Consider reviewing project
                    scope or hourly rates.
                  </div>
                </div>
              </div>
            )}

            {averagePaymentTime > 35 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-medium text-yellow-800">
                    Long Payment Cycles
                  </div>
                  <div className="text-sm text-yellow-700">
                    Average payment time is {averagePaymentTime} days. Consider
                    offering early payment discounts or implementing automated
                    follow-ups.
                  </div>
                </div>
              </div>
            )}

            {analyticsData.changes.rate > 0 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-green-800">
                    Rate Optimization Success
                  </div>
                  <div className="text-sm text-green-700">
                    Your average hourly rate increased by{" "}
                    {analyticsData.changes.rate.toFixed(1)}%. Great work on
                    value optimization!
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Target className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-blue-800">
                  Optimization Opportunity
                </div>
                <div className="text-sm text-blue-700">
                  Consider implementing milestone-based billing to improve cash
                  flow and reduce payment delays.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

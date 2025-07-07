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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  AlertTriangle,
  Clock,
  Zap,
  Calendar,
  User,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Target,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@/lib/db/schema";

interface PriorityInsightsProps {
  userId: string;
  companyId: string;
  userRole: UserRole;
}

interface PriorityItem {
  id: string;
  title: string;
  description: string;
  type: "overdue" | "urgent" | "blocked" | "deadline";
  priority: "high" | "medium" | "low";
  daysOverdue?: number;
  assignee?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
  href: string;
}

interface PriorityData {
  overdue: PriorityItem[];
  urgent: PriorityItem[];
  blocked: PriorityItem[];
  upcomingDeadlines: PriorityItem[];
}

// Mock data fetcher - replace with actual API call
const fetchPriorityInsights = async (
  userId: string,
  companyId: string,
  userRole: UserRole,
): Promise<PriorityData> => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    overdue: [
      {
        id: "1",
        title: "Complete project proposal",
        description: "Client presentation due last week",
        type: "overdue",
        priority: "high",
        daysOverdue: 3,
        assignee: { id: "user1", name: "John Doe" },
        project: { id: "proj1", name: "Website Redesign" },
        href: "/tickets/1",
      },
      {
        id: "2",
        title: "Review security audit",
        description: "Security team waiting for feedback",
        type: "overdue",
        priority: "medium",
        daysOverdue: 1,
        assignee: { id: "user2", name: "Jane Smith" },
        project: { id: "proj2", name: "Platform Security" },
        href: "/tickets/2",
      },
    ],
    urgent: [
      {
        id: "3",
        title: "Fix production bug",
        description: "Users reporting login issues",
        type: "urgent",
        priority: "high",
        assignee: { id: "user3", name: "Dev Team" },
        project: { id: "proj3", name: "Bug Fixes" },
        href: "/tickets/3",
      },
    ],
    blocked: [
      {
        id: "4",
        title: "Database migration",
        description: "Waiting for infrastructure approval",
        type: "blocked",
        priority: "high",
        assignee: { id: "user4", name: "Backend Team" },
        project: { id: "proj4", name: "System Upgrade" },
        href: "/tickets/4",
      },
    ],
    upcomingDeadlines: [
      {
        id: "5",
        title: "Q4 report preparation",
        description: "Due in 2 days",
        type: "deadline",
        priority: "medium",
        assignee: { id: "user5", name: "Analytics Team" },
        project: { id: "proj5", name: "Quarterly Reports" },
        href: "/tickets/5",
      },
    ],
  };
};

export function PriorityInsights({
  userId,
  companyId,
  userRole,
}: PriorityInsightsProps) {
  const [selectedTab, setSelectedTab] = useState("overdue");

  const {
    data: priorityData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["priority-insights", userId, companyId, userRole],
    queryFn: () => fetchPriorityInsights(userId, companyId, userRole),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getTabConfig = () => {
    if (!priorityData) return {};

    return {
      overdue: {
        label: "Overdue",
        count: priorityData.overdue.length,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: "destructive",
        items: priorityData.overdue,
      },
      urgent: {
        label: "Urgent",
        count: priorityData.urgent.length,
        icon: <Zap className="h-4 w-4" />,
        color: "destructive",
        items: priorityData.urgent,
      },
      blocked: {
        label: "Blocked",
        count: priorityData.blocked.length,
        icon: <AlertCircle className="h-4 w-4" />,
        color: "secondary",
        items: priorityData.blocked,
      },
      deadlines: {
        label: "Deadlines",
        count: priorityData.upcomingDeadlines.length,
        icon: <Calendar className="h-4 w-4" />,
        color: "outline",
        items: priorityData.upcomingDeadlines,
      },
    };
  };

  const tabConfig = getTabConfig();

  const PriorityItemCard = ({ item }: { item: PriorityItem }) => (
    <Link href={item.href}>
      <div className="group p-3 rounded-lg border hover:border-primary/20 hover:bg-muted/30 transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                {item.title}
              </h4>
              <Badge
                variant={
                  item.priority === "high"
                    ? "destructive"
                    : item.priority === "medium"
                      ? "secondary"
                      : "outline"
                }
                className="text-xs flex-shrink-0"
              >
                {item.priority}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {item.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {item.assignee && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{item.assignee.name}</span>
                </div>
              )}

              {item.project && (
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  <span className="truncate">{item.project.name}</span>
                </div>
              )}

              {item.daysOverdue && (
                <div className="flex items-center gap-1 text-red-600">
                  <Timer className="h-3 w-3" />
                  <span>{item.daysOverdue} days overdue</span>
                </div>
              )}
            </div>
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </div>
    </Link>
  );

  const EmptyState = ({ type }: { type: string }) => (
    <div className="text-center py-8 text-muted-foreground">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
        {type === "overdue" && <AlertTriangle className="h-6 w-6" />}
        {type === "urgent" && <Zap className="h-6 w-6" />}
        {type === "blocked" && <AlertCircle className="h-6 w-6" />}
        {type === "deadlines" && <Calendar className="h-6 w-6" />}
      </div>
      <p className="text-sm">No {type} items</p>
      <p className="text-xs text-muted-foreground/70">You're all caught up!</p>
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Priority Insights</CardTitle>
          <CardDescription>
            Items that need your immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Priority Insights</CardTitle>
          <CardDescription>
            Items that need your immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load priority insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPriorityItems = Object.values(tabConfig).reduce(
    (sum, tab) => sum + (tab?.count || 0),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Priority Insights</CardTitle>
            <CardDescription>
              {totalPriorityItems > 0
                ? `${totalPriorityItems} items need attention`
                : "Everything looks good!"}
            </CardDescription>
          </div>
          {totalPriorityItems > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalPriorityItems}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            {Object.entries(tabConfig).map(([key, config]) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                <div className="flex items-center gap-1">
                  {config?.icon}
                  <span>{config?.label}</span>
                  {(config?.count || 0) > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      {config?.count}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(tabConfig).map(([key, config]) => (
            <TabsContent key={key} value={key} className="mt-4">
              {(config?.items?.length || 0) > 0 ? (
                <div className="space-y-2">
                  {config?.items?.map((item) => (
                    <PriorityItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <EmptyState type={key} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

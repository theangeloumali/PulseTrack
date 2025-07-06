"use client";

import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/db/schema";
import {
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className:
      "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200",
  },
  sent: {
    label: "Sent",
    icon: Send,
    className:
      "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle2,
    className:
      "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200",
  },
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    className:
      "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className:
      "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200",
  },
};

export function PaymentStatusBadge({
  status,
  className,
  showIcon = true,
  size = "md",
}: PaymentStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-2.5 py-1.5",
    lg: "text-base px-3 py-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Badge
      className={cn(
        config.className,
        sizeClasses[size],
        "inline-flex items-center gap-1.5 font-medium",
        className,
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import { useBillingReport, useBillingSettings } from "@/lib/hooks/useBilling";
import { useRoleAccess } from "@/lib/hooks/useRoleAccess";
import { extractTargetUserIdFromBillingPeriod } from "@/lib/db/billing-service";
import type { BillingPeriod } from "@/lib/db/schema";
import { format } from "date-fns";
import {
  X,
  Calendar,
  Clock,
  DollarSign,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  Download,
  Send,
  Eye,
  Settings,
  Printer,
  Mail,
} from "lucide-react";

// Import sub-components (we'll create these)
import { BillingOverview } from "./comprehensive-modal/billing-overview";
import { TimeDetailView } from "./comprehensive-modal/time-detail-view";
import { PaymentManagement } from "./comprehensive-modal/payment-management";
import { InvoiceGeneration } from "./comprehensive-modal/invoice-generation";
import { PaymentAnalytics } from "./comprehensive-modal/payment-analytics";
import { CompanyBranding } from "./comprehensive-modal/company-branding";

interface ComprehensiveBillingModalProps {
  billingPeriod: BillingPeriod;
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
}

export function ComprehensiveBillingModal({
  billingPeriod,
  isOpen,
  onClose,
  companyId,
}: ComprehensiveBillingModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { isSuperAdmin, isCompanyAdmin } = useRoleAccess();

  // Extract target user ID if this is a user-specific billing period
  const targetUserId = extractTargetUserIdFromBillingPeriod(billingPeriod);

  // Fetch billing report data for the period (filtered by user if applicable)
  const { data: billingReport, isLoading: reportLoading } = useBillingReport(
    companyId,
    billingPeriod.start_date,
    billingPeriod.end_date,
    targetUserId || undefined,
  );

  // Fetch company settings for branding
  const { data: companySettings } = useBillingSettings(companyId);

  // Calculate summary statistics
  const summaryStats = calculateSummaryStats(billingReport);

  if (!isOpen) return null;

  const canManagePayments = isSuperAdmin() || isCompanyAdmin();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/50 flex-shrink-0">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Calendar className="h-6 w-6" />
              Billing Period Details
            </CardTitle>
            <CardDescription className="mt-1 text-base">
              <span className="font-medium">{billingPeriod.name}</span> •
              {format(new Date(billingPeriod.start_date), "MMM dd")} -{" "}
              {format(new Date(billingPeriod.end_date), "MMM dd, yyyy")} •
              <PaymentStatusBadge status={billingPeriod.payment_status} />
            </CardDescription>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6 mr-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Hours</div>
              <div className="text-lg font-bold">
                {summaryStats.totalHours.toFixed(1)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-lg font-bold">
                ${summaryStats.totalAmount.toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Resources</div>
              <div className="text-lg font-bold">{summaryStats.userCount}</div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-12">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="time-details"
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Time Details
              </TabsTrigger>
              {canManagePayments && (
                <TabsTrigger
                  value="payments"
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Payment Management
                </TabsTrigger>
              )}
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoice Generation
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              {canManagePayments && (
                <TabsTrigger
                  value="branding"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Company Branding
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="overview" className="h-full m-0 p-6">
                <BillingOverview
                  billingPeriod={billingPeriod}
                  billingReport={billingReport}
                  summaryStats={summaryStats}
                  isLoading={reportLoading}
                />
              </TabsContent>

              <TabsContent value="time-details" className="h-full m-0 p-6">
                <TimeDetailView
                  billingPeriod={billingPeriod}
                  billingReport={billingReport}
                  companyId={companyId}
                  isLoading={reportLoading}
                />
              </TabsContent>

              {canManagePayments && (
                <TabsContent value="payments" className="h-full m-0 p-6">
                  <PaymentManagement
                    billingPeriod={billingPeriod}
                    companyId={companyId}
                    onClose={() => {}} // Keep modal open after payment actions
                  />
                </TabsContent>
              )}

              <TabsContent value="invoices" className="h-full m-0 p-6">
                <InvoiceGeneration
                  billingPeriod={billingPeriod}
                  billingReport={billingReport}
                  companyId={companyId}
                  summaryStats={summaryStats}
                />
              </TabsContent>

              <TabsContent value="analytics" className="h-full m-0 p-6">
                <PaymentAnalytics
                  billingPeriod={billingPeriod}
                  companyId={companyId}
                />
              </TabsContent>

              {canManagePayments && (
                <TabsContent value="branding" className="h-full m-0 p-6">
                  <CompanyBranding
                    companyId={companyId}
                    companySettings={companySettings}
                  />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>

        {/* Footer with Quick Actions */}
        <div className="border-t bg-muted/50 p-4 flex justify-between items-center flex-shrink-0">
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print Summary
            </Button>
          </div>

          <div className="flex gap-2">
            {billingPeriod.payment_status !== "paid" && canManagePayments && (
              <>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
                <Button size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Helper function to calculate summary statistics
function calculateSummaryStats(billingReport: any) {
  if (!billingReport) {
    return {
      totalHours: 0,
      totalAmount: 0,
      userCount: 0,
      projectCount: 0,
      billableHours: 0,
      nonBillableHours: 0,
    };
  }

  let totalHours = 0;
  let totalAmount = 0;
  const users = new Set();
  const projects = new Set();
  let billableHours = 0;
  let nonBillableHours = 0;

  Object.entries(billingReport).forEach(([date, dateData]: [string, any]) => {
    Object.entries(dateData).forEach(([userId, userData]: [string, any]) => {
      users.add(userId);
      const userHours = userData.totalHours || 0;
      const userAmount = userData.totalAmount || 0;

      totalHours += userHours;
      totalAmount += userAmount;

      // Track projects
      if (userData.projects) {
        Object.keys(userData.projects).forEach((projectId) =>
          projects.add(projectId),
        );
      }

      // For now, assume all tracked time is billable
      // This could be enhanced with actual billable tracking
      billableHours += userHours;
    });
  });

  return {
    totalHours,
    totalAmount,
    userCount: users.size,
    projectCount: projects.size,
    billableHours,
    nonBillableHours,
  };
}

"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { PaymentStatusBadge } from "./payment-status-badge";
import {
  useDeleteMultipleOutstandingPayments,
  useDeleteOutstandingPaymentsByStatus,
} from "@/lib/hooks/usePayments";
import type { BillingPeriod } from "@/lib/db/schema";
import { format } from "date-fns";
import {
  AlertTriangle,
  Trash2,
  X,
  Loader2,
  CheckSquare,
  Square,
  Filter,
  Target,
} from "lucide-react";

interface OutstandingPaymentsDeletionModalProps {
  outstandingPayments: BillingPeriod[];
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
}

export function OutstandingPaymentsDeletionModal({
  outstandingPayments,
  isOpen,
  onClose,
  companyId,
}: OutstandingPaymentsDeletionModalProps) {
  const [deletionMode, setDeletionMode] = useState<"individual" | "by_status">(
    "individual",
  );
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(
    new Set(),
  );
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(),
  );

  const deleteMultipleMutation =
    useDeleteMultipleOutstandingPayments(companyId);
  const deleteByStatusMutation =
    useDeleteOutstandingPaymentsByStatus(companyId);

  const isDeleting =
    deleteMultipleMutation.isPending || deleteByStatusMutation.isPending;

  // Get unique statuses from outstanding payments
  const availableStatuses = Array.from(
    new Set(outstandingPayments.map((p) => p.payment_status)),
  ).filter((status) => status !== "paid"); // Don't allow deletion of paid periods

  // Filter out paid periods for safety
  const deletablePayments = outstandingPayments.filter(
    (p) => p.payment_status !== "paid",
  );

  const togglePeriodSelection = (periodId: string) => {
    const newSelected = new Set(selectedPeriods);
    if (newSelected.has(periodId)) {
      newSelected.delete(periodId);
    } else {
      newSelected.add(periodId);
    }
    setSelectedPeriods(newSelected);
  };

  const toggleStatusSelection = (status: string) => {
    const newSelected = new Set(selectedStatuses);
    if (newSelected.has(status)) {
      newSelected.delete(status);
    } else {
      newSelected.add(status);
    }
    setSelectedStatuses(newSelected);
  };

  const selectAllPeriods = () => {
    setSelectedPeriods(new Set(deletablePayments.map((p) => p.id)));
  };

  const deselectAllPeriods = () => {
    setSelectedPeriods(new Set());
  };

  const handleDelete = async () => {
    try {
      if (deletionMode === "individual") {
        if (selectedPeriods.size === 0) {
          alert("Please select at least one payment to delete");
          return;
        }

        const confirmation = window.confirm(
          `Are you sure you want to delete ${selectedPeriods.size} outstanding payment(s)? This action cannot be undone.`,
        );

        if (!confirmation) return;

        await deleteMultipleMutation.mutateAsync(Array.from(selectedPeriods));
        alert(
          `Successfully deleted ${selectedPeriods.size} outstanding payment(s)`,
        );
      } else {
        if (selectedStatuses.size === 0) {
          alert("Please select at least one status");
          return;
        }

        const affectedCount = deletablePayments.filter((p) =>
          selectedStatuses.has(p.payment_status),
        ).length;

        const confirmation = window.confirm(
          `Are you sure you want to delete all ${affectedCount} payment(s) with status(es): ${Array.from(selectedStatuses).join(", ")}? This action cannot be undone.`,
        );

        if (!confirmation) return;

        await deleteByStatusMutation.mutateAsync(Array.from(selectedStatuses));
        alert(
          `Successfully deleted ${affectedCount} outstanding payment(s) by status`,
        );
      }

      onClose();
    } catch (error) {
      console.error("Error deleting outstanding payments:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete outstanding payments",
      );
    }
  };

  if (!isOpen) return null;

  const selectedPeriodsForStatus = deletablePayments.filter((p) =>
    selectedStatuses.has(p.payment_status),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Outstanding Payments
            </CardTitle>
            <CardDescription>
              Manage and delete outstanding payment periods -{" "}
              {deletablePayments.length} deletable payments available
            </CardDescription>
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

        <CardContent className="space-y-6">
          {/* Deletion Mode Selection */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Deletion Method</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={deletionMode === "individual" ? "default" : "outline"}
                onClick={() => setDeletionMode("individual")}
                className="flex items-center gap-2 justify-start h-auto p-4"
              >
                <Target className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Select Individual Payments</div>
                  <div className="text-xs text-muted-foreground">
                    Choose specific payments to delete
                  </div>
                </div>
              </Button>
              <Button
                variant={deletionMode === "by_status" ? "default" : "outline"}
                onClick={() => setDeletionMode("by_status")}
                className="flex items-center gap-2 justify-start h-auto p-4"
              >
                <Filter className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Delete by Status</div>
                  <div className="text-xs text-muted-foreground">
                    Delete all payments with selected statuses
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* Individual Selection Mode */}
          {deletionMode === "individual" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Select Payments to Delete ({selectedPeriods.size} selected)
                </h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllPeriods}
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={deselectAllPeriods}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
                {deletablePayments.map((period) => (
                  <div
                    key={period.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPeriods.has(period.id)
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => togglePeriodSelection(period.id)}
                  >
                    <div className="flex items-center gap-3">
                      {selectedPeriods.has(period.id) ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{period.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(period.start_date), "MMM dd")} -{" "}
                          {format(new Date(period.end_date), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PaymentStatusBadge
                        status={period.payment_status}
                        size="sm"
                      />
                      {period.payment_amount && (
                        <span className="text-sm font-medium">
                          ${period.payment_amount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Selection Mode */}
          {deletionMode === "by_status" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Select Payment Statuses to Delete
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {availableStatuses.map((status) => {
                  const count = deletablePayments.filter(
                    (p) => p.payment_status === status,
                  ).length;
                  return (
                    <div
                      key={status}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedStatuses.has(status)
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleStatusSelection(status)}
                    >
                      <div className="flex items-center gap-3">
                        {selectedStatuses.has(status) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <PaymentStatusBadge status={status} />
                          <div className="text-xs text-muted-foreground mt-1">
                            {count} payment{count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedStatuses.size > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
                  <div className="font-medium text-blue-700 dark:text-blue-300">
                    Preview: {selectedPeriodsForStatus.length} payment(s) will
                    be deleted
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    Statuses: {Array.from(selectedStatuses).join(", ")}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warning Message */}
          <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <strong>Warning: Permanent Deletion</strong>
            </div>
            <p className="text-sm text-destructive/80 mt-1">
              This action will permanently delete the selected outstanding
              payments and cannot be undone. Payment history will be preserved
              for audit purposes, but the billing periods will be removed from
              the system.
            </p>
          </div>

          {/* Summary */}
          {(selectedPeriods.size > 0 ||
            selectedPeriodsForStatus.length > 0) && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium">Deletion Summary</div>
              <div className="text-sm text-muted-foreground">
                {deletionMode === "individual"
                  ? `${selectedPeriods.size} individual payment(s) selected for deletion`
                  : `${selectedPeriodsForStatus.length} payment(s) will be deleted by status`}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                isDeleting ||
                (deletionMode === "individual" && selectedPeriods.size === 0) ||
                (deletionMode === "by_status" && selectedStatuses.size === 0)
              }
              className="flex-1"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Outstanding Payments
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

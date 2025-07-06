'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { PaymentStatusBadge } from './payment-status-badge';
import { usePaymentHistory } from '@/lib/hooks/usePayments';
import type { BillingPeriod } from '@/lib/db/schema';
import { format } from 'date-fns';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Loader2, 
  RefreshCw,
  History,
  DollarSign
} from 'lucide-react';

interface PaymentDeletionModalProps {
  billingPeriod: BillingPeriod | null;
  isOpen: boolean;
  onClose: () => void;
  onDeletePaymentHistory: (paymentHistoryId: string) => void;
  onResetPaymentStatus: (billingPeriodId: string) => void;
  onDeleteAllPaymentHistory: (billingPeriodId: string) => void;
  isDeleting: boolean;
}

export function PaymentDeletionModal({
  billingPeriod,
  isOpen,
  onClose,
  onDeletePaymentHistory,
  onResetPaymentStatus,
  onDeleteAllPaymentHistory,
  isDeleting,
}: PaymentDeletionModalProps) {
  const [action, setAction] = useState<'single' | 'reset' | 'all'>('single');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const { data: paymentHistory, isLoading: historyLoading } = usePaymentHistory(
    billingPeriod?.id || ''
  );

  if (!isOpen || !billingPeriod) return null;

  const isPaid = billingPeriod.payment_status === 'paid';
  const hasPaymentData = billingPeriod.payment_amount || 
                         billingPeriod.payment_reference || 
                         billingPeriod.payment_received_date;

  const handleConfirmAction = () => {
    if (!billingPeriod) return;

    switch (action) {
      case 'single':
        if (selectedHistoryId) {
          onDeletePaymentHistory(selectedHistoryId);
        }
        break;
      case 'reset':
        onResetPaymentStatus(billingPeriod.id);
        break;
      case 'all':
        onDeleteAllPaymentHistory(billingPeriod.id);
        break;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Manage Payment Data
            </CardTitle>
            <CardDescription>
              {billingPeriod.name} • {format(new Date(billingPeriod.start_date), 'MMM dd')} - {format(new Date(billingPeriod.end_date), 'MMM dd, yyyy')}
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
          {/* Current Payment Status */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Current Payment Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <PaymentStatusBadge status={billingPeriod.payment_status} />
              </div>
              {billingPeriod.payment_amount && (
                <div className="flex items-center justify-between">
                  <span>Amount:</span>
                  <span className="font-medium">${billingPeriod.payment_amount}</span>
                </div>
              )}
              {billingPeriod.payment_reference && (
                <div className="flex items-center justify-between">
                  <span>Reference:</span>
                  <span className="font-medium">{billingPeriod.payment_reference}</span>
                </div>
              )}
              {billingPeriod.payment_received_date && (
                <div className="flex items-center justify-between">
                  <span>Received:</span>
                  <span>{format(new Date(billingPeriod.payment_received_date), 'MMM dd, yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select Action</h3>
            
            <div className="grid gap-3">
              {/* Delete Single Payment History */}
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  id="single"
                  name="action"
                  value="single"
                  checked={action === 'single'}
                  onChange={(e) => setAction(e.target.value as 'single')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="single" className="font-medium cursor-pointer">
                    Delete Individual Payment History Entry
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Remove a specific payment history record
                  </p>
                </div>
              </div>

              {/* Reset Payment Status */}
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  id="reset"
                  name="action"
                  value="reset"
                  checked={action === 'reset'}
                  onChange={(e) => setAction(e.target.value as 'reset')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="reset" className="font-medium cursor-pointer">
                    Reset Payment Status
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Clear all payment data and reset status to pending
                  </p>
                  {isPaid && (
                    <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300">
                      <AlertTriangle className="inline h-3 w-3 mr-1" />
                      This period is marked as PAID - resetting will require careful review
                    </div>
                  )}
                </div>
              </div>

              {/* Delete All Payment History */}
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  id="all"
                  name="action"
                  value="all"
                  checked={action === 'all'}
                  onChange={(e) => setAction(e.target.value as 'all')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="all" className="font-medium cursor-pointer">
                    Delete All Payment History
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Remove all payment history entries for this period
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History Selection (for single deletion) */}
          {action === 'single' && (
            <div className="space-y-3">
              <h4 className="font-medium">Select Payment History Entry</h4>
              {historyLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">Loading payment history...</p>
                </div>
              ) : paymentHistory && paymentHistory.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {paymentHistory.map((entry: any) => (
                    <div
                      key={entry.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedHistoryId === entry.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedHistoryId(entry.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{entry.action}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
                          </div>
                          {entry.notes && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {entry.notes}
                            </div>
                          )}
                        </div>
                        <input
                          type="radio"
                          name="historyEntry"
                          checked={selectedHistoryId === entry.id}
                          onChange={() => setSelectedHistoryId(entry.id)}
                          className="ml-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No payment history found</p>
                </div>
              )}
            </div>
          )}

          {/* Warning Messages */}
          {action === 'reset' && hasPaymentData && (
            <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <strong>Warning: Data Loss</strong>
              </div>
              <p className="text-sm text-destructive/80 mt-1">
                This will permanently clear all payment information including amount, reference, dates, and notes.
                This action cannot be undone.
              </p>
            </div>
          )}

          {action === 'all' && (
            <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <strong>Warning: Complete History Deletion</strong>
              </div>
              <p className="text-sm text-destructive/80 mt-1">
                This will permanently delete all payment history entries for this billing period.
                This action cannot be undone and will remove audit trail data.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmAction} 
              disabled={
                isDeleting || 
                (action === 'single' && !selectedHistoryId)
              }
              className="flex-1"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {action === 'reset' ? (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {action === 'single' ? 'Delete Entry' : 
                   action === 'reset' ? 'Reset Payment' : 
                   'Delete All History'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
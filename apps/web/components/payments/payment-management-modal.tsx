'use client';

import { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { PaymentStatusBadge } from './payment-status-badge';
import { 
  useUpdatePaymentStatus, 
  useMarkInvoiceSent, 
  useMarkPaymentReceived,
  useDeletePaymentHistory,
  useResetPaymentStatus,
  useDeleteAllPaymentHistory
} from '@/lib/hooks/usePayments';
import type { BillingPeriod, PaymentStatus } from '@/lib/db/schema';
import { format } from 'date-fns';
import { 
  X, 
  Send, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  FileText,
  AlertTriangle,
  Trash2 
} from 'lucide-react';

interface PaymentManagementModalProps {
  billingPeriod: BillingPeriod;
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
}

export function PaymentManagementModal({ 
  billingPeriod, 
  isOpen, 
  onClose, 
  companyId 
}: PaymentManagementModalProps) {
  const [action, setAction] = useState<'status' | 'send' | 'receive' | 'delete'>('status');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(billingPeriod.payment_status);
  const [dueDate, setDueDate] = useState(
    billingPeriod.payment_due_date ? 
    format(new Date(billingPeriod.payment_due_date), 'yyyy-MM-dd') : 
    ''
  );
  const [paymentAmount, setPaymentAmount] = useState(
    billingPeriod.payment_amount?.toString() || ''
  );
  const [paymentReference, setPaymentReference] = useState(
    billingPeriod.payment_reference || ''
  );
  const [notes, setNotes] = useState(billingPeriod.notes || '');

  const updateStatusMutation = useUpdatePaymentStatus(companyId);
  const markSentMutation = useMarkInvoiceSent(companyId);
  const markReceivedMutation = useMarkPaymentReceived(companyId);
  const deletePaymentHistoryMutation = useDeletePaymentHistory(companyId);
  const resetPaymentStatusMutation = useResetPaymentStatus(companyId);
  const deleteAllPaymentHistoryMutation = useDeleteAllPaymentHistory(companyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      switch (action) {
        case 'status':
          await updateStatusMutation.mutateAsync({
            billing_period_id: billingPeriod.id,
            payment_status: paymentStatus,
            payment_due_date: dueDate || undefined,
            notes: notes || undefined,
          });
          break;

        case 'send':
          await markSentMutation.mutateAsync({
            billing_period_id: billingPeriod.id,
            due_date: dueDate || undefined,
          });
          break;

        case 'receive':
          await markReceivedMutation.mutateAsync({
            billing_period_id: billingPeriod.id,
            amount: paymentAmount ? parseFloat(paymentAmount) : undefined,
            reference: paymentReference || undefined,
          });
          break;
      }

      onClose();
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const isLoading = updateStatusMutation.isPending || 
                   markSentMutation.isPending || 
                   markReceivedMutation.isPending ||
                   deletePaymentHistoryMutation.isPending ||
                   resetPaymentStatusMutation.isPending ||
                   deleteAllPaymentHistoryMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Payment</CardTitle>
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
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Current Status:</span>
            <PaymentStatusBadge status={billingPeriod.payment_status} />
          </div>

          {/* Action Selector */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={action === 'status' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAction('status')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Update
            </Button>
            <Button
              variant={action === 'send' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAction('send')}
              className="flex items-center gap-2"
              disabled={billingPeriod.payment_status === 'sent' || billingPeriod.payment_status === 'paid'}
            >
              <Send className="h-4 w-4" />
              Send Invoice
            </Button>
            <Button
              variant={action === 'receive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAction('receive')}
              className="flex items-center gap-2"
              disabled={billingPeriod.payment_status === 'paid'}
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Paid
            </Button>
            <Button
              variant={action === 'delete' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setAction('delete')}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete/Reset
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Status Update Form */}
            {action === 'status' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="status">Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={(value: PaymentStatus) => setPaymentStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due-date">Payment Due Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="due-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm resize-none"
                    rows={3}
                    placeholder="Internal notes about this payment..."
                  />
                </div>
              </>
            )}

            {/* Send Invoice Form */}
            {action === 'send' && (
              <>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Send className="h-4 w-4" />
                    <span className="text-sm font-medium">Mark Invoice as Sent</span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    This will update the status to "Sent" and record the invoice sent date.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="send-due-date">Payment Due Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="send-due-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Receive Payment Form */}
            {action === 'receive' && (
              <>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Mark Payment as Received</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    This will update the status to "Paid" and record the payment received date.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Payment Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Payment Reference</Label>
                  <Input
                    id="reference"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction ID, check number, etc."
                  />
                </div>
              </>
            )}

            {/* Delete/Reset Payment Form */}
            {action === 'delete' && (
              <>
                <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                  <div className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Payment Deletion Options</span>
                  </div>
                  <p className="text-xs text-destructive/80 mt-1">
                    Choose how to handle payment data for this billing period.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      if (window.confirm('Reset payment status to pending and clear all payment data?')) {
                        await resetPaymentStatusMutation.mutateAsync(billingPeriod.id);
                        onClose();
                      }
                    }}
                    disabled={isLoading}
                    className="w-full justify-start"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Reset Payment Status
                    <span className="ml-auto text-xs text-muted-foreground">
                      Clear all payment data
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      if (window.confirm('Delete ALL payment history entries for this period? This cannot be undone.')) {
                        await deleteAllPaymentHistoryMutation.mutateAsync(billingPeriod.id);
                        onClose();
                      }
                    }}
                    disabled={isLoading}
                    className="w-full justify-start text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All Payment History
                    <span className="ml-auto text-xs text-muted-foreground">
                      Remove audit trail
                    </span>
                  </Button>
                </div>

                {billingPeriod.payment_status === 'paid' && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950 dark:border-yellow-800">
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Warning</span>
                    </div>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      This period is marked as PAID. Resetting will require careful review of financial records.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Action Buttons */}
            {action !== 'delete' && (
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Updating...' : 'Update Payment'}
                </Button>
              </div>
            )}

            {/* Close Button for Delete Mode */}
            {action === 'delete' && (
              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Close
                </Button>
              </div>
            )}
          </form>

          {/* Payment Information */}
          {(billingPeriod.invoice_sent_date || billingPeriod.payment_received_date) && (
            <div className="pt-4 border-t space-y-2">
              <h4 className="text-sm font-medium">Payment Timeline</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                {billingPeriod.invoice_sent_date && (
                  <div>• Invoice sent: {format(new Date(billingPeriod.invoice_sent_date), 'MMM dd, yyyy')}</div>
                )}
                {billingPeriod.payment_due_date && (
                  <div>• Due date: {format(new Date(billingPeriod.payment_due_date), 'MMM dd, yyyy')}</div>
                )}
                {billingPeriod.payment_received_date && (
                  <div>• Payment received: {format(new Date(billingPeriod.payment_received_date), 'MMM dd, yyyy')}</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
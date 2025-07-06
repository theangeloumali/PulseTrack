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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import {
  useUpdatePaymentStatus,
  useMarkInvoiceSent,
  useMarkPaymentReceived,
  useDeletePaymentHistory,
  useResetPaymentStatus,
} from "@/lib/hooks/usePayments";
import type { BillingPeriod, PaymentStatus } from "@/lib/db/schema";
import { format } from "date-fns";
import {
  CreditCard,
  Send,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  AlertCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
  Copy,
  QrCode,
  Banknote,
} from "lucide-react";

interface PaymentManagementProps {
  billingPeriod: BillingPeriod;
  companyId: string;
  onClose: () => void;
}

export function PaymentManagement({
  billingPeriod,
  companyId,
  onClose,
}: PaymentManagementProps) {
  const [activeAction, setActiveAction] = useState<
    "status" | "send" | "receive" | "delete" | "payment-links"
  >("status");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    billingPeriod.payment_status,
  );
  const [dueDate, setDueDate] = useState(
    billingPeriod.payment_due_date
      ? format(new Date(billingPeriod.payment_due_date), "yyyy-MM-dd")
      : "",
  );
  const [paymentAmount, setPaymentAmount] = useState(
    billingPeriod.payment_amount?.toString() || "",
  );
  const [paymentReference, setPaymentReference] = useState(
    billingPeriod.payment_reference || "",
  );
  const [notes, setNotes] = useState(billingPeriod.notes || "");

  const updateStatusMutation = useUpdatePaymentStatus(companyId);
  const markSentMutation = useMarkInvoiceSent(companyId);
  const markReceivedMutation = useMarkPaymentReceived(companyId);
  const deletePaymentHistoryMutation = useDeletePaymentHistory(companyId);
  const resetPaymentStatusMutation = useResetPaymentStatus(companyId);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateStatusMutation.mutateAsync({
        billing_period_id: billingPeriod.id,
        payment_status: paymentStatus,
        payment_due_date: dueDate || undefined,
        notes: notes || undefined,
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
    }
  };

  const handleMarkSent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await markSentMutation.mutateAsync({
        billing_period_id: billingPeriod.id,
        due_date: dueDate || undefined,
      });
    } catch (error) {
      console.error("Error marking invoice as sent:", error);
    }
  };

  const handleMarkReceived = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await markReceivedMutation.mutateAsync({
        billing_period_id: billingPeriod.id,
        amount: paymentAmount ? parseFloat(paymentAmount) : undefined,
        reference: paymentReference || undefined,
      });
    } catch (error) {
      console.error("Error marking payment as received:", error);
    }
  };

  const isLoading =
    updateStatusMutation.isPending ||
    markSentMutation.isPending ||
    markReceivedMutation.isPending ||
    deletePaymentHistoryMutation.isPending ||
    resetPaymentStatusMutation.isPending;

  // Mock payment methods - these would come from company settings
  const paymentMethods = [
    {
      id: "wise",
      name: "Wise Transfer",
      type: "bank_transfer",
      description: "International bank transfer via Wise",
      icon: <Banknote className="h-4 w-4" />,
      generateLink: (amount: number) =>
        `https://wise.com/send?amount=${amount}&currency=USD`,
    },
    {
      id: "paypal",
      name: "PayPal Invoice",
      type: "digital_wallet",
      description: "Send PayPal invoice",
      icon: <CreditCard className="h-4 w-4" />,
      generateLink: (amount: number) => `https://paypal.me/company/${amount}`,
    },
    {
      id: "stripe",
      name: "Credit Card",
      type: "card",
      description: "Credit/Debit card payment",
      icon: <CreditCard className="h-4 w-4" />,
      generateLink: (amount: number) =>
        `https://checkout.stripe.com/pay/amount=${amount}`,
    },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <div className="space-y-6">
      {/* Current Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Current Status
              </div>
              <PaymentStatusBadge status={billingPeriod.payment_status} />
            </div>

            {billingPeriod.invoice_sent_date && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Invoice Sent
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Send className="h-4 w-4 text-green-600" />
                  {format(
                    new Date(billingPeriod.invoice_sent_date),
                    "MMM dd, yyyy",
                  )}
                </div>
              </div>
            )}

            {billingPeriod.payment_due_date && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Due Date
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  {format(
                    new Date(billingPeriod.payment_due_date),
                    "MMM dd, yyyy",
                  )}
                </div>
              </div>
            )}

            {billingPeriod.payment_amount && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Amount</div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4 text-green-600" />$
                  {billingPeriod.payment_amount.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {billingPeriod.payment_received_date && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Payment Received</span>
              </div>
              <div className="text-sm text-green-700 mt-1">
                Received on{" "}
                {format(
                  new Date(billingPeriod.payment_received_date),
                  "MMM dd, yyyy",
                )}
                {billingPeriod.payment_reference && (
                  <> • Reference: {billingPeriod.payment_reference}</>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Actions</CardTitle>
          <CardDescription>
            Choose an action to perform on this billing period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Button
              variant={activeAction === "status" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveAction("status")}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Update Status
            </Button>

            <Button
              variant={activeAction === "send" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveAction("send")}
              className="flex items-center gap-2"
              disabled={
                billingPeriod.payment_status === "sent" ||
                billingPeriod.payment_status === "paid"
              }
            >
              <Send className="h-4 w-4" />
              Send Invoice
            </Button>

            <Button
              variant={activeAction === "receive" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveAction("receive")}
              className="flex items-center gap-2"
              disabled={billingPeriod.payment_status === "paid"}
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Paid
            </Button>

            <Button
              variant={activeAction === "payment-links" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveAction("payment-links")}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Payment Links
            </Button>

            <Button
              variant={activeAction === "delete" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setActiveAction("delete")}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Reset/Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Forms */}
      <Card>
        <CardContent className="pt-6">
          {/* Status Update Form */}
          {activeAction === "status" && (
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Payment Status</Label>
                  <Select
                    value={paymentStatus}
                    onValueChange={(value: PaymentStatus) =>
                      setPaymentStatus(value)
                    }
                  >
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this payment..."
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Updating..." : "Update Payment Status"}
              </Button>
            </form>
          )}

          {/* Send Invoice Form */}
          {activeAction === "send" && (
            <form onSubmit={handleMarkSent} className="space-y-4">
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
                <div className="text-sm text-muted-foreground">
                  If no date is specified, it will default to 30 days from today
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Invoice Actions</span>
                </div>
                <div className="text-sm text-blue-700">
                  This will mark the invoice as sent and set the payment status
                  to "sent". Make sure you have already generated and sent the
                  actual invoice to the client.
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Processing..." : "Mark Invoice as Sent"}
              </Button>
            </form>
          )}

          {/* Mark Payment Received Form */}
          {activeAction === "receive" && (
            <form onSubmit={handleMarkReceived} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Payment Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="payment-amount"
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-reference">Payment Reference</Label>
                  <Input
                    id="payment-reference"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction ID, check number, etc."
                  />
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Confirm Payment Received</span>
                </div>
                <div className="text-sm text-green-700">
                  This will mark the payment as received and update the billing
                  period status to "paid". This action should only be taken
                  after you have confirmed the payment has been received.
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Processing..." : "Mark Payment as Received"}
              </Button>
            </form>
          )}

          {/* Payment Links */}
          {activeAction === "payment-links" && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Generate payment links for different payment methods. These
                links can be included in invoices or sent directly to clients.
              </div>

              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <Card key={method.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {method.icon}
                        <div>
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {method.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              method.generateLink(
                                billingPeriod.payment_amount || 0,
                              ),
                            )
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(
                              method.generateLink(
                                billingPeriod.payment_amount || 0,
                              ),
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">
                    Payment Method Configuration
                  </span>
                </div>
                <div className="text-sm text-amber-700">
                  Payment methods are configured in Company Settings. Contact
                  your administrator to add or modify payment options.
                </div>
              </div>
            </div>
          )}

          {/* Delete/Reset Actions */}
          {activeAction === "delete" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    resetPaymentStatusMutation.mutate({
                      billing_period_id: billingPeriod.id,
                    })
                  }
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset to Pending
                </Button>

                <Button
                  variant="destructive"
                  onClick={() =>
                    deletePaymentHistoryMutation.mutate({
                      billing_period_id: billingPeriod.id,
                    })
                  }
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Payment History
                </Button>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Destructive Actions</span>
                </div>
                <div className="text-sm text-red-700">
                  These actions will modify or delete payment history. Use with
                  caution. Reset will change status back to pending. Delete will
                  remove all payment history records.
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

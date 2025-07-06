'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { PaymentStatusBadge } from '@/components/payments/payment-status-badge';
import { InvoiceGenerator } from './invoice-generator';
import { UserSelector } from './user-selector';
import { DeleteConfirmationModal } from './delete-confirmation-modal';
import { PDFExporter } from './pdf-exporter';
import { 
  useBillingPeriods, 
  useGenerateBillingPeriod, 
  useGenerateNextBillingPeriod,
  useDeleteBillingPeriod
} from '@/lib/hooks/usePayments';
import { useBillingSettings, useBillingReport } from '@/lib/hooks/useBilling';
import { extractTargetUserIdFromBillingPeriod } from '@/lib/db/billing-service';
import type { BillingPeriod, BillingFrequency } from '@/lib/db/schema';
import { format } from 'date-fns';
import { 
  Plus, 
  Calendar, 
  FileText, 
  Eye,
  DollarSign,
  Loader2,
  AlertCircle,
  Receipt,
  Clock,
  Trash2,
  Download
} from 'lucide-react';

interface BillingPeriodsListProps {
  companyId: string;
  isAdmin: boolean;
}

export function BillingPeriodsList({ companyId, isAdmin }: BillingPeriodsListProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [invoicePeriod, setInvoicePeriod] = useState<BillingPeriod | null>(null);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<BillingPeriod | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [pdfExportPeriod, setPdfExportPeriod] = useState<BillingPeriod | null>(null);
  const [showPdfExporter, setShowPdfExporter] = useState(false);

  const { data: billingPeriods, isLoading, isError, refetch } = useBillingPeriods(companyId);
  const { data: companySettings } = useBillingSettings(companyId);
  const generatePeriodMutation = useGenerateBillingPeriod(companyId);
  const generateNextMutation = useGenerateNextBillingPeriod(companyId);
  const deletePeriodMutation = useDeleteBillingPeriod(companyId);

  // Fetch billing report for selected period details
  // Extract target user ID if this is a user-specific billing period
  const selectedPeriodTargetUserId = selectedPeriod ? extractTargetUserIdFromBillingPeriod(selectedPeriod) : null;
  
  const { data: periodReport } = useBillingReport(
    companyId,
    selectedPeriod?.start_date || '',
    selectedPeriod?.end_date || '',
    selectedPeriodTargetUserId || undefined
  );

  const handleGenerateNewPeriod = async () => {
    if (!companySettings?.billing_frequency) {
      alert('Please set a billing frequency in the company settings first.');
      return;
    }

    try {
      await generatePeriodMutation.mutateAsync({
        frequency: companySettings.billing_frequency as BillingFrequency,
      });
      refetch();
    } catch (error) {
      console.error('Error generating billing period:', error);
      alert('Failed to generate billing period. Please try again.');
    }
  };

  const handleGenerateNext = async (currentPeriodId: string) => {
    try {
      await generateNextMutation.mutateAsync({
        current_period_id: currentPeriodId,
      });
      refetch();
    } catch (error) {
      console.error('Error generating next billing period:', error);
      alert('Failed to generate next billing period. Please try again.');
    }
  };

  const handleGenerateInvoice = (period: BillingPeriod) => {
    setInvoicePeriod(period);
    setShowInvoiceGenerator(true);
  };

  const handleCloseInvoiceGenerator = () => {
    setInvoicePeriod(null);
    setShowInvoiceGenerator(false);
    refetch(); // Refresh data in case payment status was updated
  };

  const handleDeleteClick = (period: BillingPeriod) => {
    setDeleteCandidate(period);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;

    try {
      await deletePeriodMutation.mutateAsync(deleteCandidate.id);
      alert('Billing period deleted successfully!');
      setShowDeleteConfirmation(false);
      setDeleteCandidate(null);
      refetch();
    } catch (error) {
      console.error('Error deleting billing period:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete billing period');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
    setDeleteCandidate(null);
  };

  const handlePdfExport = (period: BillingPeriod) => {
    setPdfExportPeriod(period);
    setShowPdfExporter(true);
  };

  const handleClosePdfExporter = () => {
    setPdfExportPeriod(null);
    setShowPdfExporter(false);
  };

  const formatCurrency = (amount: number | null) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: companySettings?.currency || 'USD',
    }).format(amount || 0);
  };

  const getBillingPeriodStatus = (period: BillingPeriod) => {
    const now = new Date();
    const endDate = new Date(period.end_date);
    
    if (period.payment_status === 'paid') return 'completed';
    if (period.payment_status === 'cancelled') return 'cancelled';
    if (endDate < now) return 'active'; // Period ended, ready for invoicing
    return 'draft'; // Period is still ongoing
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'active': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading billing periods...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="flex items-center gap-2 pt-6">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300">Failed to load billing periods</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Billing Periods</h2>
          <p className="text-muted-foreground">
            Manage billing periods and generate invoices for your company
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateNewPeriod}
              disabled={generatePeriodMutation.isPending || !companySettings?.billing_frequency}
              className="flex items-center gap-2"
            >
              {generatePeriodMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate New Period
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowUserSelector(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Generate for User
            </Button>
          </div>
        )}
      </div>

      {/* Company Settings Info */}
      {companySettings && (
        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Billing Frequency:</span>
                <Badge variant="outline">
                  {companySettings.billing_frequency?.replace('_', '-') || 'Not Set'}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">Currency:</span>
                <Badge variant="outline">{companySettings.currency || 'USD'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Periods List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Billing Periods
          </CardTitle>
          <CardDescription>
            {billingPeriods?.length || 0} period{billingPeriods?.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingPeriods && billingPeriods.length > 0 ? (
            <div className="space-y-4">
              {billingPeriods.map((period: BillingPeriod) => {
                const status = getBillingPeriodStatus(period);
                return (
                  <div 
                    key={period.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{period.name}</h3>
                        <Badge variant={getStatusBadgeVariant(status)}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {period.frequency.replace('_', '-')}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(period.start_date), 'MMM dd')} - {format(new Date(period.end_date), 'MMM dd, yyyy')}
                        </div>
                        {period.payment_amount && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(period.payment_amount)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <PaymentStatusBadge status={period.payment_status} size="sm" />
                        {period.invoice_sent_date && (
                          <span className="text-xs text-muted-foreground">
                            Invoice sent: {format(new Date(period.invoice_sent_date), 'MMM dd')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPeriod(period)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                      
                      {isAdmin && status === 'active' && period.payment_status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleGenerateInvoice(period)}
                          className="flex items-center gap-1"
                        >
                          <Receipt className="h-3 w-3" />
                          Generate Invoice
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePdfExport(period)}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Export PDF
                      </Button>

                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteClick(period)}
                          className="flex items-center gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No billing periods found</h3>
              <p className="mb-4">Get started by creating your first billing period</p>
              {isAdmin && companySettings?.billing_frequency && (
                <Button onClick={handleGenerateNewPeriod} disabled={generatePeriodMutation.isPending}>
                  {generatePeriodMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Period
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Details Modal */}
      {selectedPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Billing Period Details</CardTitle>
              <CardDescription>
                {selectedPeriod.name} • {format(new Date(selectedPeriod.start_date), 'MMM dd')} - {format(new Date(selectedPeriod.end_date), 'MMM dd, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusBadgeVariant(getBillingPeriodStatus(selectedPeriod))}>
                      {getBillingPeriodStatus(selectedPeriod)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Payment Status</label>
                  <div className="mt-1">
                    <PaymentStatusBadge status={selectedPeriod.payment_status} />
                  </div>
                </div>
              </div>

              {selectedPeriod.payment_amount && (
                <div>
                  <label className="text-sm font-medium">Payment Amount</label>
                  <div className="text-lg font-semibold">
                    {formatCurrency(selectedPeriod.payment_amount)}
                  </div>
                </div>
              )}

              {selectedPeriod.notes && (
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedPeriod.notes}</p>
                </div>
              )}

              {/* Time Entries Section */}
              {periodReport && Object.keys(periodReport).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Time Entries</h3>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {Object.entries(periodReport).map(([date, users]: [string, any]) => (
                      <div key={date} className="border rounded-lg p-3">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(date), 'EEEE, MMM dd, yyyy')}
                        </h4>
                        
                        <div className="space-y-2">
                          {Object.entries(users).map(([userId, userData]: [string, any]) => (
                            <div key={userId} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                <span className="font-medium">
                                  {userData.userFirstName} {userData.userLastName}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {userData.totalHours?.toFixed(2) || '0.00'}h
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {formatCurrency(userData.totalAmount || 0)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Daily Total */}
                        <div className="border-t mt-2 pt-2 flex justify-between text-sm font-medium">
                          <span>Daily Total</span>
                          <div className="flex items-center gap-4">
                            <span>
                              {Object.values(users).reduce((sum: number, user: any) => sum + (user.totalHours || 0), 0).toFixed(2)}h
                            </span>
                            <span>
                              {formatCurrency(Object.values(users).reduce((sum: number, user: any) => sum + (user.totalAmount || 0), 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Period Summary */}
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium">Total Period Hours</label>
                        <div className="text-lg font-semibold">
                          {Object.values(periodReport).reduce((totalHours: number, dayUsers: any) => {
                            return totalHours + Object.values(dayUsers).reduce((dayTotal: number, user: any) => dayTotal + (user.totalHours || 0), 0);
                          }, 0).toFixed(2)}h
                        </div>
                      </div>
                      <div>
                        <label className="font-medium">Total Period Amount</label>
                        <div className="text-lg font-semibold">
                          {formatCurrency(Object.values(periodReport).reduce((totalAmount: number, dayUsers: any) => {
                            return totalAmount + Object.values(dayUsers).reduce((dayTotal: number, user: any) => dayTotal + (user.totalAmount || 0), 0);
                          }, 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* No Time Entries Message */}
              {periodReport && Object.keys(periodReport).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No time entries found for this billing period</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedPeriod(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoice Generator */}
      {invoicePeriod && (
        <InvoiceGenerator
          billingPeriod={invoicePeriod}
          companyId={companyId}
          isOpen={showInvoiceGenerator}
          onClose={handleCloseInvoiceGenerator}
        />
      )}

      {/* User Selector Modal */}
      <UserSelector
        companyId={companyId}
        isOpen={showUserSelector}
        onClose={() => setShowUserSelector(false)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        billingPeriod={deleteCandidate}
        isOpen={showDeleteConfirmation}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={deletePeriodMutation.isPending}
      />

      {/* PDF Exporter */}
      {pdfExportPeriod && (
        <PDFExporter
          billingPeriod={pdfExportPeriod}
          companyId={companyId}
          isOpen={showPdfExporter}
          onClose={handleClosePdfExporter}
        />
      )}
    </div>
  );
}
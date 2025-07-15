'use client';

import {useState} from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import {Button} from '@workspace/ui/components/button';
import {Badge} from '@workspace/ui/components/badge';
import {Label} from '@workspace/ui/components/label';
import {DateRangePicker} from '@/components/ui/date-range-picker';
import {PaymentStatusBadge} from '@/components/payments/payment-status-badge';
import {InvoiceGenerator} from './invoice-generator';
import {UserSelector} from './user-selector';
import {DeleteConfirmationModal} from './delete-confirmation-modal';
import {PDFExporter} from './pdf-exporter';
import {ComprehensiveBillingModal} from './comprehensive-billing-modal';
import {
  useBillingPeriods,
  useGenerateBillingPeriod,
  useGenerateBillingPeriodForUser,
  useGenerateNextBillingPeriod,
  useDeleteBillingPeriod,
} from '@/lib/hooks/usePayments';
import {useAuthStore} from '@/lib/stores/auth';
import {useBillingSettings, useBillingReport} from '@/lib/hooks/useBilling';
import {extractTargetUserIdFromBillingPeriod} from '@/lib/db/billing-service';
import type {BillingPeriod, BillingFrequency} from '@/lib/db/schema';
import {getApiPath} from '@/lib/utils';
import {format, startOfMonth, endOfMonth} from 'date-fns';
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
  Download,
  RefreshCw,
  X,
} from 'lucide-react';

interface BillingPeriodsListProps {
  companyId: string;
  isAdmin: boolean;
}

export function BillingPeriodsList({companyId, isAdmin}: BillingPeriodsListProps) {
  const {user} = useAuthStore();
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [invoicePeriod, setInvoicePeriod] = useState<BillingPeriod | null>(null);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<BillingPeriod | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [pdfExportPeriod, setPdfExportPeriod] = useState<BillingPeriod | null>(null);
  const [showPdfExporter, setShowPdfExporter] = useState(false);
  const [recalculatingPeriods, setRecalculatingPeriods] = useState<Set<string>>(new Set());

  // New period generation state
  const [useCustomDateRange, setUseCustomDateRange] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  );
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const {data: billingPeriods, isLoading, isError, refetch} = useBillingPeriods(companyId);
  const {data: companySettings} = useBillingSettings(companyId);
  const generatePeriodMutation = useGenerateBillingPeriod(companyId);
  const generateUserPeriodMutation = useGenerateBillingPeriodForUser(companyId);
  const generateNextMutation = useGenerateNextBillingPeriod(companyId);
  const deletePeriodMutation = useDeleteBillingPeriod(companyId);

  // Fetch billing report for selected period details
  // Extract target user ID if this is a user-specific billing period
  const selectedPeriodTargetUserId = selectedPeriod
    ? extractTargetUserIdFromBillingPeriod(selectedPeriod)
    : null;

  const {data: periodReport} = useBillingReport(
    companyId,
    selectedPeriod?.start_date || '',
    selectedPeriod?.end_date || '',
    selectedPeriodTargetUserId || undefined,
  );

  const handleGenerateNewPeriod = async () => {
    if (!companySettings?.billing_frequency && !useCustomDateRange) {
      alert(
        'Please set a billing frequency in the company settings first or use custom date range.',
      );
      return;
    }

    if (useCustomDateRange && (!startDate || !endDate)) {
      alert('Please select both start and end dates for custom range.');
      return;
    }

    try {
      const basePayload = {
        frequency: (companySettings?.billing_frequency as BillingFrequency) || 'monthly',
        ...(useCustomDateRange && {
          custom_start_date: startDate,
          custom_end_date: endDate,
        }),
      };

      // Use different mutations based on user role
      if (!isAdmin) {
        // For non-admin users, use the user-specific mutation
        if (!user?.id) {
          throw new Error('User ID not found');
        }
        await generateUserPeriodMutation.mutateAsync({
          ...basePayload,
          target_user_id: user.id, // Generate for the current user
        });
        alert(
          'Personal billing period created successfully! It will be sent to your company admin for review.',
        );
      } else {
        // For admins, use the company-wide mutation
        await generatePeriodMutation.mutateAsync(basePayload);
      }

      setShowNewPeriodModal(false);
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

  const handleRecalculateAmount = async (period: BillingPeriod) => {
    setRecalculatingPeriods((prev) => new Set(prev).add(period.id));

    try {
      const response = await fetch(getApiPath('billing/periods'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'recalculate_amount',
          billing_period_id: period.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to recalculate amount');
      }

      await refetch(); // Refresh the billing periods list
      alert('Payment amount recalculated successfully!');
    } catch (error) {
      console.error('Error recalculating payment amount:', error);
      alert(error instanceof Error ? error.message : 'Failed to recalculate payment amount');
    } finally {
      setRecalculatingPeriods((prev) => {
        const newSet = new Set(prev);
        newSet.delete(period.id);
        return newSet;
      });
    }
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
      case 'completed':
        return 'default';
      case 'active':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
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
          <h2 className="text-xl font-semibold">
            {isAdmin ? 'Billing Periods' : 'My Billing Periods'}
          </h2>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Manage billing periods and generate invoices for your company'
              : 'View and generate your personal billing periods for approval'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin ? (
            <>
              <Button
                onClick={() => setShowNewPeriodModal(true)}
                className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Generate New Period
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowUserSelector(true)}
                className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Generate for User
              </Button>
            </>
          ) : (
            <Button onClick={() => setShowNewPeriodModal(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Generate Personal Period
            </Button>
          )}
        </div>
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
            {billingPeriods?.length || 0} period
            {billingPeriods?.length !== 1 ? 's' : ''} found
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
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
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
                          {format(new Date(period.start_date), 'MMM dd')} -{' '}
                          {format(new Date(period.end_date), 'MMM dd, yyyy')}
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
                        className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        View
                      </Button>

                      {isAdmin && status === 'active' && period.payment_status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleGenerateInvoice(period)}
                          className="flex items-center gap-1">
                          <Receipt className="h-3 w-3" />
                          Generate Invoice
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePdfExport(period)}
                        className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        Export PDF
                      </Button>

                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRecalculateAmount(period)}
                          disabled={recalculatingPeriods.has(period.id)}
                          className="flex items-center gap-1"
                          title="Recalculate payment amount from time entries">
                          {recalculatingPeriods.has(period.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Recalculate
                        </Button>
                      )}

                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteClick(period)}
                          className="flex items-center gap-1 text-destructive hover:text-destructive">
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
                <Button
                  onClick={handleGenerateNewPeriod}
                  disabled={
                    generatePeriodMutation.isPending || generateUserPeriodMutation.isPending
                  }>
                  {generatePeriodMutation.isPending || generateUserPeriodMutation.isPending ? (
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

      {/* Comprehensive Billing Modal */}
      {selectedPeriod && (
        <ComprehensiveBillingModal
          billingPeriod={selectedPeriod}
          isOpen={!!selectedPeriod}
          onClose={() => setSelectedPeriod(null)}
          companyId={companyId}
        />
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

      {/* New Period Generation Modal */}
      {showNewPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {isAdmin ? 'Generate New Billing Period' : 'Generate Personal Billing Period'}
                </CardTitle>
                <CardDescription>
                  {isAdmin
                    ? 'Create a new billing period for your company'
                    : 'Create a personal billing period for your work to be reviewed by your company admin'}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewPeriodModal(false)}
                className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {companySettings?.billing_frequency && (
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  <strong>Default frequency:</strong>{' '}
                  {companySettings.billing_frequency.replace('_', '-')}
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="custom-date-range-main"
                    checked={useCustomDateRange}
                    onChange={(e) => setUseCustomDateRange(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label
                    htmlFor="custom-date-range-main"
                    className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                    <Calendar className="h-4 w-4" />
                    Use Custom Date Range
                  </Label>
                </div>

                {useCustomDateRange && (
                  <div className="space-y-2 bg-muted/50 p-3 rounded-lg">
                    <Label className="text-xs text-muted-foreground">
                      Override the default frequency-based dates with custom range
                    </Label>
                    <DateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onStartDateChange={setStartDate}
                      onEndDateChange={setEndDate}
                      onRangeChange={(start, end) => {
                        setStartDate(start);
                        setEndDate(end);
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowNewPeriodModal(false)}
                  className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateNewPeriod}
                  disabled={
                    generatePeriodMutation.isPending || generateUserPeriodMutation.isPending
                  }
                  className="flex-1">
                  {generatePeriodMutation.isPending || generateUserPeriodMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Period'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

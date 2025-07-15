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
import {PaymentStatusBadge} from './payment-status-badge';
import {PaymentManagementModal} from './payment-management-modal';
import {OutstandingPaymentsDeletionModal} from './outstanding-payments-deletion-modal';
import {
  useOutstandingPayments,
  useOverduePayments,
  usePaymentStats,
  useBillingPeriods,
} from '@/lib/hooks/usePayments';
import type {BillingPeriod} from '@/lib/db/schema';
import {format, isAfter, isPast} from 'date-fns';
import {
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Calendar,
  FileText,
  Eye,
  Settings,
  Trash2,
} from 'lucide-react';

interface PaymentDashboardProps {
  companyId: string;
  isAdmin: boolean;
}

export function PaymentDashboard({companyId, isAdmin}: PaymentDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod | null>(null);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [showOutstandingDeletionModal, setShowOutstandingDeletionModal] = useState(false);

  const {data: paymentStats, isLoading: statsLoading} = usePaymentStats(companyId);
  const {data: outstandingPayments, isLoading: outstandingLoading} =
    useOutstandingPayments(companyId);
  const {data: overduePayments, isLoading: overdueLoading} = useOverduePayments(companyId);

  const handleManagePayment = (period: BillingPeriod) => {
    setSelectedPeriod(period);
    setShowManagementModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '...' : formatCurrency(paymentStats?.stats?.totalPaid || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentStats?.stats?.paid || 0} periods
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {outstandingLoading ? '...' : outstandingPayments?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Pending & sent invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overdueLoading ? '...' : overduePayments?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Periods</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : paymentStats?.stats?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Payments Alert */}
      {overduePayments && overduePayments.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              Overdue Payments
            </CardTitle>
            <CardDescription className="text-red-600 dark:text-red-400">
              {overduePayments.length} payment
              {overduePayments.length !== 1 ? 's' : ''} past due date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overduePayments.slice(0, 3).map((period: BillingPeriod) => (
                <div
                  key={period.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{period.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Due:{' '}
                      {period.payment_due_date
                        ? format(new Date(period.payment_due_date), 'MMM dd, yyyy')
                        : 'No due date'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PaymentStatusBadge status={period.payment_status} size="sm" />
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManagePayment(period)}>
                        <Settings className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {overduePayments.length > 3 && (
                <div className="text-center text-sm text-muted-foreground">
                  And {overduePayments.length - 3} more overdue payment
                  {overduePayments.length - 3 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outstanding Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Outstanding Payments
              </CardTitle>
              <CardDescription>Billing periods awaiting payment</CardDescription>
            </div>
            {isAdmin && outstandingPayments && outstandingPayments.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOutstandingDeletionModal(true)}
                className="flex items-center gap-2 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete Outstanding Payments
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {outstandingLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted-foreground/20 rounded w-32"></div>
                    <div className="h-3 bg-muted-foreground/20 rounded w-24"></div>
                  </div>
                  <div className="h-6 bg-muted-foreground/20 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : outstandingPayments && outstandingPayments.length > 0 ? (
            <div className="space-y-3">
              {outstandingPayments.map((period: BillingPeriod) => (
                <div
                  key={period.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{period.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {period.frequency.replace('_', '-')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(period.start_date), 'MMM dd')} -{' '}
                      {format(new Date(period.end_date), 'MMM dd, yyyy')}
                    </div>
                    {period.payment_due_date && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {format(new Date(period.payment_due_date), 'MMM dd, yyyy')}
                        {isPast(new Date(period.payment_due_date)) && (
                          <span className="text-red-600 font-medium">(Overdue)</span>
                        )}
                      </div>
                    )}
                    {period.invoice_sent_date && (
                      <div className="text-xs text-muted-foreground">
                        Invoice sent: {format(new Date(period.invoice_sent_date), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <PaymentStatusBadge status={period.payment_status} />
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManagePayment(period)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No outstanding payments</p>
              <p className="text-sm">All billing periods are up to date!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Management Modal */}
      {selectedPeriod && (
        <PaymentManagementModal
          billingPeriod={selectedPeriod}
          isOpen={showManagementModal}
          onClose={() => {
            setShowManagementModal(false);
            setSelectedPeriod(null);
          }}
          companyId={companyId}
        />
      )}

      {/* Outstanding Payments Deletion Modal */}
      <OutstandingPaymentsDeletionModal
        outstandingPayments={outstandingPayments || []}
        isOpen={showOutstandingDeletionModal}
        onClose={() => setShowOutstandingDeletionModal(false)}
        companyId={companyId}
      />
    </div>
  );
}

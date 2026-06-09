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
import {useBillingReport} from '@/lib/hooks/useBilling';
import {useBillingSettings} from '@/lib/hooks/useBilling';
import {useMarkInvoiceSent} from '@/lib/hooks/usePayments';
import type {BillingPeriod} from '@/lib/db/schema';
import {format} from 'date-fns';
import {
  Download,
  Send,
  Eye,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  User,
  X,
  Loader2,
} from 'lucide-react';

interface InvoiceGeneratorProps {
  billingPeriod: BillingPeriod;
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface InvoiceData {
  period: BillingPeriod;
  companySettings: any;
  timeEntries: any;
  totalHours: number;
  totalAmount: number;
  userBreakdown: {
    [userId: string]: {
      name: string;
      hours: number;
      amount: number;
      rate: number;
      entries: any[];
    };
  };
}

export function InvoiceGenerator({
  billingPeriod,
  companyId,
  isOpen,
  onClose,
}: InvoiceGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [step, setStep] = useState<'preview' | 'download' | 'send'>('preview');

  const {data: companySettings} = useBillingSettings(companyId);
  const {data: billingReport} = useBillingReport(
    companyId,
    billingPeriod.start_date,
    billingPeriod.end_date,
  );
  const markSentMutation = useMarkInvoiceSent(companyId);

  // Process billing report into invoice data
  const processInvoiceData = (): InvoiceData => {
    if (!billingReport || !companySettings) {
      return {
        period: billingPeriod,
        companySettings,
        timeEntries: {},
        totalHours: 0,
        totalAmount: 0,
        userBreakdown: {},
      };
    }

    let totalHours = 0;
    let totalAmount = 0;
    const userBreakdown: InvoiceData['userBreakdown'] = {};

    // Process billing report data
    Object.entries(billingReport).forEach(([date, users]: [string, any]) => {
      Object.entries(users).forEach(([userId, userData]: [string, any]) => {
        const userName = `${userData.userFirstName} ${userData.userLastName}`;
        const userHours = userData.totalHours || 0;
        const userAmount = userData.totalAmount || 0;
        const userRate = userHours > 0 ? userAmount / userHours : 0;

        totalHours += userHours;
        totalAmount += userAmount;

        if (!userBreakdown[userId]) {
          userBreakdown[userId] = {
            name: userName,
            hours: 0,
            amount: 0,
            rate: userRate,
            entries: [],
          };
        }

        userBreakdown[userId].hours += userHours;
        userBreakdown[userId].amount += userAmount;
        userBreakdown[userId].entries.push({
          date,
          hours: userHours,
          amount: userAmount,
          projects: userData.projects || {},
        });
      });
    });

    return {
      period: billingPeriod,
      companySettings,
      timeEntries: billingReport,
      totalHours,
      totalAmount,
      userBreakdown,
    };
  };

  const generateInvoice = () => {
    setIsGenerating(true);
    try {
      const data = processInvoiceData();
      setInvoiceData(data);
      setStep('preview');
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    // For now, we'll create a simple HTML-based download
    // In production, you'd want to use a proper PDF library like jsPDF or react-pdf
    const invoiceHTML = generateInvoiceHTML();
    const blob = new Blob([invoiceHTML], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${billingPeriod.name.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sendInvoice = async () => {
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 days from now

      await markSentMutation.mutateAsync({
        billing_period_id: billingPeriod.id,
        due_date: dueDate.toISOString().split('T')[0],
      });

      alert('Invoice marked as sent successfully!');
      onClose();
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Failed to mark invoice as sent. Please try again.');
    }
  };

  const generateInvoiceHTML = (): string => {
    if (!invoiceData) return '';

    const currency = invoiceData.companySettings?.currency || 'USD';
    const invoiceNumber = `${invoiceData.companySettings?.invoice_prefix || 'INV'}-${format(new Date(), 'yyyyMMdd')}-${billingPeriod.id.slice(0, 8)}`;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Invoice - ${billingPeriod.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 40px; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .company-info, .billing-info { flex: 1; }
        .billing-info { text-align: right; }
        .period-info { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .breakdown-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .breakdown-table th, .breakdown-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .breakdown-table th { background: #f8f9fa; font-weight: bold; }
        .total-section { text-align: right; margin-top: 30px; font-size: 18px; font-weight: bold; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>INVOICE</h1>
        <p>Invoice Number: ${invoiceNumber}</p>
        <p>Date: ${format(new Date(), 'MMMM dd, yyyy')}</p>
    </div>

    <div class="invoice-details">
        <div class="company-info">
            <h3>From:</h3>
            <p><strong>ZKidzDev</strong></p>
            <p>Quezon City</p>
        </div>
        <div class="billing-info">
            <h3>Bill To:</h3>
            <p><strong>Client Company</strong></p>
            <p>456 Client Avenue</p>
            <p>City, State 67890</p>
        </div>
    </div>

    <div class="period-info">
        <h3>Billing Period</h3>
        <p><strong>${billingPeriod.name}</strong></p>
        <p>${format(new Date(billingPeriod.start_date), 'MMMM dd, yyyy')} - ${format(new Date(billingPeriod.end_date), 'MMMM dd, yyyy')}</p>
        <p>Frequency: ${billingPeriod.frequency.replace('_', '-')}</p>
    </div>

    <table class="breakdown-table">
        <thead>
            <tr>
                <th>Resource</th>
                <th>Hours</th>
                <th>Rate</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(invoiceData.userBreakdown)
              .map(
                ([userId, user]) => `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.hours.toFixed(2)}</td>
                    <td>${currency} ${user.rate.toFixed(2)}/hr</td>
                    <td>${currency} ${user.amount.toFixed(2)}</td>
                </tr>
            `,
              )
              .join('')}
        </tbody>
    </table>

    <div class="total-section">
        <p>Total Hours: ${invoiceData.totalHours.toFixed(2)}</p>
        <p>Total Amount: ${currency} ${invoiceData.totalAmount.toFixed(2)}</p>
    </div>

    <div class="footer">
        <p>Thank you for your business!</p>
        <p>Payment due within 30 days of invoice date.</p>
    </div>
</body>
</html>`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: companySettings?.currency || 'USD',
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Generator
            </CardTitle>
            <CardDescription>Generate and send invoice for {billingPeriod.name}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Billing Period Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Period</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(billingPeriod.start_date), 'MMM dd')} -{' '}
                      {format(new Date(billingPeriod.end_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Frequency</label>
                  <div className="mt-1">
                    <Badge variant="outline">{billingPeriod.frequency.replace('_', '-')}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Invoice Button */}
          {!invoiceData && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Ready to Generate Invoice</h3>
              <p className="text-muted-foreground mb-4">
                Click below to process time entries and generate the invoice for this billing period
              </p>
              <Button
                onClick={generateInvoice}
                disabled={isGenerating}
                className="flex items-center gap-2">
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate Invoice'}
              </Button>
            </div>
          )}

          {/* Invoice Preview */}
          {invoiceData && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Total Hours</div>
                        <div className="text-xl font-bold">{invoiceData.totalHours.toFixed(2)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Resources</div>
                        <div className="text-xl font-bold">
                          {Object.keys(invoiceData.userBreakdown).length}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Total Amount</div>
                        <div className="text-xl font-bold">
                          {formatCurrency(invoiceData.totalAmount)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* User Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Resource Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(invoiceData.userBreakdown).map(([userId, user]) => (
                      <div
                        key={userId}
                        className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.hours.toFixed(2)} hours @ {formatCurrency(user.rate)}/hr
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(user.amount)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={downloadPDF} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>

                <Button
                  onClick={sendInvoice}
                  disabled={markSentMutation.isPending}
                  className="flex items-center gap-2">
                  {markSentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {markSentMutation.isPending ? 'Sending...' : 'Mark as Sent'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

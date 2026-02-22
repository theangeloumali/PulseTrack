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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import {useBillingSettings} from '@/lib/hooks/useBilling';
import {useMarkInvoiceSent} from '@/lib/hooks/usePayments';
import type {BillingPeriod} from '@/lib/db/schema';
import {format} from 'date-fns';
import {
  FileText,
  Download,
  Send,
  Eye,
  Printer,
  Mail,
  Settings,
  Palette,
  CreditCard,
  QrCode,
  ExternalLink,
  Clock,
  User,
  DollarSign,
  Building,
  Globe,
  Loader2,
} from 'lucide-react';

interface InvoiceGenerationProps {
  billingPeriod: BillingPeriod;
  billingReport: any;
  companyId: string;
  summaryStats: {
    totalHours: number;
    totalAmount: number;
    userCount: number;
    projectCount: number;
    billableHours: number;
    nonBillableHours: number;
  };
}

interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  isPremium?: boolean;
}

export function InvoiceGeneration({
  billingPeriod,
  billingReport,
  companyId,
  summaryStats,
}: InvoiceGenerationProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [includeTimeDetails, setIncludeTimeDetails] = useState(true);
  const [includeProjectBreakdown, setIncludeProjectBreakdown] = useState(true);
  const [includePaymentLinks, setIncludePaymentLinks] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const {data: companySettings} = useBillingSettings(companyId);
  const markSentMutation = useMarkInvoiceSent(companyId);

  const invoiceTemplates: InvoiceTemplate[] = [
    {
      id: 'modern',
      name: 'Modern Professional',
      description: 'Clean, modern design with visual charts and professional layout',
      preview: '/preview-modern.png',
    },
    {
      id: 'classic',
      name: 'Classic Business',
      description: 'Traditional invoice format with detailed breakdown tables',
      preview: '/preview-classic.png',
    },
    {
      id: 'minimal',
      name: 'Minimal Clean',
      description: 'Simple, minimal design focusing on essential information',
      preview: '/preview-minimal.png',
    },
    {
      id: 'branded',
      name: 'Custom Branded',
      description: 'Fully branded template with your company colors and logo',
      preview: '/preview-branded.png',
      isPremium: true,
    },
  ];

  const generateInvoice = async (action: 'preview' | 'download' | 'send') => {
    setIsGenerating(true);

    try {
      // Simulate invoice generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      switch (action) {
        case 'preview':
          setPreviewMode(true);
          break;
        case 'download':
          // Generate and download PDF
          downloadInvoicePDF();
          break;
        case 'send':
          // Mark as sent and potentially send email
          await markSentMutation.mutateAsync({
            billing_period_id: billingPeriod.id,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          });
          break;
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadInvoicePDF = () => {
    // For now, create a mock HTML invoice
    const invoiceHTML = generateInvoiceHTML();
    const blob = new Blob([invoiceHTML], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${billingPeriod.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateInvoiceHTML = (): string => {
    const currency = companySettings?.currency || 'USD';
    const invoiceNumber = `${companySettings?.invoice_prefix || 'INV'}-${format(new Date(), 'yyyyMMdd')}-${billingPeriod.id.slice(0, 8)}`;

    // Use branding colors
    const primaryColor = companySettings?.brand_primary_color || '#2563eb';
    const secondaryColor = companySettings?.brand_secondary_color || '#64748b';

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Invoice - ${billingPeriod.name}</title>
    <meta charset="utf-8">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px 20px; 
        }
        .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 40px; 
            border-bottom: 3px solid ${primaryColor}; 
            padding-bottom: 20px; 
        }
        .company-info h1 { 
            color: ${primaryColor}; 
            font-size: 32px; 
            margin-bottom: 10px; 
        }
        .company-logo {
            max-width: 150px;
            max-height: 80px;
            margin-bottom: 10px;
        }
        .invoice-details { 
            text-align: right; 
        }
        .invoice-details h2 { 
            color: ${primaryColor}; 
            font-size: 24px; 
            margin-bottom: 10px; 
        }
        .billing-info { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 40px; 
            margin: 40px 0; 
        }
        .info-section h3 { 
            color: #1f2937; 
            margin-bottom: 15px; 
            font-size: 18px; 
        }
        .period-summary { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 30px 0; 
        }
        .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 20px; 
        }
        .summary-item { 
            text-align: center; 
        }
        .summary-item .label { 
            font-size: 14px; 
            color: #64748b; 
            margin-bottom: 5px; 
        }
        .summary-item .value { 
            font-size: 24px; 
            font-weight: bold; 
            color: #1f2937; 
        }
        .breakdown-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 30px 0; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
        }
        .breakdown-table th { 
            background: ${primaryColor}; 
            color: white; 
            padding: 15px; 
            text-align: left; 
            font-weight: 600; 
        }
        .breakdown-table td { 
            padding: 12px 15px; 
            border-bottom: 1px solid #e2e8f0; 
        }
        .breakdown-table tr:hover { 
            background: #f8fafc; 
        }
        .total-section { 
            background: #1f2937; 
            color: white; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 30px 0; 
            text-align: right; 
        }
        .total-section .total-label { 
            font-size: 18px; 
            margin-bottom: 10px; 
        }
        .total-section .total-amount { 
            font-size: 36px; 
            font-weight: bold; 
        }
        .payment-info { 
            background: #ecfdf5; 
            border: 1px solid #10b981; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 30px 0; 
        }
        .payment-info h3 { 
            color: #065f46; 
            margin-bottom: 15px; 
        }
        .payment-links { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px; 
            margin-top: 15px; 
        }
        .payment-link { 
            background: white; 
            border: 1px solid #10b981; 
            border-radius: 6px; 
            padding: 15px; 
            text-align: center; 
            text-decoration: none; 
            color: #065f46; 
            font-weight: 600; 
            transition: background 0.2s; 
        }
        .payment-link:hover { 
            background: #f0fdf4; 
        }
        .footer { 
            margin-top: 50px; 
            padding-top: 30px; 
            border-top: 1px solid #e2e8f0; 
            text-align: center; 
            color: #64748b; 
        }
        @media print {
            body { padding: 20px; }
            .payment-links { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            ${
              companySettings?.company_logo_url
                ? `<img src="${companySettings.company_logo_url}" alt="Company Logo" class="company-logo">`
                : ''
            }
            <h1>${(billingPeriod as any).company_name || 'Your Company Name'}</h1>
            ${
              companySettings?.company_address
                ? `<p>${companySettings.company_address.replace(/\n/g, '<br>')}</p>`
                : '<p>123 Business Street<br>City, State 12345</p>'
            }
            ${
              companySettings?.company_email
                ? `<p>Email: ${companySettings.company_email}</p>`
                : '<p>Email: billing@company.com</p>'
            }
            ${
              companySettings?.company_phone ? `<p>Phone: ${companySettings.company_phone}</p>` : ''
            }
            ${
              companySettings?.company_website
                ? `<p>Website: ${companySettings.company_website}</p>`
                : ''
            }
        </div>
        <div class="invoice-details">
            <h2>INVOICE</h2>
            <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
            <p><strong>Date:</strong> ${format(new Date(), 'MMMM dd, yyyy')}</p>
            <p><strong>Due Date:</strong> ${
              billingPeriod.payment_due_date
                ? format(new Date(billingPeriod.payment_due_date), 'MMMM dd, yyyy')
                : format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'MMMM dd, yyyy')
            }</p>
        </div>
    </div>

    <div class="billing-info">
        <div class="info-section">
            <h3>Bill To:</h3>
            <p><strong>Client Company Name</strong><br>
            456 Client Avenue<br>
            City, State 67890</p>
        </div>
        <div class="info-section">
            <h3>Billing Period:</h3>
            <p><strong>${billingPeriod.name}</strong><br>
            ${format(new Date(billingPeriod.start_date), 'MMMM dd')} - ${format(new Date(billingPeriod.end_date), 'MMMM dd, yyyy')}<br>
            Frequency: ${billingPeriod.frequency.replace('_', ' ').toUpperCase()}</p>
        </div>
    </div>

    <div class="period-summary">
        <h3>Period Summary</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="label">Total Hours</div>
                <div class="value">${summaryStats.totalHours.toFixed(1)}</div>
            </div>
            <div class="summary-item">
                <div class="label">Resources</div>
                <div class="value">${summaryStats.userCount}</div>
            </div>
            <div class="summary-item">
                <div class="label">Projects</div>
                <div class="value">${summaryStats.projectCount}</div>
            </div>
            <div class="summary-item">
                <div class="label">Avg Rate</div>
                <div class="value">$${summaryStats.totalHours > 0 ? (summaryStats.totalAmount / summaryStats.totalHours).toFixed(2) : '0.00'}</div>
            </div>
        </div>
    </div>

    ${
      includeTimeDetails
        ? `
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
            <tr>
                <td>Development Team</td>
                <td>${summaryStats.totalHours.toFixed(2)}</td>
                <td>$${summaryStats.totalHours > 0 ? (summaryStats.totalAmount / summaryStats.totalHours).toFixed(2) : '0.00'}/hr</td>
                <td>$${summaryStats.totalAmount.toFixed(2)}</td>
            </tr>
        </tbody>
    </table>
    `
        : ''
    }

    <div class="total-section">
        <div class="total-label">Total Amount Due</div>
        <div class="total-amount">$${summaryStats.totalAmount.toFixed(2)} ${currency}</div>
    </div>

    ${
      includePaymentLinks
        ? `
    <div class="payment-info">
        <h3>Payment Options</h3>
        <p>Choose your preferred payment method below:</p>
        <div class="payment-links">
            <a href="#" class="payment-link">💳 Credit Card</a>
            <a href="#" class="payment-link">🏦 Bank Transfer</a>
            <a href="#" class="payment-link">📱 Digital Wallet</a>
        </div>
    </div>
    `
        : ''
    }

    <div class="footer">
        ${
          companySettings?.invoice_footer
            ? `<p>${companySettings.invoice_footer.replace(/\n/g, '</p><p>')}</p>`
            : `<p>Thank you for your business!</p>
          <p>Payment terms: Net 30 days. Late payments may incur additional fees.</p>`
        }
        ${
          companySettings?.company_email
            ? `<p>For questions about this invoice, please contact: ${companySettings.company_email}</p>`
            : '<p>For questions about this invoice, please contact: billing@company.com</p>'
        }
    </div>
</body>
</html>`;
  };

  return (
    <div className="space-y-6">
      {/* Invoice Generation Options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Invoice Template
            </CardTitle>
            <CardDescription>Choose a template design for your invoice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invoiceTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}>
                  {template.isPremium && (
                    <Badge className="absolute top-2 right-2" variant="secondary">
                      Premium
                    </Badge>
                  )}
                  <div className="aspect-[3/4] bg-gray-100 rounded mb-3 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Include Time Details</label>
              <input
                type="checkbox"
                checked={includeTimeDetails}
                onChange={(e) => setIncludeTimeDetails(e.target.checked)}
                className="rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Project Breakdown</label>
              <input
                type="checkbox"
                checked={includeProjectBreakdown}
                onChange={(e) => setIncludeProjectBreakdown(e.target.checked)}
                className="rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Payment Links</label>
              <input
                type="checkbox"
                checked={includePaymentLinks}
                onChange={(e) => setIncludePaymentLinks(e.target.checked)}
                className="rounded"
              />
            </div>

            <div className="pt-4 border-t">
              <label className="text-sm font-medium mb-2 block">Currency</label>
              <Select defaultValue={companySettings?.currency || 'USD'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">Total Hours</span>
              </div>
              <div className="text-2xl font-bold">{summaryStats.totalHours.toFixed(1)}</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm font-medium">Total Amount</span>
              </div>
              <div className="text-2xl font-bold">${summaryStats.totalAmount.toFixed(2)}</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-purple-600 mb-2">
                <User className="h-5 w-5" />
                <span className="text-sm font-medium">Resources</span>
              </div>
              <div className="text-2xl font-bold">{summaryStats.userCount}</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-orange-600 mb-2">
                <Building className="h-5 w-5" />
                <span className="text-sm font-medium">Projects</span>
              </div>
              <div className="text-2xl font-bold">{summaryStats.projectCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Invoice Actions
          </CardTitle>
          <CardDescription>Generate, preview, or send your invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => generateInvoice('preview')}
              disabled={isGenerating}
              className="flex items-center gap-2 h-auto py-4">
              <Eye className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Preview Invoice</div>
                <div className="text-sm text-muted-foreground">Review before sending</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => generateInvoice('download')}
              disabled={isGenerating}
              className="flex items-center gap-2 h-auto py-4">
              <Download className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Download PDF</div>
                <div className="text-sm text-muted-foreground">Save to computer</div>
              </div>
            </Button>

            <Button
              onClick={() => generateInvoice('send')}
              disabled={isGenerating || billingPeriod.payment_status === 'paid'}
              className="flex items-center gap-2 h-auto py-4">
              {isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              <div className="text-left">
                <div className="font-medium">
                  {isGenerating ? 'Generating...' : 'Generate & Send'}
                </div>
                <div className="text-sm opacity-90">Email to client</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Additional Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print Invoice
            </Button>

            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Invoice
            </Button>

            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Payment
            </Button>

            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Share Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Information */}
      {billingPeriod.invoice_sent_date && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-600">
              <Send className="h-5 w-5" />
              <div>
                <div className="font-medium">Invoice Previously Sent</div>
                <div className="text-sm text-muted-foreground">
                  Sent on {format(new Date(billingPeriod.invoice_sent_date), 'MMMM dd, yyyy')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { useBillingReport } from '@/lib/hooks/useBilling';
import { useBillingSettings } from '@/lib/hooks/useBilling';
import { extractTargetUserIdFromBillingPeriod } from '@/lib/db/billing-service';
import type { BillingPeriod } from '@/lib/db/schema';
import { format } from 'date-fns';
import { Download, FileText, Loader2, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFExporterProps {
  billingPeriod: BillingPeriod;
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface TimeEntryRow {
  date: string;
  description: string;
  hours: number;
  amount: number;
}

export function PDFExporter({ 
  billingPeriod, 
  companyId, 
  isOpen, 
  onClose 
}: PDFExporterProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: companySettings } = useBillingSettings(companyId);
  
  // Extract target user ID if this is a user-specific billing period
  const targetUserId = extractTargetUserIdFromBillingPeriod(billingPeriod);
  
  const { data: billingReport } = useBillingReport(
    companyId, 
    billingPeriod.start_date, 
    billingPeriod.end_date,
    targetUserId || undefined
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: companySettings?.currency || 'USD',
    }).format(amount);
  };

  const processReportData = (): { rows: TimeEntryRow[], totalHours: number, totalAmount: number } => {
    if (!billingReport) return { rows: [], totalHours: 0, totalAmount: 0 };

    const rows: TimeEntryRow[] = [];
    let totalHours = 0;
    let totalAmount = 0;

    Object.entries(billingReport).forEach(([date, users]: [string, any]) => {
      Object.entries(users).forEach(([userId, userData]: [string, any]) => {
        const userHours = userData.totalHours || 0;
        const userAmount = userData.totalAmount || 0;
        
        totalHours += userHours;
        totalAmount += userAmount;

        // Process projects and tickets for this user on this date
        if (userData.projects) {
          Object.entries(userData.projects).forEach(([projectId, projectData]: [string, any]) => {
            const projectName = projectData.projectName || 'Unknown Project';
            
            if (projectData.tickets && Array.isArray(projectData.tickets)) {
              projectData.tickets.forEach((ticket: any) => {
                rows.push({
                  date: format(new Date(date), 'MMM dd, yyyy'),
                  description: `${projectName} - ${ticket.ticketTitle || 'Untitled'}${ticket.description ? ` (${ticket.description})` : ''}`,
                  hours: ticket.hours || 0,
                  amount: ticket.amount || 0,
                });
              });
            } else {
              // Fallback for projects without detailed ticket data
              rows.push({
                date: format(new Date(date), 'MMM dd, yyyy'),
                description: `${projectName} - General Work`,
                hours: projectData.totalHours || 0,
                amount: projectData.totalAmount || 0,
              });
            }
          });
        } else {
          // Fallback for users without project data
          rows.push({
            date: format(new Date(date), 'MMM dd, yyyy'),
            description: `${userData.userFirstName} ${userData.userLastName} - General Work`,
            hours: userHours,
            amount: userAmount,
          });
        }
      });
    });

    // Sort rows by date
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { rows, totalHours, totalAmount };
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const { rows, totalHours, totalAmount } = processReportData();
      
      if (rows.length === 0) {
        alert('No time entries found for this billing period');
        return;
      }

      // Create new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header
      doc.setFontSize(20);
      doc.text('Billing Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Period: ${billingPeriod.name}`, 15, 35);
      doc.text(`${format(new Date(billingPeriod.start_date), 'MMM dd, yyyy')} - ${format(new Date(billingPeriod.end_date), 'MMM dd, yyyy')}`, 15, 45);
      doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 15, 55);

      // Company info (if available)
      if (companySettings) {
        doc.text(`Currency: ${companySettings.currency || 'USD'}`, pageWidth - 60, 35);
        doc.text(`Frequency: ${billingPeriod.frequency.replace('_', '-')}`, pageWidth - 60, 45);
      }

      // Table data
      const tableData = rows.map(row => [
        row.date,
        row.description,
        row.hours.toFixed(2),
        formatCurrency(row.amount)
      ]);

      // Add table
      autoTable(doc, {
        head: [['Date', 'Description', 'Hours', 'Amount']],
        body: tableData,
        startY: 65,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [63, 81, 181],
          textColor: 255,
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Date
          1: { cellWidth: 90 }, // Description
          2: { cellWidth: 20, halign: 'right' }, // Hours
          3: { cellWidth: 25, halign: 'right' }, // Amount
        },
        didDrawPage: (data) => {
          // Add page numbers
          const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
          doc.setFontSize(8);
          doc.text(`Page ${pageNumber}`, pageWidth - 20, doc.internal.pageSize.height - 10);
        },
      });

      // Add totals
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Total Hours: ${totalHours.toFixed(2)}`, pageWidth - 80, finalY);
      doc.text(`Total Amount: ${formatCurrency(totalAmount)}`, pageWidth - 80, finalY + 10);

      // Add footer
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('This is a system-generated report.', pageWidth / 2, doc.internal.pageSize.height - 20, { align: 'center' });

      // Save the PDF
      const fileName = `billing-report-${billingPeriod.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      alert('PDF exported successfully!');
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const { rows, totalHours, totalAmount } = processReportData();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Export Detailed PDF Report
            </CardTitle>
            <CardDescription>
              Generate a comprehensive PDF report for {billingPeriod.name}
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
          {/* Report Summary */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Period</label>
                  <div className="text-sm">
                    {format(new Date(billingPeriod.start_date), 'MMM dd')} - {format(new Date(billingPeriod.end_date), 'MMM dd, yyyy')}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Frequency</label>
                  <div className="text-sm">{billingPeriod.frequency.replace('_', '-')}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Hours</label>
                  <div className="text-lg font-semibold">{totalHours.toFixed(2)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Amount</label>
                  <div className="text-lg font-semibold">{formatCurrency(totalAmount)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <div>
            <h3 className="text-lg font-medium mb-3">Report Preview</h3>
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
              {rows.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-sm font-medium border-b pb-2">
                    <span>Date</span>
                    <span>Description</span>
                    <span className="text-right">Hours</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {rows.slice(0, 10).map((row, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 text-sm">
                      <span>{row.date}</span>
                      <span className="truncate" title={row.description}>{row.description}</span>
                      <span className="text-right">{row.hours.toFixed(2)}</span>
                      <span className="text-right">{formatCurrency(row.amount)}</span>
                    </div>
                  ))}
                  {rows.length > 10 && (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      ... and {rows.length - 10} more entries
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No time entries found for this period
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={generatePDF} 
              disabled={isGenerating || rows.length === 0}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {format} from 'date-fns';
import type {ClientInvoiceDetail} from '@/lib/db/client-invoicing-service';

// Client-invoice PDF export. Adapted from components/billing/pdf-exporter.tsx
// (same jsPDF + jspdf-autotable stack) but driven by a single ClientInvoiceDetail
// bundle: branding from company_billing_settings, "Bill To" from the client,
// and one table row per stored line item. numeric columns arrive as strings
// from supabase-js, so every money/quantity value is coerced with Number().

type RGB = [number, number, number];

const DEFAULT_PRIMARY: RGB = [37, 99, 235]; // tailwind blue-600

function hexToRgb(hex: string | null | undefined): RGB {
  if (!hex) return DEFAULT_PRIMARY;
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) return DEFAULT_PRIMARY;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return DEFAULT_PRIMARY;
  return [r, g, b];
}

function money(value: string | number | null | undefined, currency: string): string {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(Number(value ?? 0));
}

function pdfDate(value: string | null | undefined): string {
  if (!value) return '—';
  return format(new Date(value), 'MMM dd, yyyy');
}

interface AutoTableDoc {
  lastAutoTable: {finalY: number};
}

/** Build + download a branded PDF for a single client invoice. */
export function downloadClientInvoicePdf(detail: ClientInvoiceDetail): void {
  const {billingSettings, client, line_items} = detail;
  const currency = detail.currency || billingSettings?.currency || 'USD';
  const primary = hexToRgb(billingSettings?.brand_primary_color);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const marginX = 15;
  const rightX = pageWidth - marginX;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text('INVOICE', marginX, 22);

  doc.setTextColor(33, 33, 33);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`# ${detail.invoice_number}`, marginX, 30);
  doc.text(`Status: ${detail.status.toUpperCase()}`, marginX, 36);

  // From (company branding) — right aligned
  const fromLines: string[] = [];
  if (billingSettings?.company_address)
    fromLines.push(...billingSettings.company_address.split('\n'));
  if (billingSettings?.company_email) fromLines.push(billingSettings.company_email);
  if (billingSettings?.company_phone) fromLines.push(billingSettings.company_phone);
  if (billingSettings?.company_website) fromLines.push(billingSettings.company_website);
  doc.setFontSize(9);
  let fromY = 18;
  for (const line of fromLines) {
    doc.text(line, rightX, fromY, {align: 'right'});
    fromY += 5;
  }

  // Meta (left) + Bill To (right block)
  doc.setFontSize(10);
  doc.text(`Issue Date: ${pdfDate(detail.issue_date)}`, marginX, 48);
  doc.text(`Due Date: ${pdfDate(detail.due_date)}`, marginX, 54);
  if (detail.period_start && detail.period_end) {
    doc.text(
      `Period: ${pdfDate(detail.period_start)} - ${pdfDate(detail.period_end)}`,
      marginX,
      60,
    );
  }

  const billToX = rightX - 65;
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', billToX, 48);
  doc.setFont('helvetica', 'normal');
  const billTo: string[] = [];
  if (client?.name) billTo.push(client.name);
  if (client?.contact_email) billTo.push(client.contact_email);
  if (client?.contact_phone) billTo.push(client.contact_phone);
  if (client?.website) billTo.push(client.website);
  let billY = 54;
  for (const line of billTo) {
    doc.text(line, billToX, billY);
    billY += 6;
  }

  // Line items
  autoTable(doc, {
    head: [['Description', 'Hours', 'Rate', 'Amount']],
    body: line_items.map((li) => [
      li.description,
      Number(li.quantity).toFixed(2),
      money(li.unit_rate, currency),
      money(li.amount, currency),
    ]),
    startY: 72,
    styles: {fontSize: 9, cellPadding: 3},
    headStyles: {fillColor: primary, textColor: 255, fontStyle: 'bold'},
    columnStyles: {
      0: {cellWidth: 95},
      1: {cellWidth: 25, halign: 'right'},
      2: {cellWidth: 30, halign: 'right'},
      3: {cellWidth: 30, halign: 'right'},
    },
  });

  // Totals
  const finalY = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 10;
  const labelX = rightX - 60;
  const taxRate = Number(detail.tax_rate ?? 0);
  doc.setFontSize(10);
  doc.text('Subtotal', labelX, finalY);
  doc.text(money(detail.subtotal, currency), rightX, finalY, {align: 'right'});
  doc.text(`Tax (${taxRate.toFixed(2)}%)`, labelX, finalY + 6);
  doc.text(money(detail.tax_amount, currency), rightX, finalY + 6, {align: 'right'});
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total', labelX, finalY + 15);
  doc.text(money(detail.total, currency), rightX, finalY + 15, {align: 'right'});

  // Footer
  if (billingSettings?.invoice_footer) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    const footer = doc.splitTextToSize(billingSettings.invoice_footer, pageWidth - marginX * 2);
    doc.text(footer, pageWidth / 2, pageHeight - 20, {align: 'center'});
  }

  doc.save(`${detail.invoice_number}.pdf`);
}

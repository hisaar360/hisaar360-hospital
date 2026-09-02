import {
  buildHmsStandardDocumentHtml,
  buildHmsSummaryCardsHtml,
  buildHmsTableHtml,
  formatHmsDateTime,
  formatHmsMoney,
  patientDisplayName,
} from '../utils/hms-document-template.util';
import { HmsDocumentHospitalInfo } from '../services/hms-document.types';
import { Bill } from '../../shared/models/hospital.model';

export interface InvoiceDocumentContext {
  bill: Bill;
  hospital?: HmsDocumentHospitalInfo | null;
  generatedBy?: string;
}

export function buildInvoiceDocumentHtml(context: InvoiceDocumentContext): string {
  const { bill } = context;
  const itemRows = (bill.items || []).map((item) => [
    item.description,
    String(item.quantity),
    formatHmsMoney(item.unitPrice),
    formatHmsMoney(item.total ?? item.quantity * item.unitPrice),
  ]);

  const bodyHtml = `
    ${buildHmsSummaryCardsHtml([
      { label: 'Subtotal', value: formatHmsMoney(bill.subtotal) },
      { label: 'Discount', value: formatHmsMoney(bill.discount) },
      { label: 'Tax', value: formatHmsMoney(bill.tax) },
      { label: 'Grand Total', value: formatHmsMoney(bill.grandTotal) },
      { label: 'Paid', value: formatHmsMoney(bill.paidAmount) },
      { label: 'Due', value: formatHmsMoney(bill.dueAmount) },
    ])}
    <section class="hms-doc-section">
      <h3>Invoice Items</h3>
      ${buildHmsTableHtml(
        ['Description', 'Qty', 'Unit Price', 'Total'],
        itemRows,
        { numericColumns: [1, 2, 3], emptyMessage: 'No items on this invoice.' }
      )}
    </section>
    <section class="hms-doc-section">
      <h3>Payment Status</h3>
      ${buildHmsTableHtml(
        ['Field', 'Value'],
        [
          ['Status', bill.paymentStatus],
          ['Payment Method', bill.paymentMethod || '—'],
          ['Source', bill.sourceNo || bill.sourceType || 'Manual bill'],
          ['Created', formatHmsDateTime(bill.createdAt)],
        ]
      )}
    </section>`;

  return buildHmsStandardDocumentHtml({
    title: 'Invoice',
    hospital: context.hospital,
    documentNumber: bill.billNo,
    metaRows: [
      { label: 'Patient', value: patientDisplayName(bill.patient) },
      { label: 'MR', value: bill.patient?.patientNo || '—' },
      { label: 'Source Type', value: bill.sourceType || '—' },
      { label: 'Source No', value: bill.sourceNo || '—' },
    ],
    bodyHtml,
    generatedAt: formatHmsDateTime(new Date()),
    generatedBy: context.generatedBy,
  });
}

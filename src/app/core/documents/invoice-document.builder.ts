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
      {
        label: 'Report Auth Code',
        value:
          (bill.patient as { reportAccessCode?: string } | undefined)?.reportAccessCode ||
          (bill as { reportAccessCode?: string }).reportAccessCode ||
          '—',
      },
      { label: 'Source Type', value: bill.sourceType || '—' },
      { label: 'Source No', value: bill.sourceNo || '—' },
    ],
    bodyHtml:
      bodyHtml +
      `
    <section class="hms-doc-section">
      <h3>Online Lab Reports</h3>
      <p>Visit <strong>https://hisaar360.com/lab-reports</strong> and enter File No plus Report Auth Code from this invoice to view approved lab reports. Do not share the code publicly.</p>
    </section>`,
    generatedAt: formatHmsDateTime(new Date()),
    generatedBy: context.generatedBy,
  });
}

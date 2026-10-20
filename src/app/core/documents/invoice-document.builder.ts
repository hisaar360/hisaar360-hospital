import {
  escHtml,
  formatHmsDateTime,
  formatHmsMoney,
  patientDisplayName,
} from '../utils/hms-document-template.util';
import { HmsDocumentHospitalInfo } from '../services/hms-document.types';
import { Bill } from '../../shared/models/hospital.model';

/** Compact A4 invoice used by preview, PDF, and print actions. */
export interface InvoiceDocumentContext {
  bill: Bill;
  hospital?: HmsDocumentHospitalInfo | null;
  generatedBy?: string;
}

function hospitalHeaderHtml(hospital?: HmsDocumentHospitalInfo | null): string {
  const name = hospital?.name || 'Hospital';
  const address = [hospital?.address, hospital?.city].filter(Boolean).join(', ');
  const contact = [hospital?.phone, hospital?.email].filter(Boolean).join(' · ');

  return `
    <div class="invoice-brand">
      ${
        hospital?.logoUrl
          ? `<img class="invoice-logo" src="${escHtml(hospital.logoUrl)}" alt="Hospital logo" />`
          : '<div class="invoice-logo invoice-logo--fallback">H</div>'
      }
      <div class="invoice-brand__copy">
        <strong>${escHtml(name)}</strong>
        ${address ? `<span>${escHtml(address)}</span>` : ''}
        ${contact ? `<span>${escHtml(contact)}</span>` : ''}
      </div>
    </div>`;
}

function infoCell(label: string, value: unknown): string {
  return `
    <div class="invoice-info__cell">
      <span>${escHtml(label)}</span>
      <strong>${escHtml(value || '—')}</strong>
    </div>`;
}

function moneyRow(label: string, value: unknown, className = ''): string {
  return `
    <div class="invoice-totals__row ${className}">
      <span>${escHtml(label)}</span>
      <strong>${escHtml(formatHmsMoney(value))}</strong>
    </div>`;
}

export function buildInvoiceDocumentHtml(context: InvoiceDocumentContext): string {
  const { bill } = context;
  const reportAccessCode =
    (bill.patient as { reportAccessCode?: string } | undefined)?.reportAccessCode ||
    (bill as { reportAccessCode?: string }).reportAccessCode ||
    '—';
  const status = String(bill.paymentStatus || 'unpaid');
  const createdAt = formatHmsDateTime(bill.createdAt);
  const itemRows = (bill.items || [])
    .map(
      (item, index) => `
        <tr>
          <td class="invoice-item-index">${index + 1}</td>
          <td class="invoice-item-name">${escHtml(item.description || 'Charge')}</td>
          <td class="num">${escHtml(item.quantity)}</td>
          <td class="num">${escHtml(formatHmsMoney(item.unitPrice))}</td>
          <td class="num invoice-item-total">${escHtml(
            formatHmsMoney(item.total ?? item.quantity * item.unitPrice)
          )}</td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escHtml(`Invoice ${bill.billNo || ''}`.trim())}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body {
      background: #fff;
      color: #172033;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5px;
      line-height: 1.35;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-sheet {
      margin: 0 auto;
      max-width: 194mm;
      width: 100%;
    }
    .invoice-top {
      align-items: flex-start;
      border-bottom: 1.5px solid #0f8f8f;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding-bottom: 8px;
    }
    .invoice-brand {
      align-items: center;
      display: flex;
      gap: 9px;
      min-width: 0;
    }
    .invoice-logo {
      border-radius: 7px;
      flex: 0 0 auto;
      height: 42px;
      object-fit: contain;
      width: 42px;
    }
    .invoice-logo--fallback {
      align-items: center;
      background: #e8f7f7;
      color: #0f8f8f;
      display: flex;
      font-size: 17px;
      font-weight: 800;
      justify-content: center;
    }
    .invoice-brand__copy {
      display: grid;
      gap: 1px;
      min-width: 0;
    }
    .invoice-brand__copy strong {
      color: #0f172a;
      font-size: 16px;
      letter-spacing: -.02em;
      line-height: 1.15;
    }
    .invoice-brand__copy span {
      color: #64748b;
      font-size: 9.5px;
    }
    .invoice-title {
      flex: 0 0 auto;
      text-align: right;
    }
    .invoice-title h1 {
      color: #0f8f8f;
      font-size: 20px;
      letter-spacing: .08em;
      line-height: 1;
      margin: 1px 0 4px;
      text-transform: uppercase;
    }
    .invoice-title strong {
      color: #0f172a;
      display: block;
      font-size: 11px;
    }
    .invoice-status {
      background: #e8f7f7;
      border-radius: 999px;
      color: #0b7474;
      display: inline-block;
      font-size: 8.5px;
      font-weight: 800;
      letter-spacing: .05em;
      margin-top: 5px;
      padding: 3px 7px;
      text-transform: uppercase;
    }
    .invoice-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      display: grid;
      grid-template-columns: 1.4fr .65fr .9fr .85fr;
      margin: 8px 0 10px;
      overflow: hidden;
    }
    .invoice-info__cell {
      border-right: 1px solid #e2e8f0;
      display: grid;
      gap: 1px;
      min-width: 0;
      padding: 6px 8px;
    }
    .invoice-info__cell:last-child { border-right: 0; }
    .invoice-info__cell span {
      color: #64748b;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .invoice-info__cell strong {
      font-size: 10px;
      overflow-wrap: anywhere;
    }
    .invoice-section-title {
      align-items: center;
      color: #334155;
      display: flex;
      font-size: 9px;
      font-weight: 800;
      gap: 7px;
      letter-spacing: .08em;
      margin: 0 0 5px;
      text-transform: uppercase;
    }
    .invoice-section-title::after {
      background: #e2e8f0;
      content: '';
      flex: 1 1 auto;
      height: 1px;
    }
    .invoice-table {
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
    }
    .invoice-table thead { display: table-header-group; }
    .invoice-table tr { break-inside: avoid; page-break-inside: avoid; }
    .invoice-table th {
      background: #eef7f7;
      border-bottom: 1px solid #cbd5e1;
      color: #334155;
      font-size: 8.5px;
      letter-spacing: .03em;
      padding: 5px 6px;
      text-align: left;
      text-transform: uppercase;
    }
    .invoice-table td {
      border-bottom: 1px solid #e8edf2;
      padding: 5px 6px;
      vertical-align: top;
    }
    .invoice-table tbody tr:nth-child(even) td { background: #fbfcfd; }
    .invoice-table .invoice-item-index { color: #94a3b8; text-align: center; width: 6%; }
    .invoice-table .invoice-item-name { font-weight: 600; width: 46%; }
    .invoice-table .num { text-align: right; white-space: nowrap; width: 16%; }
    .invoice-table .invoice-item-total { font-weight: 700; }
    .invoice-empty {
      border: 1px solid #e2e8f0;
      color: #64748b;
      margin: 0;
      padding: 10px;
      text-align: center;
    }
    .invoice-bottom {
      align-items: start;
      break-inside: avoid;
      display: grid;
      gap: 14px;
      grid-template-columns: minmax(0, 1fr) 245px;
      margin-top: 9px;
      page-break-inside: avoid;
    }
    .invoice-payment {
      border-left: 3px solid #cdeaea;
      color: #475569;
      display: grid;
      gap: 3px;
      padding: 4px 0 4px 8px;
    }
    .invoice-payment div {
      display: flex;
      gap: 7px;
    }
    .invoice-payment span { color: #64748b; min-width: 78px; }
    .invoice-payment strong { color: #1e293b; }
    .invoice-totals {
      border-top: 1.5px solid #0f8f8f;
      padding-top: 4px;
    }
    .invoice-totals__row {
      display: flex;
      gap: 12px;
      justify-content: space-between;
      padding: 2px 1px;
    }
    .invoice-totals__row span { color: #64748b; }
    .invoice-totals__row strong { white-space: nowrap; }
    .invoice-totals__row.is-grand {
      border-top: 1px solid #cbd5e1;
      color: #0f172a;
      font-size: 12.5px;
      margin-top: 3px;
      padding-top: 5px;
    }
    .invoice-totals__row.is-due {
      color: #b42318;
      font-weight: 700;
    }
    .invoice-report-note {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      color: #475569;
      font-size: 9px;
      margin-top: 10px;
      padding: 6px 8px;
    }
    .invoice-report-note strong { color: #1e293b; }
    .invoice-footer {
      align-items: center;
      border-top: 1px dashed #cbd5e1;
      color: #64748b;
      display: flex;
      font-size: 8.5px;
      gap: 12px;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 6px;
    }
    @media print {
      .invoice-sheet { max-width: none; }
    }
  </style>
</head>
<body>
  <main class="invoice-sheet">
    <header class="invoice-top">
      ${hospitalHeaderHtml(context.hospital)}
      <div class="invoice-title">
        <h1>Invoice</h1>
        <strong>${escHtml(bill.billNo || '—')}</strong>
        <span class="invoice-status">${escHtml(status)}</span>
      </div>
    </header>

    <section class="invoice-info">
      ${infoCell('Patient', patientDisplayName(bill.patient))}
      ${infoCell('MR No.', bill.patient?.patientNo || '—')}
      ${infoCell('Created', createdAt)}
      ${infoCell('Source', bill.sourceNo || bill.sourceType || 'Manual bill')}
    </section>

    <h2 class="invoice-section-title">Bill items</h2>
    ${
      itemRows
        ? `<table class="invoice-table">
            <thead>
              <tr><th>#</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Total</th></tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>`
        : '<p class="invoice-empty">No items on this invoice.</p>'
    }

    <section class="invoice-bottom">
      <div class="invoice-payment">
        <div><span>Payment</span><strong>${escHtml(status.toUpperCase())}</strong></div>
        <div><span>Method</span><strong>${escHtml(bill.paymentMethod || '—')}</strong></div>
        <div><span>Auth code</span><strong>${escHtml(reportAccessCode)}</strong></div>
      </div>
      <div class="invoice-totals">
        ${moneyRow('Subtotal', bill.subtotal)}
        ${moneyRow('Discount', bill.discount)}
        ${moneyRow('Tax', bill.tax)}
        ${moneyRow('Grand total', bill.grandTotal, 'is-grand')}
        ${moneyRow('Paid', bill.paidAmount)}
        ${moneyRow('Due', bill.dueAmount, 'is-due')}
      </div>
    </section>

    <aside class="invoice-report-note">
      <strong>Online lab reports:</strong> Visit hisaar360.com/lab-reports and enter the File No. with the Report Auth Code shown above. Keep the code private.
    </aside>

    <footer class="invoice-footer">
      <span>Generated ${escHtml(formatHmsDateTime(new Date()))}${
        context.generatedBy ? ` by ${escHtml(context.generatedBy)}` : ''
      }</span>
      <strong>Hisaar360 Hospital Management System</strong>
    </footer>
  </main>
</body>
</html>`;
}

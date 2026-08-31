import { Hospital, LabOrder } from '../../../shared/models/hospital.model';
import { resolveAssetUrl } from '../../../core/utils/asset.util';
import { resolveLabPrintDetails } from './lab-print-details';

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value: number | string | null | undefined): string {
  const amount = Number(value || 0);
  return `Rs. ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function sourceLabel(source: LabOrder['source']): string {
  switch (source) {
    case 'doctor':
      return 'Doctor Prescribed';
    case 'admission':
      return 'Admission';
    case 'emergency':
      return 'Emergency';
    default:
      return 'Walk-in';
  }
}

function paymentStatus(order: LabOrder): 'paid' | 'partial' | 'unpaid' | 'no-charge' {
  if (order.paymentStatus === 'paid' || order.paymentStatus === 'partial' || order.paymentStatus === 'unpaid') {
    const total = Number(order.totalAmount || 0);
    if (total <= 0) {
      return 'no-charge';
    }
    return order.paymentStatus;
  }

  const total = Number(order.totalAmount || 0);
  const paid = Number(order.paidAmount || 0);
  const balance = Number(order.balanceAmount || Math.max(total - paid, 0));
  if (total <= 0) {
    return 'no-charge';
  }
  if (balance <= 0 && paid > 0) {
    return 'paid';
  }
  if (paid > 0) {
    return 'partial';
  }
  return 'unpaid';
}

function paymentStatusLabel(status: ReturnType<typeof paymentStatus>): string {
  switch (status) {
    case 'paid':
      return 'PAID';
    case 'partial':
      return 'PARTIAL';
    case 'no-charge':
      return 'NO CHARGE';
    default:
      return 'UNPAID';
  }
}

function receiverName(order: LabOrder): string {
  return order.receivedBy?.name || '';
}

function patientName(order: LabOrder): string {
  const patient = order.patient;
  if (!patient) {
    return 'Patient';
  }
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
}

export function buildLabInvoiceHtml(order: LabOrder, hospital: Hospital | null): string {
  const printDetails = resolveLabPrintDetails(hospital, { mode: 'receipt' });
  const headerName = (printDetails.name || hospital?.name || 'Laboratory').toUpperCase();
  const logoUrl = resolveAssetUrl(hospital?.logoUrl);
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const items = (order.items || []).filter((item) => item.status !== 'cancelled');
  const rows = items
    .map((item) => {
      const label =
        item.shortCode && item.testName && item.shortCode !== item.testName
          ? `${item.shortCode} (${item.testName})`
          : item.testName || item.shortCode || '-';
      return `
        <tr>
          <td>${escapeHtml(label)}</td>
          <td>${escapeHtml(item.department || '-')}</td>
          <td>${escapeHtml(item.sampleType || '-')}</td>
          <td class="amount">${escapeHtml(formatCurrency(item.price))}</td>
        </tr>
      `;
    })
    .join('');

  const status = paymentStatus(order);
  const paidAt = order.paidAt ? new Date(order.paidAt).toLocaleString() : '';
  const received = receiverName(order);
  const method = String(order.paymentMethod || 'cash').replace(/^\w/, (letter) => letter.toUpperCase());
  const ledgerLine = order.encounterId
    ? 'Posted to hospital ledger'
    : 'Will post to hospital ledger on save';

  return `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(order.orderNo)} Invoice</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { box-sizing: border-box; }
          html, body {
            background: #fff;
            color: #000;
            font-family: "Courier New", Courier, monospace;
            font-size: 11px;
            margin: 0;
            padding: 0;
          }
          body {
            display: flex;
            justify-content: center;
            padding: 0;
          }
          .receipt {
            margin: 0 auto;
            max-width: 80mm;
            padding: 4mm 3mm 6mm;
            width: 72mm;
          }
          .center { text-align: center; }
          .brand-logo {
            display: block;
            height: 36px;
            margin: 0 auto 6px;
            object-fit: contain;
            width: 36px;
          }
          .hospital-name {
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.03em;
            margin: 0 0 4px;
            text-transform: uppercase;
          }
          .hospital-line { font-size: 10px; margin: 0 0 2px; }
          .receipt-title {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.1em;
            margin: 8px 0 0;
            text-transform: uppercase;
          }
          .rule { border: 0; border-top: 1px solid #000; margin: 8px 0; }
          .line { font-size: 10px; margin: 0 0 2px; word-break: break-word; }
          table { border-collapse: collapse; width: 100%; }
          th, td { font-size: 10px; padding: 3px 0; text-align: left; vertical-align: top; }
          th { border-bottom: 1px solid #000; }
          .amount { text-align: right; white-space: nowrap; }
          .status-banner {
            border: 1px dashed #000;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.08em;
            margin: 8px 0;
            padding: 6px 0;
            text-align: center;
            text-transform: uppercase;
          }
          .kv { display: flex; justify-content: space-between; gap: 8px; }
          .kv.balance { font-weight: 700; }
          .status-paid { font-weight: 700; }
          .foot { font-size: 10px; text-align: center; }
          .foot p { margin: 0 0 3px; }
          @media print {
            body { margin: 0 !important; }
          }
        </style>
      </head>
      <body>
        <section class="receipt">
          <div class="center">
            ${logoUrl ? `<img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="" />` : ''}
            <h1 class="hospital-name">${escapeHtml(headerName)}</h1>
            ${printDetails.tagline ? `<p class="hospital-line">${escapeHtml(printDetails.tagline)}</p>` : ''}
            ${printDetails.addressLine ? `<p class="hospital-line">${escapeHtml(printDetails.addressLine)}</p>` : ''}
            ${printDetails.phone ? `<p class="hospital-line">${escapeHtml(printDetails.phone)}</p>` : ''}
            <p class="receipt-title">Laboratory Invoice</p>
            <p class="status-banner">${escapeHtml(paymentStatusLabel(status))}</p>
          </div>
          <hr class="rule" />
          <div>
            <div class="line">Order No: ${escapeHtml(order.orderNo)}</div>
            <div class="line">Date: ${escapeHtml(orderDate)}</div>
            <div class="line">Source: ${escapeHtml(sourceLabel(order.source))}</div>
            ${order.referredBy ? `<div class="line">Referred By: ${escapeHtml(order.referredBy)}</div>` : ''}
          </div>
          <hr class="rule" />
          <div>
            <div class="line">Patient: ${escapeHtml(patientName(order))}</div>
            <div class="line">File No: ${escapeHtml(order.patient?.patientNo || '-')}</div>
            <div class="line">Phone: ${escapeHtml(order.patient?.phone || '-')}</div>
          </div>
          <hr class="rule" />
          <table>
            <thead>
              <tr>
                <th>Test</th>
                <th>Dept</th>
                <th>Sample</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <hr class="rule" />
          <div>
            <div class="kv"><span>Total:</span><span>${escapeHtml(formatCurrency(order.totalAmount))}</span></div>
            <div class="kv"><span>Paid:</span><span>${escapeHtml(formatCurrency(order.paidAmount))}</span></div>
            <div class="kv balance"><span>Balance:</span><span>${escapeHtml(formatCurrency(order.balanceAmount))}</span></div>
            ${
              status === 'paid' || status === 'partial'
                ? `<div class="line">Received by: ${escapeHtml(received || 'Laboratory staff')}</div>
                   <div class="line">Method: ${escapeHtml(method)}</div>
                   ${paidAt ? `<div class="line">Paid at: ${escapeHtml(paidAt)}</div>` : ''}`
                : '<div class="line">Payment not received at laboratory.</div>'
            }
            <div class="line">${escapeHtml(ledgerLine)}</div>
          </div>
          <hr class="rule" />
          ${order.notes ? `<div class="line">Notes: ${escapeHtml(order.notes)}</div><hr class="rule" />` : ''}
          <div class="foot">
            <p>Please keep this invoice for sample collection and report collection.</p>
            <p>${
              status === 'paid'
                ? 'Payment received. Thank you.'
                : status === 'partial'
                  ? 'Partial payment received. Remaining balance can be paid at the lab or on the hospital bill.'
                  : 'UNPAID. Pay at the laboratory now or this amount stays on the hospital visit bill.'
            }</p>
            <p>Thank you for choosing ${escapeHtml(hospital?.name || printDetails.name || 'our laboratory')}.</p>
          </div>
        </section>
      </body>
    </html>
  `;
}

export function printLabInvoice(order: LabOrder, hospital: Hospital | null): boolean {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Lab invoice print');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    border: '0',
    height: '0',
    left: '-10000px',
    opacity: '0',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    width: '100vw',
  });
  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;
  const printDocument = iframe.contentDocument || printWindow?.document;
  if (!printWindow || !printDocument) {
    iframe.remove();
    return false;
  }

  printDocument.open();
  printDocument.write(buildLabInvoiceHtml(order, hospital));
  printDocument.close();

  let handled = false;
  const finish = () => {
    if (handled) {
      return;
    }
    handled = true;
    iframe.remove();
  };

  printWindow.onafterprint = finish;
  window.setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      finish();
    }
  }, 200);
  window.setTimeout(finish, 30000);
  return true;
}

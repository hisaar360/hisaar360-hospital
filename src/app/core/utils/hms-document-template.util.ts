import {
  HmsDocumentHospitalInfo,
  HmsDocumentMetaRow,
  HmsStandardDocumentOptions,
} from '../services/hms-document.types';

export function escHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatHmsDate(value?: string | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatHmsDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB');
}

export function formatHmsMoney(value: unknown, currency = 'PKR'): string {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return `${currency} 0`;
  return `${currency} ${parsed.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function patientDisplayName(patient?: { firstName?: string; lastName?: string; patientNo?: string } | null): string {
  if (!patient) return '—';
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim();
  return name || patient.patientNo || '—';
}

const HMS_DOCUMENT_STYLES = `
  @page { size: A4 portrait; margin: 12mm; }
  @page landscape { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #0f172a;
    margin: 0;
    background: #fff;
    font-size: 12px;
    line-height: 1.45;
  }
  .hms-doc-sheet {
    max-width: 780px;
    margin: 0 auto;
    padding: 0;
  }
  .hms-doc-sheet.landscape { max-width: 1080px; }
  .hms-doc-header {
    display: grid;
    grid-template-columns: 88px 1fr;
    gap: 14px;
    align-items: center;
    border-bottom: 2px solid #1e3a8a;
    padding-bottom: 12px;
    margin-bottom: 14px;
  }
  .hms-doc-logo {
    width: 80px;
    height: 80px;
    object-fit: contain;
  }
  .hms-doc-hospital-name {
    font-size: 20px;
    font-weight: 700;
    color: #1e3a8a;
  }
  .hms-doc-hospital-meta {
    font-size: 11px;
    color: #475569;
    margin-top: 4px;
  }
  .hms-doc-title {
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 10px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }
  .hms-doc-meta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 16px;
    margin-bottom: 14px;
    font-size: 12px;
  }
  .hms-doc-meta-row {
    display: flex;
    gap: 8px;
  }
  .hms-doc-meta-row .label {
    min-width: 110px;
    color: #64748b;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.4px;
  }
  .hms-doc-meta-row .value { font-weight: 600; }
  .hms-doc-section { margin-bottom: 14px; }
  .hms-doc-section h3 {
    margin: 0 0 8px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #1e3a8a;
    border-bottom: 1px solid #dbeafe;
    padding-bottom: 4px;
  }
  .hms-doc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  .hms-doc-table th,
  .hms-doc-table td {
    border: 1px solid #cbd5e1;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  .hms-doc-table th {
    background: #f8fafc;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .hms-doc-table .num { text-align: right; white-space: nowrap; }
  .hms-doc-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 14px;
  }
  .hms-doc-summary-card {
    border: 1px solid #dbeafe;
    background: #f8fafc;
    border-radius: 6px;
    padding: 8px 10px;
  }
  .hms-doc-summary-card .label {
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
  }
  .hms-doc-summary-card .value {
    font-size: 14px;
    font-weight: 700;
    margin-top: 4px;
  }
  .hms-doc-generated {
    margin-top: 12px;
    font-size: 10px;
    color: #64748b;
  }
  .hms-doc-footer {
    margin-top: 16px;
    padding-top: 10px;
    border-top: 1px dashed #cbd5e1;
    font-size: 10px;
    color: #64748b;
    text-align: center;
  }
  .hms-doc-note {
    margin-top: 10px;
    font-size: 11px;
    color: #475569;
    font-style: italic;
  }
`;

function hospitalHeaderHtml(hospital?: HmsDocumentHospitalInfo | null): string {
  if (!hospital?.name && !hospital?.logoUrl) {
    return '';
  }
  const addressLine = [hospital.address, hospital.city].filter(Boolean).join(', ');
  const contact = [hospital.phone ? `Phone: ${hospital.phone}` : '', hospital.email ? `Email: ${hospital.email}` : '']
    .filter(Boolean)
    .join(' | ');
  return `
    <header class="hms-doc-header">
      ${hospital.logoUrl ? `<img class="hms-doc-logo" src="${escHtml(hospital.logoUrl)}" alt="Hospital Logo" />` : '<div></div>'}
      <div>
        <div class="hms-doc-hospital-name">${escHtml(hospital.name || 'Hospital')}</div>
        <div class="hms-doc-hospital-meta">
          ${addressLine ? `${escHtml(addressLine)}<br />` : ''}
          ${contact ? escHtml(contact) : ''}
        </div>
      </div>
    </header>`;
}

function metaRowsHtml(rows: HmsDocumentMetaRow[]): string {
  if (!rows.length) return '';
  return `
    <section class="hms-doc-meta">
      ${rows
        .map(
          (row) => `
        <div class="hms-doc-meta-row">
          <span class="label">${escHtml(row.label)}</span>
          <span class="value">${escHtml(row.value)}</span>
        </div>`
        )
        .join('')}
    </section>`;
}

export function buildHmsStandardDocumentHtml(options: HmsStandardDocumentOptions): string {
  const orientation = options.orientation || 'portrait';
  const pageRule =
    orientation === 'landscape'
      ? `@page { size: A4 landscape; margin: 10mm; }`
      : `@page { size: A4 portrait; margin: 12mm; }`;
  const metaRows: HmsDocumentMetaRow[] = [...(options.metaRows || [])];
  if (options.documentNumber) {
    metaRows.unshift({ label: 'Document No', value: options.documentNumber });
  }
  if (options.dateRangeLabel && options.dateRangeValue) {
    metaRows.push({ label: options.dateRangeLabel, value: options.dateRangeValue });
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escHtml(options.title)}</title>
  <style>${HMS_DOCUMENT_STYLES.replace('@page { size: A4 portrait; margin: 12mm; }', pageRule)}</style>
</head>
<body>
  <div class="hms-doc-sheet ${orientation === 'landscape' ? 'landscape' : ''}">
    ${hospitalHeaderHtml(options.hospital)}
    <h1 class="hms-doc-title">${escHtml(options.title)}</h1>
    ${metaRowsHtml(metaRows)}
    ${options.bodyHtml}
    ${
      options.generatedAt || options.generatedBy
        ? `<div class="hms-doc-generated">Generated ${escHtml(options.generatedAt || formatHmsDateTime(new Date()))}${
            options.generatedBy ? ` by ${escHtml(options.generatedBy)}` : ''
          }</div>`
        : ''
    }
    ${options.footerNote ? `<div class="hms-doc-note">${escHtml(options.footerNote)}</div>` : ''}
    <footer class="hms-doc-footer">Hisaar360 Hospital Management System</footer>
  </div>
</body>
</html>`;
}

export function buildHmsTableHtml(
  headers: string[],
  rows: string[][],
  options?: { numericColumns?: number[]; emptyMessage?: string }
): string {
  if (!rows.length) {
    return `<p>${escHtml(options?.emptyMessage || 'No records found.')}</p>`;
  }
  const numeric = new Set(options?.numericColumns || []);
  return `
    <table class="hms-doc-table">
      <thead>
        <tr>${headers.map((header) => `<th>${escHtml(header)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${row
                .map((cell, index) => `<td class="${numeric.has(index) ? 'num' : ''}">${escHtml(cell)}</td>`)
                .join('')}</tr>`
          )
          .join('')}
      </tbody>
    </table>`;
}

export function buildHmsSummaryCardsHtml(cards: Array<{ label: string; value: string }>): string {
  if (!cards.length) return '';
  return `
    <section class="hms-doc-summary">
      ${cards
        .map(
          (card) => `
        <div class="hms-doc-summary-card">
          <div class="label">${escHtml(card.label)}</div>
          <div class="value">${escHtml(card.value)}</div>
        </div>`
        )
        .join('')}
    </section>`;
}

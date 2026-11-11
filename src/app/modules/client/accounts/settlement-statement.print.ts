/** Bank-statement style HTML for settlement ledgers (print + PDF download). */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { printHtmlJob } from '../../../core/keyboard/print-job.util';

export type StatementLine = {
  date: string;
  ref?: string;
  description: string;
  credit?: number;
  debit?: number;
  balance?: number;
};

export type StatementKpi = {
  label: string;
  value: string;
  tone?: 'teal' | 'navy' | 'green' | 'red' | 'amber';
};

export type StatementPayload = {
  title: string;
  hospitalName: string;
  periodLabel: string;
  dateFrom?: string;
  dateTo?: string;
  generatedBy?: string;
  kpis: StatementKpi[];
  lines: StatementLine[];
  footerNote?: string;
};

const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (n: number | undefined): string => {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const sumCredits = (lines: StatementLine[]): number =>
  lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);

const sumDebits = (lines: StatementLine[]): number =>
  lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);

const closingBalance = (lines: StatementLine[]): number | null => {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].balance != null) {
      return Number(lines[i].balance || 0);
    }
  }
  return null;
};

/** Merge caller KPIs with standard bank-statement totals. */
export const enrichStatementKpis = (payload: StatementPayload): StatementKpi[] => {
  const credit = sumCredits(payload.lines);
  const debit = sumDebits(payload.lines);
  const closing = closingBalance(payload.lines);
  const periodFrom = payload.dateFrom || payload.periodLabel.split('→')[0]?.trim() || '—';
  const periodTo =
    payload.dateTo || payload.periodLabel.split('→')[1]?.trim() || payload.periodLabel || '—';

  const base: StatementKpi[] = [
    { label: 'From date', value: periodFrom, tone: 'navy' },
    { label: 'To date', value: periodTo, tone: 'navy' },
    { label: 'Total credit', value: money(credit), tone: 'green' },
    { label: 'Total debit', value: money(debit), tone: 'red' },
  ];
  if (closing != null) {
    base.push({ label: 'Closing balance', value: money(closing), tone: 'teal' });
  }
  base.push({
    label: 'Net (credit − debit)',
    value: money(credit - debit),
    tone: credit - debit >= 0 ? 'green' : 'amber',
  });

  // Keep page-specific cards first, then statement totals (dedupe by label).
  const seen = new Set<string>();
  const merged: StatementKpi[] = [];
  for (const kpi of [...payload.kpis, ...base]) {
    const key = kpi.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(kpi);
  }
  return merged;
};

export const buildSettlementStatementHtml = (payload: StatementPayload): string => {
  const kpis = enrichStatementKpis(payload);
  const creditTotal = sumCredits(payload.lines);
  const debitTotal = sumDebits(payload.lines);
  const closing = closingBalance(payload.lines);

  const kpiHtml = kpis
    .map(
      (kpi) => `
      <article class="kpi tone-${esc(kpi.tone || 'navy')}">
        <span>${esc(kpi.label)}</span>
        <strong>${esc(kpi.value)}</strong>
      </article>`
    )
    .join('');

  const rows = payload.lines
    .map((line) => {
      const credit = Number(line.credit || 0);
      const debit = Number(line.debit || 0);
      return `<tr>
        <td>${esc(line.date)}</td>
        <td>${esc(line.ref || '—')}</td>
        <td>${esc(line.description)}</td>
        <td class="num credit">${credit > 0 ? money(credit) : '—'}</td>
        <td class="num debit">${debit > 0 ? money(debit) : '—'}</td>
        <td class="num">${line.balance != null ? money(line.balance) : '—'}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(payload.title)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; color: #111827; margin: 20px; }
    .sheet { max-width: 980px; margin: 0 auto; }
    .brand { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #003e86; }
    .badge { background: #e8f7f7; color: #0f766e; border: 1px solid #99e2e3; border-radius: 999px; font-size: 11px; font-weight: 800; padding: 4px 10px; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 14px; line-height: 1.45; }
    .meta strong { color: #0f172a; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-bottom: 14px; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; background: #f8fcff; }
    .kpi span { display: block; font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; }
    .kpi strong { font-size: 15px; }
    .tone-teal { border-color: #99e2e3; background: #e8f7f7; }
    .tone-green { border-color: #bbf7d0; background: #f0fdf4; }
    .tone-red { border-color: #fecaca; background: #fef2f2; }
    .tone-amber { border-color: #fde68a; background: #fffbeb; }
    .tone-navy { border-color: #bfdbfe; background: #eff6ff; }
    .section-title { color: #003e86; font-size: 13px; font-weight: 800; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.03em; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; color: #334155; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .credit { color: #15803d; font-weight: 700; }
    .debit { color: #b91c1c; font-weight: 700; }
    tfoot td { font-weight: 800; background: #f8fafc; }
    .footer { margin-top: 16px; font-size: 11px; color: #64748b; }
    @media print {
      body { margin: 10px; }
      .kpi { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="brand">
      <div>
        <h1>${esc(payload.title)}</h1>
        <div class="meta">
          <div><strong>${esc(payload.hospitalName)}</strong></div>
          <div>Period: <strong>${esc(payload.periodLabel)}</strong>
            ${payload.dateFrom || payload.dateTo ? ` · From <strong>${esc(payload.dateFrom || '—')}</strong> to <strong>${esc(payload.dateTo || '—')}</strong>` : ''}
          </div>
          <div>Generated: ${esc(new Date().toLocaleString())}${
            payload.generatedBy ? ` · By ${esc(payload.generatedBy)}` : ''
          }</div>
        </div>
      </div>
      <span class="badge">Bank statement</span>
    </div>
    <div class="section-title">Summary cards</div>
    <div class="kpis">${kpiHtml}</div>
    <div class="section-title">Ledger · Credit / Debit / Balance</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Ref / Voucher</th>
          <th>Description</th>
          <th class="num">Credit</th>
          <th class="num">Debit</th>
          <th class="num">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="6">No transactions</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3">Totals</td>
          <td class="num credit">${money(creditTotal)}</td>
          <td class="num debit">${money(debitTotal)}</td>
          <td class="num">${closing != null ? money(closing) : '—'}</td>
        </tr>
      </tfoot>
    </table>
    <div class="footer">${esc(payload.footerNote || 'Bank-statement style settlement report · Hisaar360')}</div>
  </div>
</body>
</html>`;
};

/** Opens system print dialog (Print button). */
export const openSettlementStatementPrint = (payload: StatementPayload): void => {
  const html = buildSettlementStatementHtml(payload);
  printHtmlJob(html, {
    jobType: 'a4',
    title: payload.title || 'Settlement statement',
  });
};

/** Downloads a PDF file (PDF button). */
export const downloadSettlementStatementPdf = async (
  payload: StatementPayload,
  filename = 'settlement-statement.pdf'
): Promise<void> => {
  const html = buildSettlementStatementHtml(payload);
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '210mm';
  host.style.background = '#fff';
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    const canvas = await html2canvas(host, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    const safeName = String(filename || 'settlement-statement.pdf').replace(/[^\w.-]+/g, '-');
    pdf.save(safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
};

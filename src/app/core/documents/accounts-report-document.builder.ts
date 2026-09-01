import {
  buildHmsStandardDocumentHtml,
  buildHmsSummaryCardsHtml,
  buildHmsTableHtml,
  formatHmsDateTime,
  formatHmsMoney,
  patientDisplayName,
} from '../utils/hms-document-template.util';
import { HmsDocumentHospitalInfo } from '../services/hms-document.types';

export interface AccountsReportColumn {
  keys: string[];
  label: string;
  numeric?: boolean;
}

export interface AccountsReportDocumentContext {
  title: string;
  hospital?: HmsDocumentHospitalInfo | null;
  fromDate?: string;
  toDate?: string;
  summaryCards?: Array<{ label: string; value: string }>;
  columns: AccountsReportColumn[];
  rows: Array<Record<string, unknown>>;
  generatedBy?: string;
  orientation?: 'portrait' | 'landscape';
  footerNote?: string;
}

export function buildAccountsReportDocumentHtml(context: AccountsReportDocumentContext): string {
  const displayCell = (row: Record<string, unknown>, keys: string[]): string => {
    for (const key of keys) {
      let current: unknown = row;
      for (const part of key.split('.')) {
        if (!current || typeof current !== 'object') {
          current = undefined;
          break;
        }
        current = (current as Record<string, unknown>)[part];
      }
      if (current != null && current !== '') {
        return String(current);
      }
    }
    return '';
  };

  const tableRows = context.rows.map((row) => context.columns.map((column) => displayCell(row, column.keys)));
  const numericColumns = context.columns
    .map((column, index) => (column.numeric ? index : -1))
    .filter((index) => index >= 0);

  const bodyHtml = `
    ${context.summaryCards?.length ? buildHmsSummaryCardsHtml(context.summaryCards) : ''}
    <section class="hms-doc-section">
      <h3>Report Data</h3>
      ${buildHmsTableHtml(
        context.columns.map((column) => column.label),
        tableRows,
        { numericColumns, emptyMessage: 'No records for the selected period.' }
      )}
    </section>`;

  return buildHmsStandardDocumentHtml({
    title: context.title,
    hospital: context.hospital,
    dateRangeLabel: 'Period',
    dateRangeValue:
      context.fromDate && context.toDate ? `${context.fromDate} to ${context.toDate}` : context.fromDate || context.toDate || '—',
    bodyHtml,
    generatedAt: formatHmsDateTime(new Date()),
    generatedBy: context.generatedBy,
    orientation: context.orientation,
    footerNote: context.footerNote,
  });
}

export function moneySummaryCards(values: Record<string, unknown>): Array<{ label: string; value: string }> {
  return Object.entries(values).map(([label, value]) => ({
    label: label.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
    value: formatHmsMoney(value),
  }));
}

export function patientNameFromRow(row: Record<string, unknown>): string {
  const patient = row['patient'];
  if (patient && typeof patient === 'object') {
    return patientDisplayName(patient as { firstName?: string; lastName?: string; patientNo?: string });
  }
  return displayValue(row['patientName'] || row['name']);
}

function displayValue(value: unknown): string {
  if (value == null || value === '') return '—';
  return String(value);
}

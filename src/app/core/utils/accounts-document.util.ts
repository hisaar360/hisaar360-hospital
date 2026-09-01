import { AccountsReportColumn, AccountsReportDocumentContext } from '../documents/accounts-report-document.builder';
import { formatHmsMoney } from './hms-document-template.util';

export interface AccountsViewDocumentConfig {
  title: string;
  filename: string;
  orientation?: 'portrait' | 'landscape';
  itemKey: string;
  columns: AccountsReportColumn[];
  summaryCards?: Array<{ label: string; value: string }>;
}

const money = (value: unknown): string => formatHmsMoney(value);

export function resolveAccountsViewDocumentConfig(
  view: string,
  data: Record<string, unknown>
): AccountsViewDocumentConfig | null {
  switch (view) {
    case 'general-ledger':
      return {
        title: 'General Ledger',
        filename: 'general-ledger.pdf',
        orientation: 'landscape',
        itemKey: 'entries',
        columns: [
          { keys: ['entryDate', 'date'], label: 'Date' },
          { keys: ['entryNo', 'journalNo'], label: 'Reference' },
          { keys: ['description'], label: 'Description' },
          { keys: ['accountCode'], label: 'Account' },
          { keys: ['debit'], label: 'Debit', numeric: true },
          { keys: ['credit'], label: 'Credit', numeric: true },
          { keys: ['balance'], label: 'Balance', numeric: true },
        ],
        summaryCards: [
          { label: 'Opening Balance', value: money(data['openingBalance']) },
          { label: 'Period Debit', value: money(data['periodDebit']) },
          { label: 'Period Credit', value: money(data['periodCredit']) },
          { label: 'Closing Balance', value: money(data['closingBalance']) },
        ],
      };
    case 'journal':
      return {
        title: 'Journal',
        filename: 'journal.pdf',
        orientation: 'landscape',
        itemKey: 'items',
        columns: [
          { keys: ['entryDate', 'date'], label: 'Date' },
          { keys: ['entryNo', 'journalNo'], label: 'Journal No' },
          { keys: ['description'], label: 'Description' },
          { keys: ['accountCode'], label: 'Account' },
          { keys: ['debit'], label: 'Debit', numeric: true },
          { keys: ['credit'], label: 'Credit', numeric: true },
        ],
      };
    case 'cash-book':
      return {
        title: 'Cash Book',
        filename: 'cash-book.pdf',
        itemKey: 'entries',
        columns: [
          { keys: ['entryDate', 'date'], label: 'Date' },
          { keys: ['entryNo', 'referenceNo'], label: 'Reference' },
          { keys: ['description'], label: 'Description' },
          { keys: ['debit'], label: 'Receipt', numeric: true },
          { keys: ['credit'], label: 'Payment', numeric: true },
          { keys: ['balance'], label: 'Balance', numeric: true },
        ],
      };
    case 'bank-book':
      return {
        title: 'Bank Book',
        filename: 'bank-book.pdf',
        itemKey: 'entries',
        columns: [
          { keys: ['entryDate', 'date'], label: 'Date' },
          { keys: ['entryNo', 'referenceNo'], label: 'Reference' },
          { keys: ['description'], label: 'Description' },
          { keys: ['debit'], label: 'Deposit', numeric: true },
          { keys: ['credit'], label: 'Withdrawal', numeric: true },
          { keys: ['balance'], label: 'Balance', numeric: true },
        ],
      };
    case 'receivables':
      return {
        title: 'Patient Receivables',
        filename: 'receivables.pdf',
        orientation: 'landscape',
        itemKey: 'items',
        columns: [
          { keys: ['patient.patientNo', 'patientNo'], label: 'MR' },
          { keys: ['patient.firstName', 'patientName', 'name'], label: 'Patient' },
          { keys: ['encounterNo'], label: 'Encounter' },
          { keys: ['netPayable', 'amount'], label: 'Net', numeric: true },
          { keys: ['totalPaid', 'paid'], label: 'Paid', numeric: true },
          { keys: ['balance', 'outstanding'], label: 'Outstanding', numeric: true },
        ],
      };
    case 'payables':
      return {
        title: 'Supplier Payables',
        filename: 'payables.pdf',
        orientation: 'landscape',
        itemKey: 'items',
        columns: [
          { keys: ['supplierName', 'name'], label: 'Supplier' },
          { keys: ['invoiceNo', 'referenceNo'], label: 'Invoice' },
          { keys: ['dueDate'], label: 'Due Date' },
          { keys: ['amount'], label: 'Amount', numeric: true },
          { keys: ['paid'], label: 'Paid', numeric: true },
          { keys: ['balance'], label: 'Balance', numeric: true },
        ],
      };
    case 'daily-collections':
      return {
        title: 'Daily Collections',
        filename: 'daily-collections.pdf',
        itemKey: 'items',
        columns: [
          { keys: ['date', 'collectionDate'], label: 'Date' },
          { keys: ['source', 'sourceType'], label: 'Source' },
          { keys: ['method'], label: 'Method' },
          { keys: ['amount'], label: 'Amount', numeric: true },
          { keys: ['referenceNo', 'paymentNo'], label: 'Reference' },
        ],
        summaryCards: [
          { label: 'OPD', value: money(data['opd']) },
          { label: 'IPD', value: money(data['ipd']) },
          { label: 'Lab', value: money(data['lab']) },
          { label: 'Pharmacy', value: money(data['pharmacyCounter']) },
          { label: 'Net Cash Movement', value: money(data['netCashMovement']) },
        ],
      };
    case 'patient-profitability':
      return {
        title: 'Patient Profitability',
        filename: 'patient-profitability.pdf',
        orientation: 'landscape',
        itemKey: 'items',
        columns: [
          { keys: ['patient.patientNo', 'patientNo'], label: 'MR' },
          { keys: ['patient.firstName', 'patientName'], label: 'Patient' },
          { keys: ['revenue', 'totalCharges'], label: 'Revenue', numeric: true },
          { keys: ['cost', 'totalCost'], label: 'Cost', numeric: true },
          { keys: ['profit', 'netProfit'], label: 'Profit', numeric: true },
        ],
      };
    case 'trial-balance':
      return {
        title: 'Trial Balance',
        filename: 'trial-balance.pdf',
        orientation: 'landscape',
        itemKey: 'accounts',
        columns: [
          { keys: ['accountCode', 'code'], label: 'Code' },
          { keys: ['accountName', 'name'], label: 'Account' },
          { keys: ['openingDebit'], label: 'Opening Dr', numeric: true },
          { keys: ['openingCredit'], label: 'Opening Cr', numeric: true },
          { keys: ['periodDebit'], label: 'Period Dr', numeric: true },
          { keys: ['periodCredit'], label: 'Period Cr', numeric: true },
          { keys: ['closingDebit'], label: 'Closing Dr', numeric: true },
          { keys: ['closingCredit'], label: 'Closing Cr', numeric: true },
        ],
      };
    case 'profit-loss':
      return {
        title: 'Profit & Loss',
        filename: 'profit-loss.pdf',
        itemKey: 'lines',
        columns: [
          { keys: ['label', 'name'], label: 'Line Item' },
          { keys: ['amount', 'value'], label: 'Amount', numeric: true },
        ],
        summaryCards: [
          { label: 'Gross Revenue', value: money((data['revenue'] as Record<string, unknown> | undefined)?.['grossRevenue']) },
          { label: 'Gross Profit', value: money(data['grossProfit']) },
          { label: 'Net Profit', value: money(data['netProfit']) },
        ],
      };
    case 'audit':
      return {
        title: 'Financial Audit',
        filename: 'financial-audit.pdf',
        orientation: 'landscape',
        itemKey: 'findings',
        columns: [
          { keys: ['severity'], label: 'Severity' },
          { keys: ['category'], label: 'Category' },
          { keys: ['message', 'description'], label: 'Finding' },
          { keys: ['count'], label: 'Count', numeric: true },
        ],
      };
    case 'reconciliation':
      return {
        title: 'Reconciliation',
        filename: 'reconciliation.pdf',
        orientation: 'landscape',
        itemKey: 'items',
        columns: [
          { keys: ['source'], label: 'Source' },
          { keys: ['systemAmount'], label: 'System', numeric: true },
          { keys: ['externalAmount'], label: 'External', numeric: true },
          { keys: ['difference'], label: 'Difference', numeric: true },
          { keys: ['status'], label: 'Status' },
        ],
      };
    case 'chart-of-accounts':
      return {
        title: 'Chart of Accounts',
        filename: 'chart-of-accounts.pdf',
        orientation: 'landscape',
        itemKey: 'items',
        columns: [
          { keys: ['code', 'accountCode'], label: 'Code' },
          { keys: ['name', 'accountName'], label: 'Account' },
          { keys: ['type'], label: 'Type' },
          { keys: ['balance'], label: 'Balance', numeric: true },
        ],
      };
    default:
      return null;
  }
}

export function buildAccountsViewDocumentContext(
  view: string,
  data: Record<string, unknown>,
  options: Pick<AccountsReportDocumentContext, 'hospital' | 'generatedBy' | 'fromDate' | 'toDate'>
): AccountsReportDocumentContext | null {
  const config = resolveAccountsViewDocumentConfig(view, data);
  if (!config) return null;
  const rows = Array.isArray(data[config.itemKey])
    ? (data[config.itemKey] as Array<Record<string, unknown>>)
    : Array.isArray(data['items'])
      ? (data['items'] as Array<Record<string, unknown>>)
      : [];
  return {
    title: config.title,
    orientation: config.orientation,
    hospital: options.hospital,
    fromDate: options.fromDate,
    toDate: options.toDate,
    summaryCards: config.summaryCards,
    columns: config.columns,
    rows,
    generatedBy: options.generatedBy,
  };
}

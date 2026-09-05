import { AccountsReportColumn, AccountsReportDocumentContext } from '../documents/accounts-report-document.builder';
import { formatHmsMoney } from './hms-document-template.util';

export interface AccountsViewDocumentConfig {
  title: string;
  filename: string;
  orientation?: 'portrait' | 'landscape';
  /** Preferred API array key; resolver also falls back to common aliases. */
  itemKey: string;
  columns: AccountsReportColumn[];
  summaryCards?: Array<{ label: string; value: string }>;
}

const money = (value: unknown): string => formatHmsMoney(value);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asRows = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];

/** Resolve table rows from API payloads that use different collection keys. */
export function resolveAccountsDocumentRows(
  view: string,
  data: Record<string, unknown>,
  preferredKey?: string
): Array<Record<string, unknown>> {
  const candidateKeys = [
    preferredKey,
    'lines',
    'entries',
    'items',
    'rows',
    'accounts',
    'findings',
  ].filter((key): key is string => !!key);

  for (const key of candidateKeys) {
    const rows = asRows(data[key]);
    if (rows.length) {
      return rows;
    }
  }

  if (view === 'profit-loss') {
    const revenue = asRecord(data['revenue']);
    const expenses = asRecord(data['expenses']);
    return [
      ...Object.entries(revenue).map(([label, amount]) => ({ label: `Revenue · ${label}`, amount })),
      ...Object.entries(expenses).map(([label, amount]) => ({ label: `Expense · ${label}`, amount })),
      { label: 'Gross Profit', amount: data['grossProfit'] },
      { label: 'Net Profit', amount: data['netProfit'] },
    ];
  }

  if (view === 'daily-collections') {
    const methods = asRecord(data['methods']);
    const bucketRows = [
      { source: 'OPD', method: '—', amount: data['opd'], referenceNo: '' },
      { source: 'IPD', method: '—', amount: data['ipd'], referenceNo: '' },
      { source: 'Lab', method: '—', amount: data['lab'], referenceNo: '' },
      { source: 'Pharmacy Counter', method: '—', amount: data['pharmacyCounter'], referenceNo: '' },
      { source: 'Other', method: '—', amount: data['other'], referenceNo: '' },
      { source: 'Refunds', method: '—', amount: data['refunds'], referenceNo: '' },
      { source: 'Expenses', method: '—', amount: data['expenses'], referenceNo: '' },
    ].filter((row) => Number(row.amount || 0) !== 0);

    const methodRows = Object.entries(methods).map(([method, amount]) => ({
      source: 'Payment Method',
      method,
      amount,
      referenceNo: '',
    }));

    return [...bucketRows, ...methodRows];
  }

  return [];
}

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
        itemKey: 'lines',
        columns: [
          { keys: ['date', 'entryDate'], label: 'Date' },
          { keys: ['journalNo', 'entryNo', 'referenceNo'], label: 'Reference' },
          { keys: ['description'], label: 'Description' },
          { keys: ['sourceType'], label: 'Source' },
          { keys: ['debit'], label: 'Debit', numeric: true },
          { keys: ['credit'], label: 'Credit', numeric: true },
          { keys: ['runningBalance', 'balance'], label: 'Balance', numeric: true },
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
          { keys: ['date', 'entryDate'], label: 'Date' },
          { keys: ['journalNo', 'entryNo'], label: 'Journal No' },
          { keys: ['description'], label: 'Description' },
          { keys: ['totalDebit', 'debit'], label: 'Debit', numeric: true },
          { keys: ['totalCredit', 'credit'], label: 'Credit', numeric: true },
          { keys: ['status'], label: 'Status' },
        ],
      };
    case 'cash-book':
      return {
        title: 'Cash Book',
        filename: 'cash-book.pdf',
        orientation: 'landscape',
        itemKey: 'lines',
        columns: [
          { keys: ['date', 'entryDate'], label: 'Date' },
          { keys: ['journalNo', 'entryNo', 'referenceNo'], label: 'Reference' },
          { keys: ['description'], label: 'Description' },
          { keys: ['debit'], label: 'Receipt', numeric: true },
          { keys: ['credit'], label: 'Payment', numeric: true },
          { keys: ['runningBalance', 'balance'], label: 'Balance', numeric: true },
        ],
        summaryCards: [
          { label: 'Opening', value: money(data['openingBalance']) },
          { label: 'Period Debit', value: money(data['periodDebit']) },
          { label: 'Period Credit', value: money(data['periodCredit']) },
          { label: 'Closing', value: money(data['closingBalance']) },
        ],
      };
    case 'bank-book':
      return {
        title: 'Bank Book',
        filename: 'bank-book.pdf',
        orientation: 'landscape',
        itemKey: 'lines',
        columns: [
          { keys: ['date', 'entryDate'], label: 'Date' },
          { keys: ['journalNo', 'entryNo', 'referenceNo'], label: 'Reference' },
          { keys: ['description'], label: 'Description' },
          { keys: ['debit'], label: 'Deposit', numeric: true },
          { keys: ['credit'], label: 'Withdrawal', numeric: true },
          { keys: ['runningBalance', 'balance'], label: 'Balance', numeric: true },
        ],
        summaryCards: [
          { label: 'Opening', value: money(data['openingBalance']) },
          { label: 'Period Debit', value: money(data['periodDebit']) },
          { label: 'Period Credit', value: money(data['periodCredit']) },
          { label: 'Closing', value: money(data['closingBalance']) },
        ],
      };
    case 'receivables':
      return {
        title: 'Patient Receivables',
        filename: 'receivables.pdf',
        orientation: 'landscape',
        itemKey: 'items',
        columns: [
          { keys: ['mrn', 'patientNo'], label: 'MR' },
          { keys: ['patientName', 'name'], label: 'Patient' },
          { keys: ['encounterNo'], label: 'Encounter' },
          { keys: ['totalCharges', 'netPayable', 'amount'], label: 'Charges', numeric: true },
          { keys: ['paid', 'totalPaid'], label: 'Paid', numeric: true },
          { keys: ['balance', 'outstanding'], label: 'Outstanding', numeric: true },
          { keys: ['ageBucket'], label: 'Age' },
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
          { keys: ['invoiceNo', 'purchaseNo', 'referenceNo'], label: 'Invoice' },
          { keys: ['dueDate', 'purchaseDate'], label: 'Date' },
          { keys: ['amount', 'total'], label: 'Amount', numeric: true },
          { keys: ['paid', 'paidAmount'], label: 'Paid', numeric: true },
          { keys: ['balance'], label: 'Balance', numeric: true },
        ],
      };
    case 'daily-collections':
      return {
        title: 'Daily Collections',
        filename: 'daily-collections.pdf',
        itemKey: 'items',
        columns: [
          { keys: ['source', 'sourceType'], label: 'Source' },
          { keys: ['method'], label: 'Method' },
          { keys: ['amount'], label: 'Amount', numeric: true },
          { keys: ['referenceNo', 'paymentNo'], label: 'Reference' },
        ],
        summaryCards: [
          { label: 'OPD', value: money(data['opd']) },
          { label: 'IPD', value: money(data['ipd']) },
          { label: 'Lab', value: money(data['lab']) },
          { label: 'Pharmacy Counter', value: money(data['pharmacyCounter']) },
          { label: 'Net Cash Movement', value: money(data['netCashMovement']) },
        ],
      };
    case 'patient-profitability':
      return {
        title: 'Patient Profitability',
        filename: 'patient-profitability.pdf',
        orientation: 'landscape',
        itemKey: 'rows',
        columns: [
          { keys: ['encounterNo'], label: 'Encounter' },
          { keys: ['patient.firstName', 'patientName'], label: 'Patient' },
          { keys: ['encounterType', 'type'], label: 'Type' },
          { keys: ['grossPatientRevenue', 'revenue', 'totalCharges'], label: 'Revenue', numeric: true },
          { keys: ['knownDirectCost', 'cost', 'totalCost'], label: 'Cost', numeric: true },
          { keys: ['grossContribution', 'profit', 'netProfit'], label: 'Contribution', numeric: true },
          { keys: ['collected'], label: 'Collected', numeric: true },
          { keys: ['outstanding'], label: 'Outstanding', numeric: true },
        ],
      };
    case 'trial-balance':
      return {
        title: 'Trial Balance',
        filename: 'trial-balance.pdf',
        orientation: 'landscape',
        itemKey: 'rows',
        columns: [
          { keys: ['code', 'accountCode'], label: 'Code' },
          { keys: ['name', 'accountName'], label: 'Account' },
          { keys: ['openingDebit'], label: 'Opening Dr', numeric: true },
          { keys: ['openingCredit'], label: 'Opening Cr', numeric: true },
          { keys: ['periodDebit'], label: 'Period Dr', numeric: true },
          { keys: ['periodCredit'], label: 'Period Cr', numeric: true },
          { keys: ['closingDebit'], label: 'Closing Dr', numeric: true },
          { keys: ['closingCredit'], label: 'Closing Cr', numeric: true },
        ],
        summaryCards: [
          { label: 'Total Debit', value: money(asRecord(data['totals'])['closingDebit']) },
          { label: 'Total Credit', value: money(asRecord(data['totals'])['closingCredit']) },
          { label: 'Balanced', value: data['balanced'] ? 'Yes' : 'No' },
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
          { label: 'Gross Revenue', value: money(asRecord(data['revenue'])['grossRevenue']) },
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
          { keys: ['category', 'code'], label: 'Category' },
          { keys: ['message', 'description'], label: 'Finding' },
          { keys: ['count'], label: 'Count', numeric: true },
        ],
      };
    case 'reconciliation':
      return {
        title: 'Reconciliation',
        filename: 'reconciliation.pdf',
        orientation: 'landscape',
        itemKey: 'findings',
        columns: [
          { keys: ['code', 'source', 'check'], label: 'Source' },
          { keys: ['severity', 'status'], label: 'Severity' },
          { keys: ['count', 'difference'], label: 'Count', numeric: true },
          { keys: ['message', 'description'], label: 'Detail' },
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
          { keys: ['accountType', 'type'], label: 'Type' },
          { keys: ['balance'], label: 'Balance', numeric: true },
        ],
      };
    case 'expenses':
      return {
        title: 'Hospital Expenses',
        filename: 'expenses.pdf',
        orientation: 'landscape',
        itemKey: 'items',
        columns: [
          { keys: ['date', 'expenseDate'], label: 'Date' },
          { keys: ['category', 'categoryName'], label: 'Category' },
          { keys: ['description', 'title'], label: 'Description' },
          { keys: ['amount', 'total'], label: 'Amount', numeric: true },
          { keys: ['paymentMethod', 'method'], label: 'Method' },
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
  const rows = resolveAccountsDocumentRows(view, data, config.itemKey);
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

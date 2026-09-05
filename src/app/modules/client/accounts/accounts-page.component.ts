import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subscription, TimeoutError, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, finalize, map, timeout } from 'rxjs/operators';
import { BackendService } from '../../../core/services/backend.service';
import { buildAccountsReportDocumentHtml } from '../../../core/documents/accounts-report-document.builder';
import {
  buildAccountsViewDocumentContext,
  resolveAccountsDocumentRows,
  resolveAccountsViewDocumentConfig,
} from '../../../core/utils/accounts-document.util';
import { AccountsReportColumn } from '../../../core/documents/accounts-report-document.builder';
import { downloadExcelWorkbook } from '../../../core/utils/excel-export.util';
import { readCurrentUserName, readStoredHospitalDocumentInfo } from '../../../core/utils/hms-document-context.util';
import { todayYmd, toCalendarYmd } from '../../../core/utils/calendar-date';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';

import {
  ACCOUNTS_RULE_TOPICS,
  AccountsRuleTopic,
  accountsRuleTopicForView,
} from './accounts-rules.data';

interface KpiCard {
  label: string;
  value: unknown;
  hint: string;
  icon: string;
  tone: 'teal' | 'orange' | 'purple' | 'green' | 'blue' | 'red';
  money?: boolean;
  highlight?: boolean;
  isBoolean?: boolean;
}

interface ProfitLossBreakdownItem {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

@Component({
  selector: 'app-accounts-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HmsDocumentToolbarComponent],
  templateUrl: './accounts-page.component.html',
  styleUrl: './accounts-page.component.scss',
})
export class AccountsPageComponent implements OnInit, OnDestroy {
  view = 'dashboard';
  loading = false;
  fromDate = '';
  toDate = '';
  search = '';
  tableSearch = '';
  accountId = '';
  accountCode = '1100';
  supplierId = '';
  saving = false;
  data: Record<string, unknown> = {};
  accounts: Array<Record<string, unknown>> = [];
  journalLines = [
    { accountCode: '1100', debit: 0, credit: 0, description: '' },
    { accountCode: '4000', debit: 0, credit: 0, description: '' },
  ];
  journalDescription = '';
  journalReason = '';
  activeDatePreset: 'today' | 'week' | 'month' | 'custom' = 'week';
  lastUpdatedAt: Date | null = null;
  dashboardKpiCardsList: KpiCard[] = [];
  ledgerSummaryCardsList: KpiCard[] = [];
  showAccountsRules = false;
  showAllRuleTopics = false;
  selectedRuleId = 'basics';
  readonly accountsRuleTopics = ACCOUNTS_RULE_TOPICS;
  expandedReconciliationCode: string | null = null;
  repairingJournals = false;
  private loadSub?: Subscription;
  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.applyDatePreset('week', false);
    this.backend.getChartOfAccounts().subscribe({
      next: (items) => (this.accounts = Array.isArray(items) ? items : []),
      error: () => (this.accounts = []),
    });
    this.routeSub = this.route.data
      .pipe(
        map((data) => String(data['accountsView'] || 'dashboard')),
        distinctUntilChanged()
      )
      .subscribe((view) => {
        this.view = view;
        this.expandedReconciliationCode = null;
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  applyDatePreset(preset: 'today' | 'week' | 'month', reload = true): void {
    this.activeDatePreset = preset;
    const today = new Date();
    const end = todayYmd();
    let start = end;
    if (preset === 'week') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      start = toCalendarYmd(weekStart);
    } else if (preset === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      start = toCalendarYmd(monthStart);
    }
    this.fromDate = start;
    this.toDate = end;
    if (reload) {
      this.load();
    }
  }

  onManualDateChange(): void {
    this.activeDatePreset = 'custom';
  }

  selectCustomDatePreset(): void {
    this.activeDatePreset = 'custom';
  }

  formatTests(value: unknown): string {
    return Array.isArray(value) ? value.filter(Boolean).join(', ') : String(value || '');
  }

  get title(): string {
    const titles: Record<string, string> = {
      dashboard: 'Accounts Dashboard',
      'chart-of-accounts': 'Chart of Accounts',
      journal: 'Journal Vouchers',
      'general-ledger': 'General Ledger',
      'cash-book': 'Cash Book',
      'bank-book': 'Bank Book',
      expenses: 'Hospital Expenses',
      receivables: 'Patient Receivables',
      payables: 'Supplier Payables',
      'trial-balance': 'Trial Balance',
      'profit-loss': 'Profit & Loss',
      'daily-collections': 'Daily Collections',
      'patient-profitability': 'Patient Profitability',
      audit: 'Financial Audit',
      reconciliation: 'Reconciliation',
    };
    return titles[this.view] || 'Accounts';
  }

  get selectedAccountsRule(): AccountsRuleTopic {
    return (
      this.accountsRuleTopics.find((topic) => topic.id === this.selectedRuleId) ||
      this.accountsRuleTopics[0]
    );
  }

  openAccountsRules(): void {
    const current = accountsRuleTopicForView(this.view);
    this.selectedRuleId = current?.id || 'basics';
    this.showAllRuleTopics = false;
    this.showAccountsRules = true;
  }

  closeAccountsRules(): void {
    this.showAccountsRules = false;
    this.showAllRuleTopics = false;
  }

  selectAccountsRule(id: string): void {
    this.selectedRuleId = id;
    this.showAllRuleTopics = false;
  }

  accountRuleIcon(id: string): string {
    const icons: Record<string, string> = {
      basics: 'fa-balance-scale',
      journal: 'fa-book',
      'cash-book': 'fa-money',
      'bank-book': 'fa-university',
      'general-ledger': 'fa-book',
      'chart-of-accounts': 'fa-list-ul',
      receivables: 'fa-user-o',
      payables: 'fa-users',
      'trial-balance': 'fa-bar-chart',
      'profit-loss': 'fa-pie-chart',
      'daily-collections': 'fa-database',
      'patient-profitability': 'fa-line-chart',
      reconciliation: 'fa-exchange',
      audit: 'fa-search',
      expenses: 'fa-shopping-cart',
    };
    return icons[id] || 'fa-file-text-o';
  }

  accountRuleCallout(id: string): string {
    const callouts: Record<string, string> = {
      basics: 'Two equal sides = one complete entry',
      journal: 'One voucher = one complete story',
      'cash-book': 'Cash in and cash out, in one place',
      'bank-book': 'Track every bank movement clearly',
      'general-ledger': 'One account = one complete diary',
      'chart-of-accounts': 'Every money folder has a code',
      receivables: 'What patients still owe the hospital',
      payables: 'What the hospital still owes suppliers',
      'trial-balance': 'Matching totals = healthy books',
      'profit-loss': 'Income minus expense = profit or loss',
      'daily-collections': 'Money actually received in the period',
      'patient-profitability': 'Revenue compared with known costs',
      reconciliation: 'Match operations with account entries',
      audit: 'Find missing or unusual postings',
      expenses: 'Running costs reduce hospital profit',
    };
    return callouts[id] || 'A simple guide to this accounts page';
  }

  load(): void {
    this.loadSub?.unsubscribe();
    this.loading = true;
    const params: Record<string, unknown> = {};
    if (this.fromDate) params['fromDate'] = this.fromDate;
    if (this.toDate) params['toDate'] = this.toDate;
    if (this.search) params['search'] = this.search;
    if (this.accountId) params['accountId'] = this.accountId;
    if (this.view === 'general-ledger' && this.accountCode) params['accountCode'] = this.accountCode;
    if (this.supplierId) params['supplierId'] = this.supplierId;

    const request: Observable<unknown> = this.requestForView(params);
    this.loadSub = request
      .pipe(
        timeout({ first: 60_000 }),
        catchError((error: unknown) => {
          if (error instanceof TimeoutError) {
            return throwError(() => ({
              error: { message: 'Accounts report timed out. Try a shorter date range.' },
            }));
          }
          return throwError(() => error);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (result: unknown) => {
          if (Array.isArray(result)) {
            this.data = { items: result };
            this.accounts = result as Array<Record<string, unknown>>;
          } else {
            this.data = (result || {}) as Record<string, unknown>;
          }
          this.lastUpdatedAt = new Date();
          this.refreshDerivedViews();
        },
        error: (error: { error?: { message?: string } }) => {
          this.toastr.error(error?.error?.message || 'Unable to load accounts data');
        },
      });
  }

  postJournal(): void {
    if (this.saving) {
      return;
    }
    this.saving = true;
    this.backend
      .createJournal({
        description: this.journalDescription,
        reason: this.journalReason,
        lines: this.journalLines,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.toastr.success('Journal posted');
          this.load();
        },
        error: (error) => {
          this.saving = false;
          this.toastr.error(error?.error?.message || 'Journal was not posted');
        },
      });
  }

  get reconciliationFindings(): Array<Record<string, unknown>> {
    return this.asArray('findings');
  }

  get canRepairMissingJournals(): boolean {
    if (this.data['repairableMissingJournals'] === true) return true;
    return this.reconciliationFindings.some((row) => {
      const code = String(row['code'] || '');
      return code === 'LEDGER_MISSING_JOURNAL' || code === 'PAYMENT_MISSING_JOURNAL';
    });
  }

  reconciliationTitle(row: Record<string, unknown>): string {
    const title = String(row['title'] || '').trim();
    if (title) return title;
    const code = String(row['code'] || '');
    const labels: Record<string, string> = {
      LEDGER_MISSING_JOURNAL: 'Patient charge missing journal',
      PAYMENT_MISSING_JOURNAL: 'Payment missing journal',
      UNBALANCED_JOURNALS: 'Unbalanced journals',
      DUPLICATE_JOURNALS: 'Duplicate journals',
      DUPLICATE_LEDGER_CHARGES: 'Duplicate ledger charges',
      ENCOUNTER_SUMMARY_MISMATCH: 'Encounter summary mismatch',
      SALE_MISSING_JOURNAL: 'Counter sale missing journal',
      ENCOUNTER_SALE_MISSING_LEDGER: 'Encounter sale missing ledger charge',
      SALE_MISSING_STOCK_MOVEMENT: 'Sale missing stock movement',
      EXPENSE_MISSING_JOURNAL: 'Expense missing journal',
      PURCHASE_MISSING_STOCK_MOVEMENT: 'Purchase missing stock movement',
    };
    return labels[code] || code || 'Finding';
  }

  reconciliationDescription(row: Record<string, unknown>): string {
    return String(row['description'] || '').trim();
  }

  reconciliationSamples(row: Record<string, unknown>): Array<Record<string, unknown>> {
    const samples = row['samples'];
    return Array.isArray(samples) ? (samples as Array<Record<string, unknown>>) : [];
  }

  toggleReconciliationRow(row: Record<string, unknown>): void {
    const code = String(row['code'] || '');
    if (!code) return;
    this.expandedReconciliationCode = this.expandedReconciliationCode === code ? null : code;
  }

  isReconciliationExpanded(row: Record<string, unknown>): boolean {
    return this.expandedReconciliationCode === String(row['code'] || '');
  }

  formatReconciliationSample(sample: Record<string, unknown>): string {
    const parts: string[] = [];
    if (sample['title']) parts.push(String(sample['title']));
    if (sample['paymentNo']) parts.push(`Payment ${sample['paymentNo']}`);
    if (sample['sourceType']) parts.push(String(sample['sourceType']));
    if (sample['type']) parts.push(String(sample['type']));
    if (sample['encounterNo']) parts.push(`Encounter ${sample['encounterNo']}`);
    if (sample['journalNo']) parts.push(`JV ${sample['journalNo']}`);
    const amount = sample['netAmount'] ?? sample['amount'];
    if (amount != null && amount !== '') parts.push(`Rs ${this.money(amount)}`);
    return parts.filter(Boolean).join(' · ') || 'Sample row';
  }

  repairMissingJournals(): void {
    if (this.repairingJournals || !this.canRepairMissingJournals) {
      return;
    }
    this.repairingJournals = true;
    const payload: Record<string, unknown> = {};
    if (this.fromDate) payload['fromDate'] = this.fromDate;
    if (this.toDate) payload['toDate'] = this.toDate;
    this.backend.repairMissingReconciliationJournals(payload).subscribe({
      next: (result) => {
        this.repairingJournals = false;
        const postedCharges = Number(result?.['postedCharges'] ?? 0);
        const postedPayments = Number(result?.['postedPayments'] ?? 0);
        const failed = Array.isArray(result?.['failed']) ? result['failed'].length : 0;
        if (postedCharges + postedPayments > 0) {
          this.toastr.success(
            `Posted ${postedCharges} charge journal(s) and ${postedPayments} payment journal(s).`
          );
        } else if (failed > 0) {
          this.toastr.warning(`Repair finished with ${failed} failure(s). Review details and retry.`);
        } else {
          this.toastr.info('No missing journals needed posting.');
        }
        this.load();
      },
      error: (error: { error?: { message?: string } }) => {
        this.repairingJournals = false;
        this.toastr.error(error?.error?.message || 'Could not post missing journals');
      },
    });
  }

  asArray(key: string): Array<Record<string, unknown>> {
    const value = this.data[key];
    return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
  }

  asRecord(key: string): Record<string, unknown> {
    const value = this.data[key];
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  asRecordValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  asDate(value: unknown): string | number | Date | null {
    if (value == null) return null;
    return value as string | number | Date;
  }

  money(value: unknown): string {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed.toLocaleString('en-PK') : '0';
  }

  /** Blank for zero so debit/credit columns read like a ledger. */
  moneyOrBlank(value: unknown): string {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed) || parsed === 0) return '—';
    return parsed.toLocaleString('en-PK');
  }

  formatLedgerDate(value: unknown): string {
    if (value == null || value === '') return '—';
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatSourceType(value: unknown): string {
    const raw = String(value || '').trim();
    if (!raw) return '—';
    const labels: Record<string, string> = {
      MANUAL: 'Manual journal',
      PAYMENT: 'Patient payment',
      BILL: 'Bill / invoice',
      INVOICE: 'Invoice',
      PHARMACY: 'Pharmacy',
      LAB: 'Laboratory',
      REFUND: 'Refund',
      EXPENSE: 'Expense',
      ADJUSTMENT: 'Adjustment',
      OPENING: 'Opening balance',
    };
    const key = raw.toUpperCase().replace(/[\s-]+/g, '_');
    if (labels[key]) return labels[key];
    return raw
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  get ledgerAccountLabel(): string {
    const account = this.asRecord('account');
    const code = String(account['code'] || this.accountCode || '').trim();
    const name = String(account['name'] || '').trim();
    if (code && name) return `${code} · ${name}`;
    return code || name || 'Selected account';
  }

  /** Column titles + keys for the active accounts report (same as PDF export). */
  get accountsTableColumns(): AccountsReportColumn[] {
    const config = resolveAccountsViewDocumentConfig(this.view, this.data);
    if (config?.columns?.length) {
      return config.columns;
    }
    if (this.asArray('lines').length) {
      return [
        { keys: ['date'], label: 'Date & time' },
        { keys: ['journalNo'], label: 'Voucher' },
        { keys: ['description'], label: 'Description' },
        { keys: ['sourceType'], label: 'Source' },
        { keys: ['debit'], label: 'Debit', numeric: true },
        { keys: ['credit'], label: 'Credit', numeric: true },
        { keys: ['runningBalance'], label: 'Running balance', numeric: true },
      ];
    }
    if (this.asArray('rows').length) {
      return [
        { keys: ['code'], label: 'Account code' },
        { keys: ['name'], label: 'Account name' },
        { keys: ['closingDebit', 'debit'], label: 'Debit', numeric: true },
        { keys: ['closingCredit', 'credit'], label: 'Credit', numeric: true },
      ];
    }
    if (this.asArray('findings').length) {
      return [
        { keys: ['code'], label: 'Check' },
        { keys: ['severity'], label: 'Severity' },
        { keys: ['count'], label: 'Count', numeric: true },
        { keys: ['description', 'message'], label: 'Notes' },
      ];
    }
    if (this.asArray('items').length) {
      return [
        { keys: ['encounterNo', 'journalNo', 'invoiceNo', 'code'], label: 'Reference' },
        { keys: ['patientName', 'description', 'name'], label: 'Details' },
        { keys: ['balance', 'amount', 'total'], label: 'Amount', numeric: true },
        { keys: ['ageBucket', 'status'], label: 'Status' },
      ];
    }
    return [];
  }

  get accountsTableRows(): Array<Record<string, unknown>> {
    const config = resolveAccountsViewDocumentConfig(this.view, this.data);
    const rows = resolveAccountsDocumentRows(this.view, this.data, config?.itemKey);
    return rows.length ? rows : [];
  }

  get filteredAccountsTableRows(): Array<Record<string, unknown>> {
    const query = this.tableSearch.trim().toLowerCase();
    if (!query || this.view !== 'profit-loss') return this.accountsTableRows;
    return this.accountsTableRows.filter((row) =>
      this.accountsTableColumns.some((column) =>
        this.formatTableCell(row, column).toLowerCase().includes(query)
      )
    );
  }

  formatTableCell(row: Record<string, unknown>, column: AccountsReportColumn): string {
    const primaryKey = column.keys[0] || '';
    const raw = this.displayCell(row, column.keys);

    if (primaryKey === 'sourceType' || column.keys.includes('sourceType')) {
      return this.formatSourceType(raw || row['sourceType']);
    }
    if (primaryKey === 'ageBucket' || column.keys.includes('ageBucket')) {
      const bucket = String(raw || '').trim();
      if (!bucket) return '—';
      return /day/i.test(bucket) ? bucket : `${bucket} days`;
    }
    if (column.numeric) {
      if (raw === '' || raw == null) return '—';
      return this.money(raw);
    }
    if (/date|At$/i.test(primaryKey) || column.keys.some((k) => /date|At$/i.test(k))) {
      return this.formatLedgerDate(raw || this.displayCell(row, column.keys));
    }
    return raw || '—';
  }

  displayCell(row: Record<string, unknown>, keys: string[]): string {
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
  }

  get accountsDocumentEnabled(): boolean {
    return !!resolveAccountsViewDocumentConfig(this.view, this.data);
  }

  get accountsDocumentTitle(): string {
    return resolveAccountsViewDocumentConfig(this.view, this.data)?.title || this.title;
  }

  get accountsDocumentFilename(): string {
    return resolveAccountsViewDocumentConfig(this.view, this.data)?.filename || `${this.view}.pdf`;
  }

  get accountsDocumentOrientation(): 'portrait' | 'landscape' {
    return resolveAccountsViewDocumentConfig(this.view, this.data)?.orientation || 'portrait';
  }

  buildAccountsDocumentHtml = (): string => {
    const context = buildAccountsViewDocumentContext(this.view, this.data, {
      hospital: readStoredHospitalDocumentInfo(),
      generatedBy: readCurrentUserName(),
      fromDate: this.fromDate,
      toDate: this.toDate,
    });
    return context ? buildAccountsReportDocumentHtml(context) : '';
  };

  exportAccountsExcel(): void {
    const context = buildAccountsViewDocumentContext(this.view, this.data, {
      hospital: readStoredHospitalDocumentInfo(),
      generatedBy: readCurrentUserName(),
      fromDate: this.fromDate,
      toDate: this.toDate,
    });
    if (!context?.columns?.length) {
      this.toastr.warning('Nothing to export for this report');
      return;
    }
    if (!context.rows.length) {
      this.toastr.warning('No rows to export');
      return;
    }
    const columns = context.columns.map((column, index) => ({
      header: column.label,
      key: `col_${index}`,
    }));
    const rows = context.rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      context.columns.forEach((column, index) => {
        let value: unknown = '';
        for (const key of column.keys) {
          const parts = key.split('.');
          let current: unknown = row;
          for (const part of parts) {
            if (!current || typeof current !== 'object') {
              current = undefined;
              break;
            }
            current = (current as Record<string, unknown>)[part];
          }
          if (current != null && current !== '') {
            value = current;
            break;
          }
        }
        mapped[`col_${index}`] = value;
      });
      return mapped;
    });
    downloadExcelWorkbook(`${this.view}-${this.fromDate || 'all'}-${this.toDate || 'all'}`, [
      {
        name: context.title.slice(0, 31),
        columns,
        rows,
      },
    ]);
  }

  get profitLossKpiCards(): KpiCard[] {
    const revenue = this.asRecord('revenue');
    const expenses = this.asRecord('expenses');
    return [
      { label: 'Consultations', value: revenue['consultations'], hint: '', icon: 'fa-user-md', tone: 'teal' },
      { label: 'Laboratory', value: revenue['laboratory'], hint: '', icon: 'fa-flask', tone: 'blue' },
      { label: 'Pharmacy', value: revenue['pharmacy'], hint: '', icon: 'fa-medkit', tone: 'purple' },
      { label: 'Room / Bed', value: this.profitLossRevenueValue('roomBed', 'roomBedRevenue', 'room'), hint: '', icon: 'fa-bed', tone: 'blue' },
      { label: 'Gross Revenue', value: this.profitLossGrossRevenue, hint: '', icon: 'fa-line-chart', tone: 'teal', highlight: true },
      { label: 'COGS', value: expenses['cogs'], hint: '', icon: 'fa-shopping-cart', tone: 'orange' },
      { label: 'Operating Expense', value: expenses['operatingExpense'], hint: '', icon: 'fa-building', tone: 'red' },
      { label: 'Gross Profit', value: this.profitLossGrossProfit, hint: '', icon: 'fa-bar-chart', tone: 'green', highlight: true },
      { label: 'Net Profit', value: this.profitLossNetProfit, hint: '', icon: 'fa-pie-chart', tone: 'green', highlight: true },
    ];
  }

  get profitLossGrossRevenue(): number {
    const configured = this.profitLossRevenueValue('grossRevenue', 'totalRevenue');
    if (configured) return configured;
    return this.profitLossBreakdownValues.reduce((sum, item) => sum + item.value, 0);
  }

  get profitLossTotalExpense(): number {
    const expenses = this.asRecord('expenses');
    const total = this.firstFiniteNumber(expenses, 'totalExpenses', 'totalExpense');
    if (total !== null) return total;
    const topLevelTotal = this.firstFiniteNumber(this.data, 'totalExpenses', 'totalExpense');
    if (topLevelTotal !== null) return topLevelTotal;
    return this.numberValue(expenses['cogs']) + this.numberValue(expenses['operatingExpense']);
  }

  get profitLossGrossProfit(): number {
    return this.numberValue(this.data['grossProfit']);
  }

  get profitLossNetProfit(): number {
    return this.numberValue(this.data['netProfit']);
  }

  get profitLossBreakdown(): ProfitLossBreakdownItem[] {
    const total = this.profitLossGrossRevenue;
    return this.profitLossBreakdownValues.map((item) => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0,
    }));
  }

  get profitLossDonutBackground(): string {
    const items = this.profitLossBreakdown.filter((item) => item.value > 0);
    if (!items.length) return '#e2e8f0';
    let cursor = 0;
    const stops = items.map((item) => {
      const start = cursor;
      cursor += item.percentage;
      return `${item.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  profitLossBarPercent(value: unknown): number {
    const amount = this.numberValue(value);
    if (amount <= 0) return 0;
    const max = Math.max(this.profitLossGrossRevenue, this.profitLossTotalExpense, 1);
    return Math.max(4, Math.min(88, (amount / max) * 88));
  }

  private get profitLossBreakdownValues(): Array<Omit<ProfitLossBreakdownItem, 'percentage'>> {
    return [
      { label: 'Room / Bed', value: this.profitLossRevenueValue('roomBed', 'roomBedRevenue', 'room'), color: '#2788ed' },
      { label: 'Laboratory', value: this.profitLossRevenueValue('laboratory', 'lab'), color: '#68a9f4' },
      { label: 'Procedures', value: this.profitLossRevenueValue('procedures', 'procedure'), color: '#ff9559' },
      { label: 'Consultations', value: this.profitLossRevenueValue('consultations', 'consultation'), color: '#17bb86' },
      { label: 'Pharmacy', value: this.profitLossRevenueValue('pharmacy'), color: '#a844e8' },
    ];
  }

  private profitLossRevenueValue(...keys: string[]): number {
    const value = this.firstFiniteNumber(this.asRecord('revenue'), ...keys);
    return value ?? 0;
  }

  private firstFiniteNumber(record: Record<string, unknown>, ...keys: string[]): number | null {
    for (const key of keys) {
      const raw = record[key];
      if (raw === '' || raw === null || raw === undefined) continue;
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  private numberValue(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  get dailyCollectionsKpiCards(): KpiCard[] {
    return [
      { label: 'OPD', value: this.data['opd'], hint: '', icon: 'fa-stethoscope', tone: 'teal' },
      { label: 'IPD', value: this.data['ipd'], hint: '', icon: 'fa-bed', tone: 'blue' },
      { label: 'Lab', value: this.data['lab'], hint: '', icon: 'fa-flask', tone: 'purple' },
      { label: 'Pharmacy Counter', value: this.data['pharmacyCounter'], hint: '', icon: 'fa-medkit', tone: 'green' },
      { label: 'Refunds', value: this.data['refunds'], hint: '', icon: 'fa-undo', tone: 'orange' },
      { label: 'Expenses', value: this.data['expenses'], hint: '', icon: 'fa-money', tone: 'orange' },
      { label: 'Cash', value: this.data['cashTotal'], hint: '', icon: 'fa-money', tone: 'teal' },
      { label: 'Net Cash Movement', value: this.data['netCashMovement'], hint: '', icon: 'fa-exchange', tone: 'green', highlight: true },
    ];
  }

  get trialBalanceKpiCards(): KpiCard[] {
    const totals = this.asRecord('totals');
    return [
      { label: 'Total Debit', value: totals['closingDebit'], hint: '', icon: 'fa-arrow-down', tone: 'teal' },
      { label: 'Total Credit', value: totals['closingCredit'], hint: '', icon: 'fa-arrow-up', tone: 'blue' },
      { label: 'Period Debit', value: totals['periodDebit'], hint: '', icon: 'fa-calendar', tone: 'purple' },
      { label: 'Balanced', value: this.data['balanced'], hint: '', icon: 'fa-check', tone: 'green', highlight: true, isBoolean: true },
    ];
  }

  private refreshDerivedViews(): void {
    this.dashboardKpiCardsList = [
      {
        label: 'Receivables',
        value: this.data['receivableTotal'],
        hint: 'Total outstanding',
        icon: 'fa-wallet',
        tone: 'teal',
        money: true,
        highlight: true,
      },
      {
        label: 'Payables',
        value: this.data['payableTotal'],
        hint: 'Total payable',
        icon: 'fa-credit-card',
        tone: 'orange',
        money: true,
      },
      {
        label: 'Open AR',
        value: this.data['openReceivableCount'],
        hint: 'Open accounts',
        icon: 'fa-users',
        tone: 'purple',
      },
      {
        label: 'Trial balanced',
        value: this.data['trialBalanceBalanced'] ? 'Yes' : 'No',
        hint: 'System status',
        icon: 'fa-balance-scale',
        tone: 'green',
      },
    ];
    this.ledgerSummaryCardsList = [
      {
        label: 'Opening',
        value: this.data['openingBalance'],
        hint: 'Start of period',
        icon: 'fa-sign-in',
        tone: 'green',
        money: true,
      },
      {
        label: 'Total debit',
        value: this.data['periodDebit'],
        hint: 'Period inflow/debit',
        icon: 'fa-arrow-down',
        tone: 'teal',
        money: true,
      },
      {
        label: 'Total credit',
        value: this.data['periodCredit'],
        hint: 'Period outflow/credit',
        icon: 'fa-arrow-up',
        tone: 'orange',
        money: true,
      },
      {
        label: 'Closing',
        value: this.data['closingBalance'],
        hint: 'End of period',
        icon: 'fa-sign-out',
        tone: 'purple',
        money: true,
        highlight: true,
      },
    ];
  }

  private requestForView(params: Record<string, unknown>): Observable<unknown> {
    switch (this.view) {
      case 'chart-of-accounts':
        return this.backend.getChartOfAccounts(params);
      case 'journal':
        return this.backend.getJournals(params);
      case 'general-ledger':
        return this.backend.getGeneralLedger(params);
      case 'cash-book':
        return this.backend.getCashBook(params);
      case 'bank-book':
        return this.backend.getBankBook(params);
      case 'trial-balance':
        return this.backend.getTrialBalance(params);
      case 'profit-loss':
        return this.backend.getProfitLoss(params);
      case 'daily-collections':
        return this.backend.getDailyCollections(params);
      case 'patient-profitability':
        return this.backend.getPatientProfitability(params);
      case 'receivables':
        return this.backend.getReceivables(params);
      case 'payables':
        return this.backend.getPayables(params);
      case 'reconciliation':
        return this.backend.getFinancialReconciliation(params);
      case 'expenses':
        return this.backend.getExpenses(params);
      case 'audit':
        return this.backend.getAuditLogs({ ...params, limit: 50, page: 1 });
      default:
        return this.backend.getAccountsDashboard(params);
    }
  }
}

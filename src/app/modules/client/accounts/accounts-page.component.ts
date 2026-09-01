import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { BackendService } from '../../../core/services/backend.service';
import { buildAccountsReportDocumentHtml } from '../../../core/documents/accounts-report-document.builder';
import {
  buildAccountsViewDocumentContext,
  resolveAccountsViewDocumentConfig,
} from '../../../core/utils/accounts-document.util';
import { readCurrentUserName, readStoredHospitalDocumentInfo } from '../../../core/utils/hms-document-context.util';
import { todayYmd, toCalendarYmd } from '../../../core/utils/calendar-date';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';

interface KpiCard {
  label: string;
  value: unknown;
  hint: string;
  icon: string;
  tone: 'teal' | 'orange' | 'purple' | 'green' | 'blue';
  money?: boolean;
  highlight?: boolean;
  isBoolean?: boolean;
}

@Component({
  selector: 'app-accounts-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HmsDocumentToolbarComponent],
  templateUrl: './accounts-page.component.html',
  styleUrl: './accounts-page.component.scss',
})
export class AccountsPageComponent implements OnInit {
  view = 'dashboard';
  loading = false;
  fromDate = '';
  toDate = '';
  search = '';
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
  activeDatePreset: 'today' | 'week' | 'month' | 'custom' = 'month';
  dashboardKpiCardsList: KpiCard[] = [];
  ledgerSummaryCardsList: KpiCard[] = [];

  readonly accountsNav = [
    { label: 'Dashboard', route: 'dashboard' },
    { label: 'CoA', route: 'chart-of-accounts' },
    { label: 'GL', route: 'general-ledger' },
    { label: 'Cash', route: 'cash-book' },
    { label: 'Collections', route: 'daily-collections' },
    { label: 'Doctor Report', route: 'doctor-performance' },
    { label: 'Patient Profitability', route: 'patient-profitability' },
    { label: 'Trial Balance', route: 'trial-balance' },
    { label: 'P&L', route: 'profit-loss' },
  ];

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.backend.getChartOfAccounts().subscribe({
      next: (items) => (this.accounts = Array.isArray(items) ? items : []),
      error: () => (this.accounts = []),
    });
    this.route.data
      .pipe(
        map((data) => String(data['accountsView'] || 'dashboard')),
        distinctUntilChanged()
      )
      .subscribe((view) => {
        this.view = view;
        this.load();
      });
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

  isNavActive(route: string): boolean {
    return this.view === route;
  }

  onManualDateChange(): void {
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

  load(): void {
    this.loading = true;
    const params: Record<string, unknown> = {};
    if (this.fromDate) params['fromDate'] = this.fromDate;
    if (this.toDate) params['toDate'] = this.toDate;
    if (this.search) params['search'] = this.search;
    if (this.accountId) params['accountId'] = this.accountId;
    if (this.view === 'general-ledger' && this.accountCode) params['accountCode'] = this.accountCode;
    if (this.supplierId) params['supplierId'] = this.supplierId;

    const request: Observable<unknown> = this.requestForView(params);
    request.subscribe({
      next: (result: unknown) => {
        if (Array.isArray(result)) {
          this.data = { items: result };
          this.accounts = result as Array<Record<string, unknown>>;
        } else {
          this.data = (result || {}) as Record<string, unknown>;
        }
        this.refreshDerivedViews();
        this.loading = false;
      },
      error: (error: { error?: { message?: string } }) => {
        this.loading = false;
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

  get profitLossKpiCards(): KpiCard[] {
    const revenue = this.asRecord('revenue');
    const expenses = this.asRecord('expenses');
    return [
      { label: 'Consultations', value: revenue['consultations'], hint: '', icon: 'fa-user-md', tone: 'teal' },
      { label: 'Laboratory', value: revenue['laboratory'], hint: '', icon: 'fa-flask', tone: 'blue' },
      { label: 'Pharmacy', value: revenue['pharmacy'], hint: '', icon: 'fa-medkit', tone: 'purple' },
      { label: 'Gross Revenue', value: revenue['grossRevenue'], hint: '', icon: 'fa-line-chart', tone: 'teal', highlight: true },
      { label: 'COGS', value: expenses['cogs'], hint: '', icon: 'fa-shopping-cart', tone: 'orange' },
      { label: 'Operating Expense', value: expenses['operatingExpense'], hint: '', icon: 'fa-building', tone: 'orange' },
      { label: 'Gross Profit', value: this.data['grossProfit'], hint: '', icon: 'fa-plus-circle', tone: 'green', highlight: true },
      { label: 'Net Profit', value: this.data['netProfit'], hint: '', icon: 'fa-check-circle', tone: 'green', highlight: true },
    ];
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

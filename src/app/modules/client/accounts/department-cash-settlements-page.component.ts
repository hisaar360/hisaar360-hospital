import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { BackendService } from '../../../core/services/backend.service';
import { formatCurrency, formatDateTime } from '../pharmacy-admin.utils';
import { todayYmd, toCalendarYmd } from '../../../core/utils/calendar-date';
import {
  downloadSettlementStatementPdf,
  openSettlementStatementPrint,
  StatementLine,
  StatementPayload,
} from './settlement-statement.print';

type DeptKey = 'pharmacy' | 'ward' | 'opd' | 'laboratory';
type PeriodChip = 'week' | 'month' | 'custom';

const DEPT_COPY: Record<
  DeptKey,
  { title: string; blurb: string; tillLabel: string }
> = {
  pharmacy: {
    title: 'Pharmacy Settlement',
    blurb:
      'Pharmacy counter cash in hand. Medicine sales and appointment fees stay as separate lines — settle to Hospital Cash when you audit.',
    tillLabel: 'Pharmacy Cash in Hand',
  },
  ward: {
    title: 'Ward Settlement',
    blurb: 'Ward admission collections cash in hand. Settle to Hospital Cash after day / multi-day audit.',
    tillLabel: 'Ward Cash in Hand',
  },
  opd: {
    title: 'OPD Settlement',
    blurb: 'OPD consultation fee cash in hand. Settle reception collections to Hospital Cash.',
    tillLabel: 'OPD Cash in Hand',
  },
  laboratory: {
    title: 'Laboratory Settlement',
    blurb: 'Lab test fee cash in hand. Settle laboratory collections to Hospital Cash.',
    tillLabel: 'Laboratory Cash in Hand',
  },
};

@Component({
  selector: 'app-department-cash-settlements-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './department-cash-settlements-page.component.html',
  styleUrl: './department-cash-settlements-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentCashSettlementsPageComponent implements OnInit {
  department: DeptKey = 'pharmacy';
  loading = true;
  pdfLoading = false;
  saving = false;
  errorMessage = '';
  periodChip: PeriodChip = 'month';
  dateFrom = '';
  dateTo = '';
  summary: Record<string, unknown> | null = null;
  movements: Array<Record<string, unknown>> = [];
  settlements: Array<Record<string, unknown>> = [];
  doctorFees: Array<Record<string, unknown>> = [];
  settleOpen = false;
  addCashOpen = false;
  settleForm = { amount: 0, settleTo: 'cash' as 'cash' | 'bank', note: '' };
  addCashForm = { amount: 0, settleTo: 'cash' as 'cash' | 'bank', note: '' };

  readonly money = formatCurrency;
  readonly dateTime = formatDateTime;

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const dept = String(this.route.snapshot.data['department'] || 'pharmacy').toLowerCase();
    this.department =
      dept === 'ward' || dept === 'opd' || dept === 'laboratory' ? (dept as DeptKey) : 'pharmacy';
    this.applyPeriod('month', false);
    this.reload();
  }

  get copy() {
    return DEPT_COPY[this.department];
  }

  get canManage(): boolean {
    return (
      this.backend.hasPermission('accounts.cash_settlement.manage') ||
      this.backend.hasPermission('accounts.journals.create') ||
      this.backend.hasPermission('*')
    );
  }

  applyPeriod(chip: PeriodChip, reload = true): void {
    this.periodChip = chip;
    const today = new Date();
    this.dateTo = todayYmd();
    if (chip === 'week') {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      this.dateFrom = toCalendarYmd(start);
    } else if (chip === 'month') {
      this.dateFrom = toCalendarYmd(new Date(today.getFullYear(), today.getMonth(), 1));
    }
    if (reload && chip !== 'custom') {
      this.reload();
    }
  }

  applyCustom(): void {
    this.periodChip = 'custom';
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.errorMessage = '';
    const query = {
      department: this.department,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      limit: 100,
    };
    const loadDoctorFees =
      this.department === 'pharmacy' || this.department === 'opd'
        ? this.backend.getDepartmentDoctorFees(query).pipe(
            catchError(() => of({ items: [] as Array<Record<string, unknown>> }))
          )
        : of({ items: [] as Array<Record<string, unknown>> });

    forkJoin({
      cash: this.backend.getDepartmentCash(query),
      movements: this.backend.listDepartmentCashMovements(query),
      settlements: this.backend.listDepartmentCashSettlements({ ...query, limit: 50 }),
      doctorFees: loadDoctorFees,
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: ({ cash, movements, settlements, doctorFees }) => {
          this.summary = cash || null;
          this.movements = Array.isArray(movements) ? movements : [];
          const items = (settlements as { items?: Array<Record<string, unknown>> })?.items;
          this.settlements = Array.isArray(items) ? items : [];
          this.doctorFees = Array.isArray(doctorFees?.['items'])
            ? (doctorFees['items'] as Array<Record<string, unknown>>)
            : [];
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || error?.message || 'Unable to load cash settlements.';
          this.toastr.error(this.errorMessage);
        },
      });
  }

  openSettle(): void {
    if (!this.canManage) {
      return;
    }
    const cash = Number(this.summary?.['cashInHand'] || 0);
    this.settleForm = { amount: cash > 0 ? cash : 0, settleTo: 'cash', note: '' };
    this.settleOpen = true;
    this.cdr.markForCheck();
  }

  openAddCash(): void {
    if (!this.canManage) {
      return;
    }
    this.addCashForm = { amount: 0, settleTo: 'cash', note: '' };
    this.addCashOpen = true;
    this.cdr.markForCheck();
  }

  closeModals(): void {
    this.settleOpen = false;
    this.addCashOpen = false;
    this.cdr.markForCheck();
  }

  submitSettle(): void {
    this.submitSettlement('out', this.settleForm);
  }

  submitAddCash(): void {
    this.submitSettlement('in', this.addCashForm);
  }

  settleToLabel(row: Record<string, unknown>): string {
    const isIn = row['direction'] === 'in';
    if (row['settleTo'] === 'bank') {
      return isIn ? 'Added from bank' : 'To bank';
    }
    return isIn ? 'Added by owner' : 'To Hospital Cash';
  }

  printStatement(): void {
    openSettlementStatementPrint(this.statementPayload());
  }

  async downloadPdf(): Promise<void> {
    this.pdfLoading = true;
    this.cdr.markForCheck();
    try {
      await downloadSettlementStatementPdf(
        this.statementPayload(),
        `${this.department}-settlement-${this.dateFrom}-${this.dateTo}.pdf`
      );
    } catch {
      this.toastr.error('Unable to download PDF.');
    } finally {
      this.pdfLoading = false;
      this.cdr.markForCheck();
    }
  }

  private statementPayload(): StatementPayload {
    let balance = 0;
    const lines: StatementLine[] = [...this.movements]
      .reverse()
      .map((row) => {
        const signed = this.signedAmount(row);
        balance += signed;
        return {
          date: this.dateTime(
            (row['movementAt'] || row['createdAt'] || null) as string | null | undefined
          ),
          ref: String(row['referenceNo'] || '—'),
          description: `${this.sourceLabel(row)} · ${row['description'] || ''}`.trim(),
          credit: signed > 0 ? signed : 0,
          debit: signed < 0 ? Math.abs(signed) : 0,
          balance,
        };
      });

    return {
      title: `${this.copy.title} — Cash Ledger`,
      hospitalName: 'Hisaar360 Hospital',
      periodLabel: `${this.dateFrom} → ${this.dateTo}`,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      kpis: [
        {
          label: this.copy.tillLabel,
          value: this.money(this.summary?.['cashInHand'] || 0),
          tone: 'teal',
        },
        {
          label: 'Period income',
          value: this.money(this.summary?.['periodIncome'] || 0),
          tone: 'green',
        },
        {
          label: 'Period expense',
          value: this.money(this.summary?.['periodExpense'] || 0),
          tone: 'red',
        },
        {
          label: 'Settled out',
          value: this.money(this.summary?.['periodSettled'] || 0),
          tone: 'navy',
        },
      ],
      lines,
      footerNote: 'Credits increase cash in hand; settlements move cash to Hospital Cash.',
    };
  }

  sourceLabel(row: Record<string, unknown>): string {
    const type = String(row['sourceType'] || '');
    if (type === 'purchase') {
      const signed = Number(row['signedAmount'] ?? 0);
      const description = String(row['description'] || '').toLowerCase();
      if (signed === 0 || description.includes('owner-funded')) {
        return 'Owner-funded purchase';
      }
      return 'Purchase payment';
    }
    const map: Record<string, string> = {
      sale: 'Medicine sale',
      payment: 'Pharmacy payment',
      expense: 'Expense',
      appointment: 'Appointment fee',
      appointment_fee: 'Appointment fee',
      ledger_payment: 'Ledger payment',
      lab_payment: 'Lab payment',
      settlement: 'Settled to Hospital',
      module_settle_in: 'Module settlement in',
      doctor_payout: 'Doctor payout',
      owner_draw: 'Owner take / bank',
      owner_cash_in: 'Owner add',
      manual: 'Manual',
    };
    return map[type] || type || '—';
  }

  settlementBreakdown(row: Record<string, unknown>): string {
    const breakdown = (row['breakdown'] as Record<string, unknown>) || {};
    const medicine = Number(breakdown['medicineCollected'] || 0);
    const fees = Number(breakdown['appointmentFeesCollected'] || 0);
    if (!(medicine > 0) && !(fees > 0)) {
      return '';
    }
    const parts: string[] = [];
    if (medicine > 0) {
      parts.push(`Medicine ${this.money(medicine)}`);
    }
    if (fees > 0) {
      parts.push(`Appt fees ${this.money(fees)}`);
    }
    return parts.join(' · ');
  }

  signedAmount(row: Record<string, unknown>): number {
    const value = Number(row['signedAmount'] ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  private submitSettlement(
    direction: 'in' | 'out',
    form: { amount: number; settleTo: 'cash' | 'bank'; note: string }
  ): void {
    if (!this.canManage) {
      return;
    }
    const amount = Number(form.amount || 0);
    if (!(amount > 0)) {
      this.toastr.error('Enter an amount greater than zero.');
      return;
    }
    this.saving = true;
    this.backend
      .createDepartmentCashSettlement({
        department: this.department,
        amount,
        direction,
        settleTo: form.settleTo,
        periodFrom: this.dateFrom,
        periodTo: this.dateTo,
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success(
            direction === 'in' ? 'Cash added to cash in hand.' : 'Cash settled to Hospital Cash.'
          );
          this.closeModals();
          this.reload();
        },
        error: (error) => {
          this.toastr.error(error?.error?.message || error?.message || 'Unable to save settlement.');
        },
      });
  }
}

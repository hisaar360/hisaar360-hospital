import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { BackendService } from '../../../core/services/backend.service';
import { formatCurrency, formatDateTime } from '../pharmacy-admin.utils';
import { todayYmd, toCalendarYmd } from '../../../core/utils/calendar-date';

type DeptKey = 'pharmacy' | 'ward' | 'opd';
type PeriodChip = 'week' | 'month' | 'custom';

const DEPT_COPY: Record<
  DeptKey,
  { title: string; blurb: string; tillLabel: string }
> = {
  pharmacy: {
    title: 'Pharmacy Settlement',
    blurb:
      'Pharmacy counter cash drawer. Medicine sales and appointment fees collected here stay as separate lines for audit — one till, clear split when you settle.',
    tillLabel: 'Pharmacy Cash in Hand',
  },
  ward: {
    title: 'Ward Till',
    blurb: 'Ward admission collections drawer. Separate from Hospital Accounts — owner take / bank deposit settle here.',
    tillLabel: 'Ward Cash in Hand',
  },
  opd: {
    title: 'OPD Till',
    blurb: 'OPD consultation fee cash drawer. Separate from Hospital Accounts — settle OPD collections to owner or bank.',
    tillLabel: 'OPD Cash in Hand',
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
  saving = false;
  errorMessage = '';
  periodChip: PeriodChip = 'month';
  dateFrom = '';
  dateTo = '';
  summary: Record<string, unknown> | null = null;
  movements: Array<Record<string, unknown>> = [];
  settlements: Array<Record<string, unknown>> = [];
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
    this.department = dept === 'ward' || dept === 'opd' ? dept : 'pharmacy';
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
    forkJoin({
      cash: this.backend.getDepartmentCash(query),
      movements: this.backend.listDepartmentCashMovements(query),
      settlements: this.backend.listDepartmentCashSettlements({ ...query, limit: 50 }),
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: ({ cash, movements, settlements }) => {
          this.summary = cash || null;
          this.movements = Array.isArray(movements) ? movements : [];
          const items = (settlements as { items?: Array<Record<string, unknown>> })?.items;
          this.settlements = Array.isArray(items) ? items : [];
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
    return isIn ? 'Added by owner' : 'Taken as cash';
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
      settlement: 'Settlement',
      owner_draw: 'Owner take',
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
          this.toastr.success(direction === 'in' ? 'Cash added to till.' : 'Cash settled.');
          this.closeModals();
          this.reload();
        },
        error: (error) => {
          this.toastr.error(error?.error?.message || error?.message || 'Unable to save settlement.');
        },
      });
  }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { BackendService } from '../../../core/services/backend.service';
import { formatCurrency, formatDateTime } from '../pharmacy-admin.utils';
import { todayYmd, toCalendarYmd } from '../../../core/utils/calendar-date';
import {
  downloadSettlementStatementPdf,
  openSettlementStatementPrint,
  StatementLine,
  StatementPayload,
} from './settlement-statement.print';

type LedgerRow = StatementLine & { balance: number };

@Component({
  selector: 'app-hospital-cash-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './hospital-cash-page.component.html',
  styleUrl: './department-cash-settlements-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HospitalCashPageComponent implements OnInit {
  loading = true;
  pdfLoading = false;
  dateFrom = '';
  dateTo = '';
  summary: Record<string, unknown> | null = null;
  moduleCash: Array<Record<string, unknown>> = [];
  movements: Array<Record<string, unknown>> = [];
  ledgerRows: LedgerRow[] = [];
  errorMessage = '';

  readonly money = formatCurrency;
  readonly dateTime = formatDateTime;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.dateTo = todayYmd();
    this.dateFrom = toCalendarYmd(new Date(today.getFullYear(), today.getMonth(), 1));
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.errorMessage = '';
    const query = { dateFrom: this.dateFrom, dateTo: this.dateTo, limit: 200 };
    forkJoin({
      hospital: this.backend.getDepartmentCash({ ...query, department: 'hospital' }),
      all: this.backend.getAllDepartmentCash(query),
      movements: this.backend.listDepartmentCashMovements({
        ...query,
        department: 'hospital',
      }),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ({ hospital, all, movements }) => {
          this.summary = hospital;
          const items = Array.isArray(all?.['items'])
            ? (all['items'] as Array<Record<string, unknown>>)
            : [];
          this.moduleCash = items.filter(
            (row) => String(row['department'] || '') !== 'hospital'
          );
          this.movements = Array.isArray(movements) ? movements : [];
          this.ledgerRows = this.buildLedgerRows();
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || error?.message || 'Unable to load Hospital Cash.';
          this.toastr.error(this.errorMessage);
        },
      });
  }

  moduleInTotal(): number {
    return this.movements
      .filter((row) => String(row['sourceType'] || '') === 'module_settle_in')
      .reduce((sum, row) => sum + Number(row['signedAmount'] || 0), 0);
  }

  doctorPayoutTotal(): number {
    return Math.abs(
      this.movements
        .filter((row) => String(row['sourceType'] || '') === 'doctor_payout')
        .reduce((sum, row) => sum + Number(row['signedAmount'] || 0), 0)
    );
  }

  totalCredit(): number {
    return this.ledgerRows.reduce((sum, row) => sum + Number(row.credit || 0), 0);
  }

  totalDebit(): number {
    return this.ledgerRows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
  }

  closingBalance(): number {
    if (!this.ledgerRows.length) {
      return Number(this.summary?.['cashInHand'] || 0);
    }
    return Number(this.ledgerRows[this.ledgerRows.length - 1].balance || 0);
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
        `hospital-settlement-${this.dateFrom}-${this.dateTo}.pdf`
      );
    } catch {
      this.toastr.error('Unable to download PDF.');
    } finally {
      this.pdfLoading = false;
      this.cdr.markForCheck();
    }
  }

  private buildLedgerRows(): LedgerRow[] {
    let balance = 0;
    return [...this.movements].reverse().map((row) => {
      const signed = Number(row['signedAmount'] || 0);
      balance += signed;
      return {
        date: this.dateTime(
          (row['movementAt'] || row['createdAt'] || null) as string | null | undefined
        ),
        ref: String(row['referenceNo'] || '—'),
        description: String(row['description'] || row['sourceType'] || 'Movement'),
        credit: signed > 0 ? signed : 0,
        debit: signed < 0 ? Math.abs(signed) : 0,
        balance,
      };
    });
  }

  private statementPayload(): StatementPayload {
    return {
      title: 'Hospital Settlement — Main Ledger',
      hospitalName: 'Hisaar360 Hospital',
      periodLabel: `${this.dateFrom} → ${this.dateTo}`,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      kpis: [
        {
          label: 'Cash in hand',
          value: this.money(this.summary?.['cashInHand'] || 0),
          tone: 'teal',
        },
        {
          label: 'From modules',
          value: this.money(this.moduleInTotal()),
          tone: 'green',
        },
        {
          label: 'Doctor payouts',
          value: this.money(this.doctorPayoutTotal()),
          tone: 'red',
        },
        {
          label: 'Remaining cash',
          value: this.money(this.summary?.['cashInHand'] || 0),
          tone: 'amber',
        },
      ],
      lines: this.ledgerRows,
      footerNote:
        'Credit = module settle-in · Debit = doctor payout / draw · Balance is running hospital cash.',
    };
  }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

@Component({
  selector: 'app-doctor-dues-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './doctor-dues-page.component.html',
  styleUrl: './department-cash-settlements-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorDuesPageComponent implements OnInit {
  loading = true;
  pdfLoading = false;
  payingId: string | null = null;
  dateFrom = '';
  dateTo = '';
  items: Array<Record<string, unknown>> = [];
  payouts: Array<Record<string, unknown>> = [];
  totals: Record<string, number> = {};
  hospitalCash = 0;
  errorMessage = '';
  expandedDoctorId = '';

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

  get canPay(): boolean {
    return (
      this.backend.hasPermission('accounts.cash_settlement.manage') ||
      this.backend.hasPermission('*')
    );
  }

  reload(): void {
    this.loading = true;
    this.errorMessage = '';
    const query = { dateFrom: this.dateFrom, dateTo: this.dateTo };
    forkJoin({
      dues: this.backend.getDoctorDues(query),
      payouts: this.backend.getDoctorPayouts(query).pipe(
        catchError(() => of({ items: [] as Array<Record<string, unknown>> }))
      ),
      hospital: this.backend.getDepartmentCash({ department: 'hospital', ...query }).pipe(
        catchError(() => of({ cashInHand: 0 }))
      ),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ({ dues, payouts, hospital }) => {
          this.items = Array.isArray(dues?.['items'])
            ? (dues['items'] as Array<Record<string, unknown>>)
            : [];
          this.totals = (dues?.['totals'] as Record<string, number>) || {};
          const payoutPayload = payouts?.['items'];
          this.payouts = Array.isArray(payoutPayload)
            ? (payoutPayload as Array<Record<string, unknown>>)
            : [];
          this.hospitalCash = Number(hospital?.['cashInHand'] || 0);
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || error?.message || 'Unable to load doctor dues.';
          this.toastr.error(this.errorMessage);
        },
      });
  }

  toggleDoctor(doctorId: string): void {
    this.expandedDoctorId = this.expandedDoctorId === doctorId ? '' : doctorId;
  }

  payDoctor(row: Record<string, unknown>): void {
    if (!this.canPay) {
      return;
    }
    const doctorId = String(row['doctorId'] || '');
    const due = Number(row['dueTotal'] || 0);
    if (!doctorId || !(due > 0)) {
      return;
    }
    if (due > this.hospitalCash + 0.009) {
      this.toastr.error(
        `Hospital Cash (${this.money(this.hospitalCash)}) is less than due (${this.money(due)}). Settle modules first.`
      );
      return;
    }
    this.payingId = doctorId;
    this.backend
      .payDoctorDues({
        doctorId,
        dateFrom: this.dateFrom,
        dateTo: this.dateTo,
      })
      .pipe(
        finalize(() => {
          this.payingId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          this.toastr.success(response.message || 'Doctor payout recorded');
          this.reload();
        },
        error: (error) => {
          this.toastr.error(error?.error?.message || 'Unable to pay doctor dues.');
        },
      });
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
        `doctor-dues-${this.dateFrom}-${this.dateTo}.pdf`
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
    const lines: StatementLine[] = this.items.flatMap((doc) => {
      const doctorName = String(doc['doctorName'] || 'Doctor');
      const docLines = Array.isArray(doc['lines'])
        ? (doc['lines'] as Array<Record<string, unknown>>)
        : [];
      return docLines.map((line) => {
        const dueAmt = line['due'] ? Number(line['doctorShareAmount'] || 0) : 0;
        const paidAmt = line['due'] ? 0 : Number(line['doctorShareAmount'] || 0);
        balance += paidAmt - dueAmt;
        return {
          date: String(line['appointmentDate'] || ''),
          ref: String(line['appointmentNo'] || ''),
          description: `${doctorName} · ${line['patientName'] || 'Patient'} · share ${line['doctorSharePercent'] || 100}%`,
          credit: paidAmt,
          debit: dueAmt,
          balance,
        };
      });
    });

    return {
      title: 'Doctor Dues Statement',
      hospitalName: 'Hisaar360 Hospital',
      periodLabel: `${this.dateFrom} → ${this.dateTo}`,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      kpis: [
        {
          label: 'Hospital cash',
          value: this.money(this.hospitalCash),
          tone: 'teal',
        },
        {
          label: 'Total collected',
          value: this.money(this.totals['collectedTotal'] || 0),
          tone: 'navy',
        },
        {
          label: 'Total dues',
          value: this.money(this.totals['doctorShareTotal'] || 0),
          tone: 'amber',
        },
        {
          label: 'Paid',
          value: this.money(this.totals['paidTotal'] || 0),
          tone: 'green',
        },
        {
          label: 'Remaining due',
          value: this.money(this.totals['dueTotal'] || 0),
          tone: 'red',
        },
      ],
      lines,
      footerNote: 'Debit = unpaid doctor share · Credit = paid to doctor · Remaining due is still payable.',
    };
  }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';
import { BackendService } from '../../../core/services/backend.service';
import { formatCurrency, formatDateTime } from '../pharmacy-admin.utils';
import { todayYmd, toCalendarYmd } from '../../../core/utils/calendar-date';

@Component({
  selector: 'app-lab-day-payments-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lab-day-payments-page.component.html',
  styleUrl: './lab-day-payments-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabDayPaymentsPageComponent implements OnInit {
  loading = false;
  dateFrom = '';
  dateTo = '';
  source = '';
  paymentStatus = '';
  items: Array<Record<string, unknown>> = [];
  totals: Record<string, unknown> = {};

  readonly money = formatCurrency;
  readonly dateTime = formatDateTime;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const today = todayYmd();
    this.dateFrom = today;
    this.dateTo = today;
    this.reload();
  }

  setToday(): void {
    const today = todayYmd();
    this.dateFrom = today;
    this.dateTo = today;
    this.reload();
  }

  setWeek(): void {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    this.dateFrom = toCalendarYmd(start);
    this.dateTo = todayYmd();
    this.reload();
  }

  sourceCount(key: string): number {
    const bySource = (this.totals['bySource'] as Record<string, number>) || {};
    return Number(bySource[key] || 0);
  }

  patientName(row: Record<string, unknown>): string {
    const patient = row['patient'] as Record<string, unknown> | null;
    if (!patient) {
      return 'Walk-in / unknown';
    }
    return String(patient['name'] || patient['fullName'] || patient['patientNo'] || 'Patient');
  }

  reload(): void {
    this.loading = true;
    const params: Record<string, unknown> = {
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      limit: 200,
    };
    if (this.source) {
      params['source'] = this.source;
    }
    if (this.paymentStatus) {
      params['paymentStatus'] = this.paymentStatus;
    }
    this.backend
      .getLabPaymentsAudit(params)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          this.items = Array.isArray(data?.['items'])
            ? (data['items'] as Array<Record<string, unknown>>)
            : [];
          this.totals = (data?.['totals'] as Record<string, unknown>) || {};
        },
        error: (error) => {
          this.toastr.error(error?.error?.message || 'Unable to load lab day payments.');
          this.items = [];
        },
      });
  }
}

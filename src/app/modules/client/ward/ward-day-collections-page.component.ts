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
  selector: 'app-ward-day-collections-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ward-day-collections-page.component.html',
  styleUrl: './ward-day-collections-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardDayCollectionsPageComponent implements OnInit {
  loading = false;
  dateFrom = '';
  dateTo = '';
  collectedByDepartment = '';
  items: Array<Record<string, unknown>> = [];
  totals: Record<string, number> = {};

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

  reload(): void {
    this.loading = true;
    const params: Record<string, unknown> = {
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      limit: 200,
    };
    if (this.collectedByDepartment) {
      params['collectedByDepartment'] = this.collectedByDepartment;
    }
    this.backend
      .getWardPaymentsAudit(params)
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
          this.totals = (data?.['totals'] as Record<string, number>) || {};
        },
        error: (error) => {
          this.toastr.error(error?.error?.message || 'Unable to load ward day collections.');
          this.items = [];
        },
      });
  }
}

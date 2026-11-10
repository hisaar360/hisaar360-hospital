import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';
import { BackendService } from '../../../core/services/backend.service';
import { formatCurrency, formatDateTime } from '../pharmacy-admin.utils';
import { todayYmd, toCalendarYmd } from '../../../core/utils/calendar-date';
import { isClinicalModuleEnabled } from '../../auth/hospital-modules';

type AuditStatus =
  | ''
  | 'paid'
  | 'pharmacy_paid'
  | 'due_at_pharmacy'
  | 'unpaid'
  | 'unchecked'
  | 'cancelled'
  | 'no_show';

interface ReportDoctor {
  _id: string;
  userId?: string;
  name: string;
  specialization?: string | null;
}

@Component({
  selector: 'app-appointment-payments-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './appointment-payments-page.component.html',
  styleUrl: './appointment-payments-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentPaymentsPageComponent implements OnInit {
  loading = false;
  collectingId: string | null = null;
  dateFrom = '';
  dateTo = '';
  doctorId = '';
  auditStatus: AuditStatus = '';
  collectChannel: 'opd' | 'pharmacy' = 'opd';
  doctors: ReportDoctor[] = [];
  items: Array<Record<string, unknown>> = [];
  doctorSummary: Array<Record<string, unknown>> = [];
  totals: Record<string, number> = {};
  clinicalEnabled = isClinicalModuleEnabled();

  readonly money = formatCurrency;
  readonly dateTime = formatDateTime;

  pharmacyMode = false;

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const today = todayYmd();
    this.dateFrom = today;
    this.dateTo = today;
    const channel = String(this.route.snapshot.queryParamMap.get('channel') || '').toLowerCase();
    if (
      channel === 'pharmacy' ||
      (this.backend.hasPermission('sales.create') && !this.backend.hasPermission('appointments.update'))
    ) {
      this.collectChannel = 'pharmacy';
      this.pharmacyMode = channel === 'pharmacy';
      // Show all pharmacy-related fees by default (due + already collected).
      // "Due at pharmacy" alone hides collected fees and makes KPIs look like zero.
      if (this.pharmacyMode) {
        this.auditStatus = '';
      }
    }
    this.loadDoctors();
    if (this.clinicalEnabled) {
      this.reload();
    }
  }

  get canCollect(): boolean {
    return (
      this.backend.hasPermission('appointments.update') ||
      this.backend.hasPermission('ledger_payments.create') ||
      this.backend.hasPermission('accounts.cash_settlement.manage') ||
      this.backend.hasPermission('sales.create') ||
      this.backend.hasPermission('*')
    );
  }

  loadDoctors(): void {
    this.backend.getReportDoctors().subscribe({
      next: (rows) => {
        this.doctors = (rows || []).map((row) => ({
          _id: String(row['_id'] || row['userId'] || ''),
          userId: row['userId'] ? String(row['userId']) : undefined,
          name: String(row['name'] || 'Doctor'),
          specialization: (row['specialization'] as string) || null,
        }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.doctors = [];
        this.cdr.markForCheck();
      },
    });
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
    if (!this.clinicalEnabled) {
      return;
    }
    this.loading = true;
    const params: Record<string, unknown> = {
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      limit: 200,
    };
    if (this.doctorId) {
      params['doctorId'] = this.doctorId;
    }
    if (this.pharmacyMode) {
      // Pharmacy page is scoped to pharmacy collection point.
      params['feeCollectionPoint'] = 'pharmacy';
    }
    if (this.auditStatus) {
      params['auditStatus'] = this.auditStatus;
    }
    this.backend
      .getAppointmentPaymentsAudit(params)
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
          this.doctorSummary = Array.isArray(data?.['doctorSummary'])
            ? (data['doctorSummary'] as Array<Record<string, unknown>>)
            : [];
          this.totals = (data?.['totals'] as Record<string, number>) || {};
        },
        error: (error) => {
          this.toastr.error(error?.error?.message || 'Unable to load appointment payments.');
          this.items = [];
          this.doctorSummary = [];
        },
      });
  }

  badgeClass(status: unknown): string {
    switch (String(status || '')) {
      case 'paid':
        return 'badge-paid';
      case 'pharmacy_paid':
        return 'badge-pharmacy';
      case 'due_at_pharmacy':
        return 'badge-pharmacy';
      case 'unpaid':
        return 'badge-unpaid';
      case 'cancelled':
        return 'badge-cancelled';
      case 'no_show':
        return 'badge-noshow';
      default:
        return 'badge-unchecked';
    }
  }

  badgeLabel(status: unknown): string {
    switch (String(status || '')) {
      case 'pharmacy_paid':
        return 'Pharmacy paid';
      case 'due_at_pharmacy':
        return 'Due at pharmacy';
      case 'no_show':
        return 'No checkup';
      default:
        return String(status || '—');
    }
  }

  collectionPointLabel(row: Record<string, unknown>): string {
    return String(row['feeCollectionPoint'] || '') === 'pharmacy' ? 'Pharmacy' : 'OPD';
  }

  receivedByLabel(row: Record<string, unknown>): string {
    const fromUser = row['feeReceivedByUser'] as Record<string, unknown> | null;
    const name = String(
      row['receivedByName'] || fromUser?.['name'] || fromUser?.['fullName'] || ''
    ).trim();
    return name || '—';
  }

  receivedChannelLabel(row: Record<string, unknown>): string {
    const channel = String(row['feeReceivedChannel'] || row['paidChannel'] || '').toLowerCase();
    if (channel === 'pharmacy') {
      return 'Pharmacy';
    }
    if (channel === 'opd') {
      return 'OPD';
    }
    if (String(row['paymentStatus'] || '') === 'paid' || row['receivedByName'] || row['feeReceivedBy']) {
      return String(row['feeCollectionPoint'] || '') === 'pharmacy' ? 'Pharmacy' : 'OPD';
    }
    return '—';
  }

  channelBadgeClass(row: Record<string, unknown>): string {
    const label = this.receivedChannelLabel(row);
    if (label === 'Pharmacy') {
      return 'badge-pharmacy';
    }
    if (label === 'OPD') {
      return 'badge-paid';
    }
    return 'badge-unchecked';
  }

  patientName(row: Record<string, unknown>): string {
    const patient = row['patient'] as Record<string, unknown> | null;
    return String(patient?.['name'] || patient?.['fullName'] || 'Patient');
  }

  doctorName(row: Record<string, unknown>): string {
    const doctor = row['doctor'] as Record<string, unknown> | null;
    return String(doctor?.['name'] || doctor?.['fullName'] || 'Doctor');
  }

  collect(row: Record<string, unknown>): void {
    if (!this.canCollect) {
      return;
    }
    const id = String(row['_id'] || '');
    const status = String(row['auditStatus'] || '');
    if (!id || status === 'paid' || status === 'pharmacy_paid' || status === 'cancelled') {
      return;
    }
    const channel =
      this.collectChannel === 'pharmacy' || String(row['feeCollectionPoint'] || '') === 'pharmacy'
        ? 'pharmacy'
        : 'opd';
    this.collectingId = id;
    this.backend
      .collectAppointmentFee(id, {
        method: 'cash',
        collectedByChannel: channel,
      })
      .pipe(
        finalize(() => {
          this.collectingId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success(
            channel === 'pharmacy'
              ? 'Appointment fee collected · Pharmacy Settlement updated (separate from medicine sales).'
              : 'Appointment fee collected · OPD Till updated.'
          );
          // Collected fees leave the "Due at pharmacy" list — show them under Pharmacy paid.
          if (this.auditStatus === 'due_at_pharmacy') {
            this.auditStatus = 'pharmacy_paid';
          }
          this.reload();
        },
        error: (error) => {
          this.toastr.error(error?.error?.message || 'Unable to collect fee.');
        },
      });
  }
}

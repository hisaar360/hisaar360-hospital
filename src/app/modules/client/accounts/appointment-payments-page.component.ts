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
import {
  downloadSettlementStatementPdf,
  openSettlementStatementPrint,
  StatementLine,
  StatementPayload,
} from './settlement-statement.print';

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
  pdfLoading = false;
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
  collectorHoldings: Array<{ name: string; channel: string; amount: number; count: number }> = [];
  holdingTotals = {
    pharmacy: 0,
    opd: 0,
    hospital: 0,
  };

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
          this.rebuildCollectorHoldings();
        },
        error: (error) => {
          this.toastr.error(error?.error?.message || 'Unable to load appointment payments.');
          this.items = [];
          this.doctorSummary = [];
          this.collectorHoldings = [];
          this.holdingTotals = { pharmacy: 0, opd: 0, hospital: 0 };
        },
      });
  }

  private rebuildCollectorHoldings(): void {
    const byKey = new Map<string, { name: string; channel: string; amount: number; count: number }>();
    let pharmacy = 0;
    let opd = 0;
    let hospital = 0;

    for (const row of this.items) {
      const status = String(row['auditStatus'] || '');
      const paid = status === 'paid' || status === 'pharmacy_paid';
      if (!paid) {
        continue;
      }
      const amount = Number(row['paidAmount'] || row['feeAmountCollected'] || row['netFee'] || 0);
      if (!(amount > 0)) {
        continue;
      }
      const settled = Boolean(row['settledToHospitalAt']);
      const channel =
        String(row['feeReceivedChannel'] || row['paidChannel'] || '').toLowerCase() === 'pharmacy'
          ? 'pharmacy'
          : 'opd';
      if (settled) {
        hospital += amount;
        continue;
      }
      if (channel === 'pharmacy') {
        pharmacy += amount;
      } else {
        opd += amount;
      }
      const name = this.receivedByLabel(row);
      if (!name || name === '—') {
        continue;
      }
      const key = `${channel}::${name.toLowerCase()}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.amount += amount;
        existing.count += 1;
      } else {
        byKey.set(key, { name, channel, amount, count: 1 });
      }
    }

    this.holdingTotals = {
      pharmacy: Math.round(pharmacy * 100) / 100,
      opd: Math.round(opd * 100) / 100,
      hospital: Math.round(hospital * 100) / 100,
    };
    this.collectorHoldings = Array.from(byKey.values()).sort((a, b) => b.amount - a.amount);
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
        `opd-fees-audit-${this.dateFrom}-${this.dateTo}.pdf`
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
    const lines: StatementLine[] = this.items.map((row) => {
      const paid = Number(row['paidAmount'] || row['feeAmountCollected'] || 0);
      const unpaid =
        String(row['auditStatus'] || '') === 'unpaid' ||
        String(row['auditStatus'] || '') === 'due_at_pharmacy' ||
        String(row['auditStatus'] || '') === 'unchecked'
          ? Number(row['netFee'] || 0)
          : 0;
      balance += paid - unpaid;
      return {
        date: String(row['appointmentDate'] || ''),
        ref: String(row['appointmentNo'] || ''),
        description: `${this.patientName(row)} · ${this.doctorName(row)} · ${this.receivedByLabel(row)} · ${this.receivedChannelLabel(row)}`,
        credit: paid > 0 ? paid : 0,
        debit: unpaid > 0 ? unpaid : 0,
        balance,
      };
    });

    return {
      title: this.pharmacyMode ? 'Appointment Fees (Pharmacy)' : 'OPD Fees Audit',
      hospitalName: 'Hisaar360 Hospital',
      periodLabel: `${this.dateFrom} → ${this.dateTo}`,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      kpis: [
        { label: 'Fee total', value: this.money(this.totals['feeTotal'] || 0), tone: 'navy' },
        { label: 'With Pharmacy', value: this.money(this.holdingTotals.pharmacy), tone: 'teal' },
        { label: 'With OPD staff', value: this.money(this.holdingTotals.opd), tone: 'amber' },
        { label: 'In Hospital Cash', value: this.money(this.holdingTotals.hospital), tone: 'green' },
      ],
      lines,
      footerNote: 'Credit = collected fee · Debit = still unpaid · Received by is the collector username.',
    };
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
      row['receivedByName'] ||
        row['feeReceivedByName'] ||
        fromUser?.['name'] ||
        fromUser?.['fullName'] ||
        ''
    ).trim();
    // Never show hospital / org name as the collector.
    const lower = name.toLowerCase();
    if (!name || /\bhospital\b/i.test(name) || lower === 'hisaar360') {
      return '—';
    }
    return name;
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
              : 'Appointment fee collected · OPD Settlement updated.'
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

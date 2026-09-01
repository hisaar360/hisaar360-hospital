import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { buildAccountsReportDocumentHtml } from '../../../core/documents/accounts-report-document.builder';
import { readCurrentUserName, readStoredHospitalDocumentInfo } from '../../../core/utils/hms-document-context.util';
import { formatHmsMoney } from '../../../core/utils/hms-document-template.util';
import { todayYmd, toCalendarYmd } from '../../../core/utils/calendar-date';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';

interface ReportDoctor {
  _id: string;
  userId: string;
  name: string;
  specialization?: string | null;
}

interface DoctorKpiCard {
  label: string;
  value: unknown;
  money: boolean;
  highlight?: boolean;
  icon: string;
  tone: string;
}

@Component({
  selector: 'app-doctor-performance-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HmsDocumentToolbarComponent],
  templateUrl: './doctor-performance-page.component.html',
  styleUrl: './accounts-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorPerformancePageComponent implements OnInit {
  loading = false;
  fromDate = '';
  toDate = '';
  doctors: ReportDoctor[] = [];
  doctorsLoading = false;
  doctorsLoadError = '';
  selectedDoctorId = '';
  breakdownTab: 'daily' | 'weekly' | 'monthly' = 'daily';
  detailTab: 'appointments' | 'lab' | 'pharmacy' | 'prescriptions' = 'appointments';
  activeDatePreset: 'today' | 'week' | 'month' | 'custom' = 'month';
  data: Record<string, unknown> = {};
  doctorKpiCardsList: DoctorKpiCard[] = [];
  breakdownRowsList: Array<Record<string, unknown>> = [];
  detailRowsList: Array<Record<string, unknown>> = [];

  readonly accountsNav = [
    { label: 'Dashboard', route: 'dashboard' },
    { label: 'CoA', route: 'chart-of-accounts' },
    { label: 'GL', route: 'general-ledger' },
    { label: 'Cash', route: 'cash-book' },
    { label: 'Collections', route: 'daily-collections' },
    { label: 'Doctor Report', route: 'doctor-performance' },
    { label: 'Department Report', route: 'department-performance' },
    { label: 'Patient Profitability', route: 'patient-profitability' },
    { label: 'Trial Balance', route: 'trial-balance' },
    { label: 'P&L', route: 'profit-loss' },
  ];

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.applyDatePreset('month', false);
    this.loadReportDoctors();
  }

  isNavActive(route: string): boolean {
    return route === 'doctor-performance';
  }

  doctorLabel(doctor: ReportDoctor): string {
    return doctor.specialization ? `${doctor.name} · ${doctor.specialization}` : doctor.name;
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

  onDoctorChange(): void {
    this.load();
  }

  setBreakdownTab(tab: 'daily' | 'weekly' | 'monthly'): void {
    this.breakdownTab = tab;
    this.refreshDerivedViews();
  }

  setDetailTab(tab: 'appointments' | 'lab' | 'pharmacy' | 'prescriptions'): void {
    this.detailTab = tab;
    this.refreshDerivedViews();
  }

  loadReportDoctors(): void {
    this.doctorsLoading = true;
    this.doctorsLoadError = '';
    this.cdr.markForCheck();
    this.backend.getReportDoctors().subscribe({
      next: (items) => {
        this.doctors = (items || []).map((item) => ({
          _id: String(item['_id'] || ''),
          userId: String(item['userId'] || item['_id'] || ''),
          name: String(item['name'] || ''),
          specialization: item['specialization'] ? String(item['specialization']) : null,
        }));
        this.doctorsLoading = false;
        if (!this.selectedDoctorId && this.doctors.length) {
          this.selectedDoctorId = this.doctors[0].userId;
        }
        if (this.selectedDoctorId) {
          this.load();
        }
        this.cdr.markForCheck();
      },
      error: (error: { error?: { message?: string } }) => {
        this.doctors = [];
        this.doctorsLoading = false;
        this.doctorsLoadError = error?.error?.message || 'Unable to load doctors for this report';
        this.cdr.markForCheck();
      },
    });
  }

  load(): void {
    if (!this.selectedDoctorId) {
      this.toastr.warning('Select a doctor to load performance report');
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    const params: Record<string, unknown> = {
      doctorId: this.selectedDoctorId,
    };
    if (this.fromDate) params['fromDate'] = this.fromDate;
    if (this.toDate) params['toDate'] = this.toDate;

    this.backend.getDoctorPerformance(params).subscribe({
      next: (result) => {
        this.data = (result || {}) as Record<string, unknown>;
        this.refreshDerivedViews();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error: { error?: { message?: string } }) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.toastr.error(error?.error?.message || 'Unable to load doctor performance');
      },
    });
  }

  private refreshDerivedViews(): void {
    const summary = this.asRecord('summary');
    this.doctorKpiCardsList = [
      { label: 'Consultation fees', value: summary['consultationFees'], money: true, highlight: true, icon: 'fa-stethoscope', tone: 'teal' },
      { label: 'Lab revenue', value: summary['labRevenue'], money: true, icon: 'fa-flask', tone: 'blue' },
      { label: 'Pharmacy revenue', value: summary['pharmacyRevenue'], money: true, icon: 'fa-medkit', tone: 'orange' },
      { label: 'Pharmacy profit', value: summary['pharmacyProfit'], money: true, highlight: true, icon: 'fa-line-chart', tone: 'green' },
      { label: 'Gross collected', value: summary['grossCollected'], money: true, highlight: true, icon: 'fa-money', tone: 'teal' },
      { label: 'Appointments', value: summary['appointmentCount'], money: false, icon: 'fa-calendar', tone: 'purple' },
      { label: 'Lab orders', value: summary['labOrderCount'], money: false, icon: 'fa-flask', tone: 'blue' },
      { label: 'Prescriptions', value: summary['prescriptionCount'], money: false, icon: 'fa-file-text-o', tone: 'orange' },
    ];

    const breakdown = this.asRecord('breakdown');
    this.breakdownRowsList = this.asArrayFrom(breakdown[this.breakdownTab]);

    const details = this.asRecord('details');
    const detailMap: Record<string, string> = {
      appointments: 'appointments',
      lab: 'labOrders',
      pharmacy: 'pharmacySales',
      prescriptions: 'prescriptions',
    };
    this.detailRowsList = this.asArrayFrom(details[detailMap[this.detailTab]]);
  }

  asRecord(key: string): Record<string, unknown> {
    const value = this.data[key];
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private asArrayFrom(value: unknown): Array<Record<string, unknown>> {
    return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
  }

  asDate(value: unknown): string | number | Date | null {
    if (value == null) return null;
    return value as string | number | Date;
  }

  formatTests(value: unknown): string {
    return Array.isArray(value) ? value.filter(Boolean).join(', ') : String(value || '');
  }

  money(value: unknown): string {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed.toLocaleString('en-PK') : '0';
  }

  buildDoctorPerformanceDocumentHtml = (): string =>
    buildAccountsReportDocumentHtml({
      title: 'Doctor Performance',
      hospital: readStoredHospitalDocumentInfo(),
      fromDate: this.fromDate,
      toDate: this.toDate,
      generatedBy: readCurrentUserName(),
      orientation: 'landscape',
      summaryCards: this.doctorKpiCardsList.map((card) => ({
        label: card.label,
        value: card.money ? formatHmsMoney(card.value) : String(card.value ?? '—'),
      })),
      columns: [
        { keys: ['date', 'entryDate'], label: 'Date' },
        { keys: ['referenceNo', 'appointmentNo', 'orderNo'], label: 'Reference' },
        { keys: ['patientName', 'patient.patientNo'], label: 'Patient' },
        { keys: ['sourceType', 'category'], label: 'Source' },
        { keys: ['amount', 'netAmount', 'revenue'], label: 'Amount', numeric: true },
        { keys: ['status'], label: 'Status' },
      ],
      rows: this.detailRowsList,
    });
}

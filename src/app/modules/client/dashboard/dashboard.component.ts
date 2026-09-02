import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexXAxis,
} from 'ng-apexcharts';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { hasPermission, readStoredPermissions } from '../../auth/access-control';
import {
  isClinicalModuleEnabled,
  isLaboratoryModuleEnabled,
  isPharmacyModuleEnabled,
  isWardModuleEnabled,
} from '../../auth/hospital-modules';
import { canAccessHospitalSetup } from '../../auth/hospital-scope';
import {
  Appointment,
  DashboardActivityItem,
  DashboardStatusBreakdown,
  DashboardSummary,
  Patient,
} from '../../../shared/models/hospital.model';

type DashboardTab = 'overview' | 'appointments' | 'laboratory';

type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  plotOptions: ApexPlotOptions;
};

type BarChartOptions = {
  series: Array<{ name: string; data: number[] }>;
  chart: ApexChart;
  xaxis: ApexXAxis;
  colors: string[];
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
};

interface DashboardKpi {
  label: string;
  value: string | number;
  hint: string;
  icon: string;
  tone: string;
  isCurrency?: boolean;
  hidden?: boolean;
}

interface QuickAction {
  label: string;
  icon: string;
  route: string | string[];
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CommonModule, NgApexchartsModule, DatePipe, CurrencyPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  loading = false;
  activeTab: DashboardTab = 'overview';
  readonly todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  readonly permissions = readStoredPermissions();
  readonly labEnabled = isLaboratoryModuleEnabled();

  summary: DashboardSummary = this.emptySummary();
  primaryKpis: DashboardKpi[] = [];
  secondaryKpis: DashboardKpi[] = [];
  quickActions: QuickAction[] = [];
  todayDonut: DonutChartOptions = this.buildDonutChart(this.emptyBreakdown());
  operationsBar: BarChartOptions = this.buildOperationsBar();

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.syncDashboardState();
    this.loadSummary();
  }

  get canSeeRevenue(): boolean {
    const permissions = this.permissions ?? [];
    return (
      permissions.includes('*') ||
      hasPermission('accounts.read', permissions) ||
      hasPermission('accounts.reports.read', permissions) ||
      hasPermission('ledger_payments.read', permissions) ||
      hasPermission('reports.read', permissions)
    );
  }

  setTab(tab: DashboardTab): void {
    this.activeTab = tab;
  }

  loadSummary(): void {
    this.loading = true;
    this.backend
      .getHospitalDashboardSummary()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (summary) => {
          this.summary = { ...this.emptySummary(), ...(summary || {}) };
          this.syncDashboardState();
        },
        error: (err) => {
          this.summary = this.emptySummary();
          this.syncDashboardState();
          this.toastr.error(err?.error?.message || 'Unable to load dashboard.');
        },
      });
  }

  patientName(patient?: Patient | null): string {
    if (!patient) return '-';
    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || '-';
  }

  patientInitials(patient?: Patient | null): string {
    const name = this.patientName(patient);
    const parts = name.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
  }

  doctorName(appointment: Appointment): string {
    return appointment.doctor?.name || '-';
  }

  appointmentPatientName(appointment: Appointment): string {
    return this.patientName(appointment.patient);
  }

  statusClass(status?: string): string {
    return `status-${String(status || 'pending').replace(/_/g, '-')}`;
  }

  statusLabel(status?: string): string {
    return String(status || 'pending').replace(/_/g, ' ');
  }

  relativeTime(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  activityLabel(item: DashboardActivityItem): string {
    return item.summary || item.action.replace(/_/g, ' ');
  }

  get canSeeAuditLogs(): boolean {
    const permissions = this.permissions ?? [];
    return permissions.includes('*') || hasPermission('audit_logs.read', permissions);
  }

  private syncDashboardState(): void {
    const today = this.summary.todayAppointmentBreakdown || this.emptyBreakdown();

    this.primaryKpis = [
      { label: 'Total Doctors', value: this.summary.totalDoctors, hint: 'Active doctors', icon: 'fa-user-md', tone: 'tone-blue' },
      { label: 'Total Patients', value: this.summary.totalPatients, hint: 'Registered patients', icon: 'fa-users', tone: 'tone-teal' },
      { label: "Today's Appointments", value: this.summary.todayAppointments, hint: 'Scheduled today', icon: 'fa-calendar', tone: 'tone-green' },
      { label: 'Lab Tests Today', value: this.summary.todayLabOrders || 0, hint: 'New lab orders', icon: 'fa-flask', tone: 'tone-purple', hidden: !this.labEnabled },
      { label: 'Prescriptions Today', value: this.summary.todayPrescriptions || 0, hint: 'Created today', icon: 'fa-file-text-o', tone: 'tone-amber', hidden: !isClinicalModuleEnabled() },
      { label: "Today's Revenue", value: this.summary.todayRevenue || 0, hint: 'GL posted today', icon: 'fa-money', tone: 'tone-navy', isCurrency: true, hidden: !this.canSeeRevenue },
    ].filter((item) => !item.hidden);

    this.secondaryKpis = [
      { label: 'Pending', value: today.pending, hint: 'Today', icon: 'fa-clock-o', tone: 'tone-amber' },
      { label: 'Confirmed', value: today.confirmed, hint: 'Today', icon: 'fa-check-circle', tone: 'tone-blue' },
      { label: 'Completed', value: today.completed, hint: 'Today', icon: 'fa-check', tone: 'tone-green' },
      { label: 'Consultation Fees Today', value: this.summary.todayFeesCollected || 0, hint: 'Paid today', icon: 'fa-money', tone: 'tone-teal', isCurrency: true, hidden: !this.canSeeRevenue },
      { label: 'Total Revenue', value: this.summary.totalRevenue, hint: 'All time', icon: 'fa-line-chart', tone: 'tone-navy', isCurrency: true, hidden: !this.canSeeRevenue },
    ].filter((item) => !item.hidden);

    this.quickActions = this.buildQuickActions();
    this.todayDonut = this.buildDonutChart(today);
    this.operationsBar = this.buildOperationsBar();
  }

  private buildQuickActions(): QuickAction[] {
    const permissions = this.permissions ?? [];
    const actions: QuickAction[] = [];
    const push = (label: string, icon: string, route: string | string[], queryParams?: Record<string, string>) => {
      actions.push({ label, icon, route, queryParams });
    };

    if (hasPermission('appointments.create', permissions) || permissions.includes('*')) {
      push('New Appointment', 'fa-calendar-plus-o', '/appointments');
    }
    if (hasPermission('patients.create', permissions) || permissions.includes('*')) {
      push('Add Patient', 'fa-user-plus', '/patients/add-patient');
    }
    if (hasPermission('prescriptions.create', permissions) || permissions.includes('*')) {
      push('Create Prescription', 'fa-file-text-o', '/prescription');
    }
    if (this.labEnabled && (hasPermission('lab_orders.create', permissions) || permissions.includes('*'))) {
      push('Add Lab Test', 'fa-flask', '/laboratory');
    }
    if (hasPermission('appointments.read', permissions) || permissions.includes('*')) {
      push('My Appointments', 'fa-calendar', '/appointments');
    }
    if (hasPermission('patients_history.read', permissions) || permissions.includes('*')) {
      push('Clinical Records', 'fa-folder-open-o', '/care-records');
    }
    if (isWardModuleEnabled() && (hasPermission('ward.read', permissions) || permissions.includes('*'))) {
      push('Pending Admissions', 'fa-bed', '/ward/dashboard');
      push('Control Center', 'fa-hospital-o', '/ward/dashboard');
    }
    if (this.canSeeRevenue) {
      push('Collections', 'fa-credit-card', '/payments');
      push('Reports', 'fa-bar-chart', '/accounts');
    }
    if (isPharmacyModuleEnabled() && this.backend.hasPermission('sales.create')) {
      push('Open POS', 'fa-shopping-cart', '/pharmacy/pos');
    }
    if (canAccessHospitalSetup() || hasPermission('roles.read', permissions) || permissions.includes('*')) {
      push('Hospital Setup', 'fa-cog', '/settings');
    }

    const seen = new Set<string>();
    return actions.filter((action) => {
      const key = Array.isArray(action.route) ? action.route.join('/') : action.route;
      if (seen.has(key + action.label)) return false;
      seen.add(key + action.label);
      return true;
    }).slice(0, 8);
  }

  private buildDonutChart(breakdown: DashboardStatusBreakdown): DonutChartOptions {
    const series = [
      Number(breakdown.pending || 0),
      Number(breakdown.confirmed || 0),
      Number(breakdown.completed || 0),
      Number(breakdown.cancelled || 0),
      Number(breakdown.noShow || 0),
    ];
    return {
      series,
      chart: { type: 'donut', height: 280, fontFamily: 'inherit' },
      labels: ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No Show'],
      colors: ['#f59e0b', '#0fa39e', '#16a34a', '#ef4444', '#94a3b8'],
      legend: { position: 'bottom', fontSize: '12px' },
      dataLabels: { enabled: true },
      stroke: { width: 1 },
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                formatter: () => String(series.reduce((sum, value) => sum + value, 0)),
              },
            },
          },
        },
      },
    };
  }

  private buildOperationsBar(): BarChartOptions {
    const categories = ['Appointments', 'Prescriptions', 'Fees Collected'];
    const data = [
      Number(this.summary.todayAppointments || 0),
      Number(this.summary.todayPrescriptions || 0),
      Number(this.summary.todayFeesCollected || 0),
    ];
    if (this.labEnabled) {
      categories.splice(1, 0, 'Lab Tests');
      data.splice(1, 0, this.summary.todayLabOrders || 0);
    }
    if (!this.canSeeRevenue) {
      const feeIndex = categories.indexOf('Fees Collected');
      if (feeIndex >= 0) {
        categories.splice(feeIndex, 1);
        data.splice(feeIndex, 1);
      }
    }
    return {
      series: [{ name: 'Count', data }],
      chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'inherit' },
      xaxis: { categories },
      colors: ['#0fa39e'],
      plotOptions: { bar: { borderRadius: 8, columnWidth: '46%' } },
      dataLabels: { enabled: true },
      stroke: { show: true, width: 2, colors: ['transparent'] },
    };
  }

  private emptyBreakdown(): DashboardStatusBreakdown {
    return { pending: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0 };
  }

  private emptySummary(): DashboardSummary {
    return {
      totalPatients: 0,
      totalDoctors: 0,
      todayAppointments: 0,
      todayPendingAppointments: 0,
      todayConfirmedAppointments: 0,
      todayCompletedAppointments: 0,
      todayCancelledAppointments: 0,
      pendingAppointments: 0,
      completedAppointments: 0,
      totalRevenue: 0,
      todayRevenue: 0,
      todayFeesCollected: 0,
      todayLabOrders: 0,
      todayPrescriptions: 0,
      totalPrescriptions: 0,
      appointmentBreakdown: this.emptyBreakdown(),
      todayAppointmentBreakdown: this.emptyBreakdown(),
      recentPatients: [],
      upcomingAppointments: [],
      todayAppointmentsList: [],
      activityFeed: [],
    };
  }
}

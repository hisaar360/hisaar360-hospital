import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { buildAccountsReportDocumentHtml } from '../../../core/documents/accounts-report-document.builder';
import { readCurrentUserName, readStoredHospitalDocumentInfo } from '../../../core/utils/hms-document-context.util';
import { formatHmsMoney } from '../../../core/utils/hms-document-template.util';
import { downloadExcelWorkbook } from '../../../core/utils/excel-export.util';
import { todayYmd, toCalendarYmd } from '../../../core/utils/calendar-date';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';

interface DeptRow {
  departmentId: string | null;
  departmentName: string;
  departmentCode: string;
  patients: number;
  encounters: number;
  appointments: number;
  admissions: number;
  consultations: number;
  procedures: number;
  grossCharges: number;
  collected: number;
  outstanding: number;
  knownDirectCost: number;
  grossContribution: number;
  services: Record<string, number>;
}

interface DoctorRow {
  doctorId: string | null;
  doctorName: string;
  departmentName: string;
  patients: number;
  consultations: number;
  procedures: number;
  admissions: number;
  grossCharges: number;
  collected: number;
  outstanding: number;
  knownDirectCost: number;
  grossContribution: number;
}

interface TransactionRow {
  date: string;
  departmentName: string;
  doctorName: string;
  patientNo: string;
  patientName: string;
  encounterNo: string;
  receiptNo?: string;
  sourceType: string;
  title: string;
  amount: number;
  method?: string;
  type: string;
}

interface ReportDoctor {
  _id: string;
  userId: string;
  name: string;
}

@Component({
  selector: 'app-department-performance-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HmsDocumentToolbarComponent],
  templateUrl: './department-performance-page.component.html',
  styleUrl: './accounts-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentPerformancePageComponent implements OnInit {
  loading = false;
  fromDate = '';
  toDate = '';
  activeDatePreset: 'today' | 'week' | 'month' | 'year' | 'custom' = 'month';
  selectedDepartmentId = '';
  selectedDoctorId = '';
  encounterType = '';
  sourceType = '';
  paymentStatus = '';
  detailTab: 'overview' | 'doctors' | 'services' | 'transactions' = 'overview';

  kpis: Record<string, number> = {};
  departments: DeptRow[] = [];
  doctors: DoctorRow[] = [];
  transactions: TransactionRow[] = [];
  reportDoctors: ReportDoctor[] = [];
  selectedDepartment: DeptRow | null = null;

  readonly accountsNav = [
    { label: 'Dashboard', route: 'dashboard' },
    { label: 'CoA', route: 'chart-of-accounts' },
    { label: 'GL', route: 'general-ledger' },
    { label: 'Collections', route: 'daily-collections' },
    { label: 'Doctor Report', route: 'doctor-performance' },
    { label: 'Department Report', route: 'department-performance' },
    { label: 'Patient Profitability', route: 'patient-profitability' },
    { label: 'Trial Balance', route: 'trial-balance' },
    { label: 'P&L', route: 'profit-loss' },
  ];

  readonly sourceTypes = ['', 'appointment', 'lab', 'pharmacy', 'bed', 'doctor', 'procedure', 'ward'];
  readonly encounterTypes = [
    { value: '', label: 'All encounters' },
    { value: 'opd', label: 'OPD' },
    { value: 'ipd', label: 'IPD / Admission' },
  ];
  readonly paymentStatuses = [
    { value: '', label: 'All payment status' },
    { value: 'paid', label: 'Fully paid' },
    { value: 'partial', label: 'Partially paid' },
    { value: 'outstanding', label: 'Outstanding' },
  ];

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.applyDatePreset('month', false);
    this.loadReportDoctors();
    this.load();
  }

  isNavActive(route: string): boolean {
    return route === 'department-performance';
  }

  applyDatePreset(preset: 'today' | 'week' | 'month' | 'year', reload = true): void {
    this.activeDatePreset = preset;
    const today = new Date();
    const end = todayYmd();
    let start = end;
    if (preset === 'week') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      start = toCalendarYmd(weekStart);
    } else if (preset === 'month') {
      start = toCalendarYmd(new Date(today.getFullYear(), today.getMonth(), 1));
    } else if (preset === 'year') {
      start = toCalendarYmd(new Date(today.getFullYear(), 0, 1));
    }
    this.fromDate = start;
    this.toDate = end;
    if (reload) this.load();
  }

  onManualDateChange(): void {
    this.activeDatePreset = 'custom';
  }

  setDetailTab(tab: 'overview' | 'doctors' | 'services' | 'transactions'): void {
    this.detailTab = tab;
    this.cdr.markForCheck();
  }

  loadReportDoctors(): void {
    this.backend.getReportDoctors().subscribe({
      next: (items) => {
        this.reportDoctors = (items || []).map((item) => ({
          _id: String(item['_id'] || ''),
          userId: String(item['userId'] || item['_id'] || ''),
          name: String(item['name'] || ''),
        }));
        this.cdr.markForCheck();
      },
    });
  }

  load(): void {
    this.loading = true;
    this.cdr.markForCheck();
    const params: Record<string, unknown> = {};
    if (this.fromDate) params['fromDate'] = this.fromDate;
    if (this.toDate) params['toDate'] = this.toDate;
    if (this.selectedDepartmentId) params['departmentId'] = this.selectedDepartmentId;
    if (this.selectedDoctorId) params['doctorId'] = this.selectedDoctorId;
    if (this.encounterType) params['encounterType'] = this.encounterType;
    if (this.sourceType) params['sourceType'] = this.sourceType;
    if (this.paymentStatus) params['paymentStatus'] = this.paymentStatus;

    this.backend.getDepartmentPerformance(params).subscribe({
      next: (result) => {
        const data = (result || {}) as Record<string, unknown>;
        this.kpis = (data['kpis'] || {}) as Record<string, number>;
        this.departments = (Array.isArray(data['departments']) ? data['departments'] : []) as DeptRow[];
        this.doctors = (Array.isArray(data['doctors']) ? data['doctors'] : []) as DoctorRow[];
        this.transactions = (Array.isArray(data['transactions']) ? data['transactions'] : []) as TransactionRow[];
        this.selectedDepartment = this.departments[0] || null;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error: { error?: { message?: string } }) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.toastr.error(error?.error?.message || 'Unable to load department performance');
      },
    });
  }

  selectDepartment(row: DeptRow): void {
    this.selectedDepartment = row;
    this.cdr.markForCheck();
  }

  serviceAmount(key: string): number {
    return Number(this.selectedDepartment?.services?.[key] || 0);
  }

  money(value: unknown): string {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed.toLocaleString('en-PK') : '0';
  }

  buildDepartmentPerformanceDocumentHtml = (): string =>
    buildAccountsReportDocumentHtml({
      title: 'Department Performance',
      hospital: readStoredHospitalDocumentInfo(),
      fromDate: this.fromDate,
      toDate: this.toDate,
      generatedBy: readCurrentUserName(),
      orientation: 'landscape',
      summaryCards: [
        { label: 'Patients', value: String(this.kpis['patients'] || 0) },
        { label: 'Encounters', value: String(this.kpis['encounters'] || 0) },
        { label: 'Revenue', value: formatHmsMoney(this.kpis['revenue']) },
        { label: 'Collections', value: formatHmsMoney(this.kpis['collections']) },
      ],
      columns: [
        { keys: ['departmentName', 'name'], label: 'Department' },
        { keys: ['patients'], label: 'Patients', numeric: true },
        { keys: ['encounters'], label: 'Encounters', numeric: true },
        { keys: ['revenue'], label: 'Revenue', numeric: true },
        { keys: ['collections'], label: 'Collections', numeric: true },
        { keys: ['outstanding'], label: 'Outstanding', numeric: true },
      ],
      rows: this.departments as unknown as Array<Record<string, unknown>>,
    });

  exportExcel(): void {
    if (!this.departments.length) {
      this.toastr.warning('No department rows to export');
      return;
    }

    downloadExcelWorkbook(`department-performance-${this.fromDate}-${this.toDate}`, [
      {
        name: 'Summary',
        columns: [
          { header: 'Metric', key: 'metric' },
          { header: 'Value', key: 'value' },
        ],
        rows: [
          { metric: 'Patients', value: this.kpis['patients'] || 0 },
          { metric: 'Encounters', value: this.kpis['encounters'] || 0 },
          { metric: 'Appointments', value: this.kpis['appointments'] || 0 },
          { metric: 'Admissions', value: this.kpis['admissions'] || 0 },
          { metric: 'Gross Charges', value: this.kpis['grossCharges'] || 0 },
          { metric: 'Collected', value: this.kpis['collected'] || 0 },
          { metric: 'Outstanding', value: this.kpis['outstanding'] || 0 },
          { metric: 'Known Direct Cost', value: this.kpis['knownDirectCost'] || 0 },
          { metric: 'Gross Contribution', value: this.kpis['grossContribution'] || 0 },
        ],
      },
      {
        name: 'Departments',
        columns: [
          { header: 'Department', key: 'departmentName' },
          { header: 'Code', key: 'departmentCode' },
          { header: 'Patients', key: 'patients' },
          { header: 'Appointments', key: 'appointments' },
          { header: 'Admissions', key: 'admissions' },
          { header: 'Consultations', key: 'consultations' },
          { header: 'Procedures', key: 'procedures' },
          { header: 'Gross Charges', key: 'grossCharges' },
          { header: 'Collected', key: 'collected' },
          { header: 'Outstanding', key: 'outstanding' },
          { header: 'Known Direct Cost', key: 'knownDirectCost' },
          { header: 'Gross Contribution', key: 'grossContribution' },
        ],
        rows: this.departments,
      },
      {
        name: 'Doctors',
        columns: [
          { header: 'Doctor', key: 'doctorName' },
          { header: 'Department', key: 'departmentName' },
          { header: 'Patients', key: 'patients' },
          { header: 'Consultations', key: 'consultations' },
          { header: 'Procedures', key: 'procedures' },
          { header: 'Admissions', key: 'admissions' },
          { header: 'Gross Charges', key: 'grossCharges' },
          { header: 'Collected', key: 'collected' },
          { header: 'Outstanding', key: 'outstanding' },
          { header: 'Known Direct Cost', key: 'knownDirectCost' },
          { header: 'Gross Contribution', key: 'grossContribution' },
        ],
        rows: this.doctors,
      },
      {
        name: 'Transactions',
        columns: [
          { header: 'Date', key: 'date' },
          { header: 'Type', key: 'type' },
          { header: 'Department', key: 'departmentName' },
          { header: 'Doctor', key: 'doctorName' },
          { header: 'MR No', key: 'patientNo' },
          { header: 'Patient', key: 'patientName' },
          { header: 'Encounter No', key: 'encounterNo' },
          { header: 'Receipt No', key: 'receiptNo' },
          { header: 'Source', key: 'sourceType' },
          { header: 'Description', key: 'title' },
          { header: 'Amount', key: 'amount' },
          { header: 'Method', key: 'method' },
        ],
        rows: this.transactions.map((row) => ({
          ...row,
          date: row.date ? new Date(row.date).toISOString().slice(0, 10) : '',
          receiptNo: row.receiptNo || '',
          method: row.method || '',
        })),
      },
      {
        name: 'Services',
        columns: [
          { header: 'Department', key: 'departmentName' },
          { header: 'Consultation', key: 'consultation' },
          { header: 'Lab', key: 'lab' },
          { header: 'Pharmacy', key: 'pharmacy' },
          { header: 'Bed', key: 'bed' },
          { header: 'Doctor Visit', key: 'doctor' },
          { header: 'Procedure', key: 'procedure' },
          { header: 'Ward', key: 'ward' },
          { header: 'Other', key: 'other' },
        ],
        rows: this.departments.map((row) => ({
          departmentName: row.departmentName,
          consultation: row.services?.['consultation'] || 0,
          lab: row.services?.['lab'] || 0,
          pharmacy: row.services?.['pharmacy'] || 0,
          bed: row.services?.['bed'] || 0,
          doctor: row.services?.['doctor'] || 0,
          procedure: row.services?.['procedure'] || 0,
          ward: row.services?.['ward'] || 0,
          other: row.services?.['other'] || 0,
        })),
      },
    ]);
  }
}

import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { readStoredPermissions } from '../../auth/access-control';
import { AuditLog, Hospital, User } from '../../../shared/models/hospital.model';

const MODULE_OPTIONS = [
  { value: '', label: 'All modules' },
  { value: 'bills', label: 'Bills' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'prescriptions', label: 'Prescriptions' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'encounters', label: 'Encounters' },
  { value: 'ledger', label: 'Ledger / Payments' },
  { value: 'room_allotments', label: 'Room Allotments' },
  { value: 'ward', label: 'Ward' },
  { value: 'sales', label: 'Pharmacy Sales' },
  { value: 'purchases', label: 'Purchases' },
  { value: 'transfers', label: 'Stock Transfers' },
  { value: 'returns', label: 'Returns' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'payments', label: 'Pharmacy Payments' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'BILL_CREATED', label: 'Bill created' },
  { value: 'BILL_PAYMENT_UPDATED', label: 'Bill payment updated' },
  { value: 'DISCOUNT_APPLIED', label: 'Discount applied' },
  { value: 'LAB_TEST_CANCELLED', label: 'Lab test cancelled' },
  { value: 'LAB_REPORT_VERIFIED', label: 'Lab report verified' },
  { value: 'PRESCRIPTION_CREATED', label: 'Prescription created' },
  { value: 'PRESCRIPTION_UPDATED', label: 'Prescription updated' },
  { value: 'PRESCRIPTION_DELETED', label: 'Prescription deleted' },
  { value: 'APPOINTMENT_CREATED', label: 'Appointment created' },
  { value: 'APPOINTMENT_UPDATED', label: 'Appointment updated' },
  { value: 'APPOINTMENT_STATUS_UPDATED', label: 'Appointment status updated' },
  { value: 'APPOINTMENT_DELETED', label: 'Appointment deleted' },
  { value: 'PATIENT_DISCHARGED', label: 'Patient discharged' },
  { value: 'LEDGER_ITEM_CANCELLED', label: 'Ledger item cancelled' },
  { value: 'LEDGER_PAYMENT_RECORDED', label: 'Payment recorded' },
  { value: 'LEDGER_PAYMENT_DELETED', label: 'Payment deleted' },
  { value: 'LEDGER_ITEM_CREATED', label: 'Ledger item created' },
  { value: 'WARD_VITALS_RECORDED', label: 'Ward vitals recorded' },
  { value: 'WARD_MAR_RECORDED', label: 'MAR recorded' },
  { value: 'WARD_IO_RECORDED', label: 'I/O recorded' },
  { value: 'WARD_PATIENT_TRANSFERRED', label: 'Patient transferred' },
  { value: 'WARD_DRIP_UPDATED', label: 'Ward drip updated' },
  { value: 'WARD_MEDICINE_ISSUED', label: 'Medicine issued' },
  { value: 'SALE_CREATED', label: 'Sale created' },
  { value: 'SALE_RETURNED', label: 'Sale returned' },
  { value: 'PURCHASE_CREATED', label: 'Purchase created' },
  { value: 'PURCHASE_RECEIVED', label: 'Purchase received' },
  { value: 'EXPENSE_CREATED', label: 'Expense created' },
];

const CRITICAL_ACTION_TOKENS = ['DELETE', 'CANCEL', 'DISCHARGE', 'DISCOUNT', 'RETURN'];

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, JsonPipe],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.scss',
})
export class AuditLogsComponent implements OnInit {
  readonly moduleOptions = MODULE_OPTIONS;
  readonly actionOptions = ACTION_OPTIONS;
  readonly pageSize = 15;

  logs: AuditLog[] = [];
  users: User[] = [];
  hospitals: Hospital[] = [];
  loading = false;
  detailLoading = false;
  detailOpen = false;
  selectedLog: AuditLog | null = null;
  filtersOpen = false;

  moduleFilter = '';
  actionFilter = '';
  userIdFilter = '';
  hospitalIdFilter = '';
  fromDate = '';
  toDate = '';
  page = 1;
  totalPages = 1;
  totalItems = 0;

  canFilterByHospital = false;
  canFilterByUser = false;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const permissions = readStoredPermissions();
    this.canFilterByHospital = permissions.includes('*');
    this.canFilterByUser = this.backend.hasPermission('users.read');
    this.setDefaultDateRange();
    this.loadHospitals();
    this.loadUsers();
    this.loadLogs();
  }

  get kpiTotalEvents(): number {
    return this.totalItems || this.logs.length;
  }

  get kpiTodayEvents(): number {
    const todayKey = this.localDateKey(new Date());
    return this.logs.filter((log) => log.createdAt && this.localDateKey(new Date(log.createdAt)) === todayKey).length;
  }

  get kpiUniqueUsers(): number {
    const ids = new Set(
      this.logs
        .map((log) => log.userId || log.user?._id || log.user?.email || this.userName(log))
        .filter((value) => !!value && value !== '—')
    );
    return ids.size;
  }

  get kpiCriticalActions(): number {
    return this.logs.filter((log) => this.isCriticalAction(log.action)).length;
  }

  get pageNumbers(): number[] {
    const maxButtons = 7;
    if (this.totalPages <= maxButtons) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    const pages = new Set<number>([1, this.totalPages, this.page]);
    for (let offset = 1; pages.size < maxButtons - 1; offset++) {
      if (this.page - offset > 1) pages.add(this.page - offset);
      if (this.page + offset < this.totalPages) pages.add(this.page + offset);
      if (pages.size >= maxButtons) break;
    }

    return Array.from(pages).sort((a, b) => a - b);
  }

  private setDefaultDateRange(): void {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 30);
    this.toDate = this.formatDateInput(today);
    this.fromDate = this.formatDateInput(from);
  }

  private formatDateInput(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private localDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private isCriticalAction(action: string): boolean {
    const normalized = String(action || '').toUpperCase();
    return CRITICAL_ACTION_TOKENS.some((token) => normalized.includes(token));
  }

  loadHospitals(): void {
    if (!this.canFilterByHospital) {
      return;
    }

    this.backend.getHospitals({ limit: 100 }).subscribe({
      next: (result) => {
        this.hospitals = result.items || [];
      },
      error: () => {
        this.hospitals = [];
      },
    });
  }

  loadUsers(): void {
    if (!this.canFilterByUser) {
      this.users = [];
      return;
    }

    this.backend.getUsers({ limit: 200 }).subscribe({
      next: (users) => {
        this.users = users || [];
      },
      error: () => {
        this.users = [];
      },
    });
  }

  loadLogs(page = 1): void {
    this.loading = true;
    this.page = page;

    this.backend
      .getAuditLogs({
        page,
        limit: this.pageSize,
        module: this.moduleFilter || undefined,
        action: this.actionFilter || undefined,
        userId: this.userIdFilter || undefined,
        hospitalId: this.canFilterByHospital ? this.hospitalIdFilter || undefined : undefined,
        fromDate: this.fromDate ? new Date(`${this.fromDate}T00:00:00`).toISOString() : undefined,
        toDate: this.toDate ? new Date(`${this.toDate}T23:59:59`).toISOString() : undefined,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.logs = result.items || [];
          this.totalPages = result.pagination?.totalPages || 1;
          this.totalItems = result.pagination?.total ?? this.logs.length;
        },
        error: (err) => {
          this.logs = [];
          this.totalItems = 0;
          this.toastr.error(err?.error?.message || 'Unable to load audit logs.');
        },
      });
  }

  applyFilters(): void {
    this.loadLogs(1);
  }

  resetFilters(): void {
    this.moduleFilter = '';
    this.actionFilter = '';
    this.userIdFilter = '';
    this.hospitalIdFilter = '';
    this.setDefaultDateRange();
    this.loadLogs(1);
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  exportCsv(): void {
    if (!this.logs.length) {
      this.toastr.info('No rows on this page to export.');
      return;
    }

    const headers = ['Date & Time', 'User', 'Email', 'Module', 'Action', 'Summary'];
    if (this.canFilterByHospital) {
      headers.splice(3, 0, 'Hospital');
    }

    const rows = this.logs.map((log) => {
      const base = [
        log.createdAt ? new Date(log.createdAt).toLocaleString() : '',
        this.userName(log),
        log.user?.email || '',
        this.moduleLabel(log.module),
        this.actionLabel(log.action),
        log.summary || '',
      ];
      if (this.canFilterByHospital) {
        base.splice(3, 0, this.hospitalName(log));
      }
      return base;
    });

    const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-page-${this.page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  userName(log: AuditLog): string {
    return log.user?.name || this.users.find((user) => user._id === log.userId)?.name || log.userId || '—';
  }

  userEmail(log: AuditLog): string {
    return log.user?.email || this.users.find((user) => user._id === log.userId)?.email || '';
  }

  hospitalName(log: AuditLog): string {
    return log.hospital?.name || this.hospitals.find((hospital) => hospital._id === log.hospitalId)?.name || '—';
  }

  actionLabel(action: string): string {
    const known = this.actionOptions.find((option) => option.value === action)?.label;
    if (known) return known;

    return String(action || '')
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || '—';
  }

  moduleLabel(module: string): string {
    return this.moduleOptions.find((option) => option.value === module)?.label || module || '—';
  }

  actionBadgeClass(action: string): string {
    const normalized = String(action || '').toUpperCase();

    if (normalized.includes('DELETE') || normalized.includes('CANCEL') || normalized.includes('RETURN')) {
      return 'badge-delete';
    }

    if (normalized.includes('DISCOUNT')) {
      return 'badge-discount';
    }

    if (normalized.includes('DISCHARGED') || normalized.includes('DISCHARGE')) {
      return 'badge-discharge';
    }

    if (normalized.includes('TRANSFER')) {
      return 'badge-transfer';
    }

    if (normalized.includes('MEDICINE') || normalized.includes('MAR') || normalized.includes('ISSUED')) {
      return 'badge-medicine';
    }

    if (normalized.includes('CREATED') || normalized.includes('RECORDED') || normalized.includes('VERIFIED')) {
      return 'badge-create';
    }

    if (normalized.includes('UPDATED') || normalized.includes('EDIT') || normalized.includes('DRIP')) {
      return 'badge-update';
    }

    return 'badge-default';
  }

  openDetail(log: AuditLog): void {
    this.detailOpen = true;
    this.detailLoading = true;
    this.selectedLog = null;

    this.backend
      .getAuditLogById(log._id)
      .pipe(finalize(() => (this.detailLoading = false)))
      .subscribe({
        next: (detail) => {
          this.selectedLog = detail;
        },
        error: (err) => {
          this.detailOpen = false;
          this.toastr.error(err?.error?.message || 'Unable to load audit log detail.');
        },
      });
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.selectedLog = null;
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages || nextPage === this.page) {
      return;
    }

    this.loadLogs(nextPage);
  }

  showPageEllipsis(index: number): boolean {
    if (index === 0) return false;
    return this.pageNumbers[index] - this.pageNumbers[index - 1] > 1;
  }
}

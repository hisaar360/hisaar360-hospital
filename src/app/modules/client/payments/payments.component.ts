import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { PatientPaymentSummary } from '../../../shared/models/hospital.model';
import { PatientPaymentDetailModalComponent } from './patient-payment-detail-modal/patient-payment-detail-modal.component';

export type PaymentStatusFilter = 'all' | 'partial' | 'paid' | 'overdue';

@Component({
  selector: 'app-payments',
  imports: [CommonModule, FormsModule, RouterLink, PatientPaymentDetailModalComponent],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss',
})
export class PaymentsComponent implements OnInit {
  summaries: PatientPaymentSummary[] = [];
  loading = false;
  search = '';
  hasBalanceOnly = false;
  statusFilter: PaymentStatusFilter = 'all';
  page = 1;
  limit = 15;
  totalPages = 0;
  totalItems = 0;

  modalOpen = false;
  selectedPatientId: string | null = null;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadSummaries();
  }

  get filteredSummaries(): PatientPaymentSummary[] {
    if (this.statusFilter === 'all') {
      return this.summaries;
    }
    return this.summaries.filter((summary) => this.paymentStatus(summary) === this.statusFilter);
  }

  get kpiTotalPatients(): number {
    return this.totalItems || this.summaries.length;
  }

  get kpiOutstanding(): number {
    return this.summaries.reduce((sum, item) => sum + Math.max(item.balance || 0, 0), 0);
  }

  get kpiPaidOnPage(): number {
    return this.summaries.reduce((sum, item) => sum + (item.totalPaid || 0), 0);
  }

  get kpiPartialCount(): number {
    return this.summaries.filter((item) => this.paymentStatus(item) === 'partial').length;
  }

  loadSummaries(): void {
    this.loading = true;
    this.backend
      .getPatientPaymentSummaries({
        page: this.page,
        limit: this.limit,
        search: this.search.trim() || undefined,
        hasBalance: this.hasBalanceOnly ? 'true' : undefined,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.summaries = result.items;
          this.totalPages = result.pagination.totalPages;
          this.totalItems = result.pagination.total;
        },
        error: (err) => {
          this.summaries = [];
          this.totalItems = 0;
          this.toastr.error(err?.error?.message || 'Unable to load patient payments');
        },
      });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadSummaries();
  }

  resetFilters(): void {
    this.search = '';
    this.hasBalanceOnly = false;
    this.statusFilter = 'all';
    this.page = 1;
    this.loadSummaries();
  }

  setStatusFilter(filter: PaymentStatusFilter): void {
    this.statusFilter = filter;
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || (this.totalPages > 0 && nextPage > this.totalPages)) {
      return;
    }

    this.page = nextPage;
    this.loadSummaries();
  }

  openDetail(summary: PatientPaymentSummary): void {
    this.selectedPatientId = summary.patient._id;
    this.modalOpen = true;
  }

  closeDetail(): void {
    this.modalOpen = false;
    this.selectedPatientId = null;
  }

  onPaymentSaved(): void {
    this.loadSummaries();
  }

  patientName(summary: PatientPaymentSummary): string {
    const patient = summary.patient;
    return [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() || patient.patientNo || 'Patient';
  }

  patientInitials(summary: PatientPaymentSummary): string {
    const patient = summary.patient;
    const first = (patient.firstName || '').trim().charAt(0);
    const last = (patient.lastName || '').trim().charAt(0);
    const initials = `${first}${last}`.toUpperCase();
    if (initials) {
      return initials;
    }
    return (patient.patientNo || 'P').slice(0, 2).toUpperCase();
  }

  paymentStatus(summary: PatientPaymentSummary): 'paid' | 'partial' | 'overdue' {
    if (summary.balance <= 0 && summary.netPayable > 0) {
      return 'paid';
    }
    if (summary.totalPaid > 0 && summary.balance > 0) {
      return 'partial';
    }
    if (summary.balance > 0) {
      return 'overdue';
    }
    return 'paid';
  }

  statusLabel(summary: PatientPaymentSummary): string {
    const status = this.paymentStatus(summary);
    if (status === 'paid') return 'Paid';
    if (status === 'partial') return 'Partial';
    return 'Overdue';
  }

  actionLabel(summary: PatientPaymentSummary): string {
    return summary.balance > 0 ? 'View & Collect' : 'View';
  }

  pageRangeLabel(): string {
    if (!this.filteredSummaries.length) {
      return '0 entries';
    }
    const start = (this.page - 1) * this.limit + 1;
    const end = start + this.filteredSummaries.length - 1;
    const total = this.totalItems || this.filteredSummaries.length;
    return `${start} to ${end} of ${total} entries`;
  }
}

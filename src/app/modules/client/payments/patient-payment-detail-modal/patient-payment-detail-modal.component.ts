import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../../core/services/backend.service';
import { HmsDocumentService } from '../../../../core/services/hms-document.service';
import { buildPaymentReceiptDocumentHtml } from '../../../../core/documents/patient-ledger-document.builder';
import { readCurrentUserName, readStoredHospitalDocumentInfo } from '../../../../core/utils/hms-document-context.util';
import { HmsDocumentToolbarComponent } from '../../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';
import {
  LedgerPayment,
  PatientPaymentDetail,
  PatientPaymentDetailPayment,
  PatientPaymentSourceSummary,
} from '../../../../shared/models/hospital.model';

@Component({
  selector: 'app-patient-payment-detail-modal',
  imports: [CommonModule, FormsModule, HmsDocumentToolbarComponent],
  templateUrl: './patient-payment-detail-modal.component.html',
  styleUrl: './patient-payment-detail-modal.component.scss',
})
export class PatientPaymentDetailModalComponent implements OnChanges {
  @Input() open = false;
  @Input() patientId: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  detail: PatientPaymentDetail | null = null;
  loading = false;
  saving = false;
  pdfLoading = false;

  discountAmount = 0;
  collectAmount = 0;
  paymentMethod = 'cash';
  paymentType: 'partial' | 'final' | 'advance' = 'partial';
  paymentNote = '';
  selectedReceiptPayment: PatientPaymentDetailPayment | null = null;

  constructor(
    private backend: BackendService,
    private docs: HmsDocumentService,
    private toastr: ToastrService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['open'] || changes['patientId']) && this.open && this.patientId) {
      this.loadDetail();
    }

    if (changes['open'] && !this.open) {
      this.resetForm();
    }
  }

  loadDetail(): void {
    if (!this.patientId) {
      return;
    }

    this.loading = true;
    this.backend
      .getPatientPaymentDetail(this.patientId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (detail) => {
          this.detail = detail;
          this.collectAmount = this.outstandingBalance();
          this.discountAmount = 0;
          this.selectedReceiptPayment = this.pickMostRecentPayment(detail.payments || []);
        },
        error: (err: { error?: { message?: string } }) =>
          this.toastr.error(err?.error?.message || 'Unable to load payment details'),
      });
  }

  close(): void {
    this.closed.emit();
  }

  canCollect(): boolean {
    return !!this.detail?.primaryEncounterId && this.outstandingBalance() > 0;
  }

  modalTitle(): string {
    return this.canCollect() ? 'Collect Payment' : 'Patient Payment';
  }

  outstandingBalance(): number {
    if (!this.detail) {
      return 0;
    }
    const totals = this.detail.totals;
    if (typeof totals.outstandingBalance === 'number') {
      return Math.max(0, totals.outstandingBalance);
    }
    return Math.max(0, totals.balance || 0);
  }

  creditBalance(): number {
    if (!this.detail) {
      return 0;
    }
    const totals = this.detail.totals;
    if (typeof totals.advanceCreditBalance === 'number') {
      return Math.max(0, totals.advanceCreditBalance);
    }
    return totals.balance < 0 ? Math.abs(totals.balance) : 0;
  }

  securityHeld(): number {
    return Math.max(0, this.detail?.totals.securityDepositHeld || 0);
  }

  patientName(): string {
    if (!this.detail?.patient) {
      return 'Patient';
    }

    const patient = this.detail.patient;
    return [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() || patient.patientNo || 'Patient';
  }

  patientInitials(): string {
    if (!this.detail?.patient) {
      return 'P';
    }
    const patient = this.detail.patient;
    const first = (patient.firstName || '').trim().charAt(0);
    const last = (patient.lastName || '').trim().charAt(0);
    const initials = `${first}${last}`.toUpperCase();
    return initials || (patient.patientNo || 'P').slice(0, 2).toUpperCase();
  }

  remainingSources(): PatientPaymentSourceSummary[] {
    return Object.values(this.detail?.remainingBySource || {})
      .filter((item) => (item.remaining || 0) > 0)
      .sort((a, b) => (b.remaining || 0) - (a.remaining || 0));
  }

  paymentStatus(): 'paid' | 'partial' | 'overdue' {
    if (!this.detail) {
      return 'overdue';
    }

    const outstanding = this.outstandingBalance();
    const { netPayable, totalPaid } = this.detail.totals;
    if (outstanding <= 0 && netPayable > 0) {
      return 'paid';
    }
    if (totalPaid > 0 && outstanding > 0) {
      return 'partial';
    }
    if (outstanding > 0) {
      return 'overdue';
    }
    return 'paid';
  }

  statusLabel(): string {
    const status = this.paymentStatus();
    if (status === 'paid') return 'Paid';
    if (status === 'partial') return 'Partial';
    return 'Overdue';
  }

  printSelectedReceipt(): void {
    const html = this.buildPaymentReceiptHtml();
    if (!html.trim()) {
      this.toastr.error('Select a payment receipt first');
      return;
    }
    this.docs.printHtml(html, 'Payment Receipt');
  }

  async downloadSelectedReceipt(): Promise<void> {
    const html = this.buildPaymentReceiptHtml();
    if (!html.trim() || !this.selectedReceiptPayment) {
      this.toastr.error('Select a payment receipt first');
      return;
    }
    this.pdfLoading = true;
    try {
      await this.docs.downloadPdf(html, `${this.selectedReceiptPayment.paymentNo}.pdf`);
    } catch {
      this.toastr.error('Unable to generate PDF.');
    } finally {
      this.pdfLoading = false;
    }
  }

  projectedBalance(): number {
    if (!this.detail) {
      return 0;
    }

    return Math.max(
      this.outstandingBalance() - Number(this.discountAmount || 0) - Number(this.collectAmount || 0),
      0
    );
  }

  fillRemaining(): void {
    if (!this.detail) {
      return;
    }

    const afterDiscount = Math.max(this.outstandingBalance() - Number(this.discountAmount || 0), 0);
    this.collectAmount = afterDiscount;
    this.paymentType = afterDiscount === this.outstandingBalance() ? 'final' : 'partial';
  }

  collectPayment(): void {
    if (!this.detail?.primaryEncounterId) {
      this.toastr.error('No open encounter found for this patient');
      return;
    }

    const discount = Number(this.discountAmount || 0);
    const amount = Number(this.collectAmount || 0);
    const outstanding = this.outstandingBalance();

    if (discount <= 0 && amount <= 0) {
      this.toastr.error('Enter discount or collect amount');
      return;
    }

    if (discount > 0 && discount > outstanding) {
      this.toastr.error('Discount cannot be greater than remaining balance');
      return;
    }

    if (amount > 0) {
      const maxCollect = Math.max(outstanding - discount, 0);
      if (amount > maxCollect) {
        this.toastr.error('Collect amount is greater than remaining balance');
        return;
      }
    }

    this.saving = true;
    const encounterId = this.detail.primaryEncounterId;

    const completeSuccess = (): void => {
      this.toastr.success('Payment updated successfully');
      this.saved.emit();
      this.loadDetail();
    };

    const runPayment = (): void => {
      if (amount <= 0) {
        this.saving = false;
        completeSuccess();
        return;
      }

      this.backend
        .recordEncounterPayment(encounterId, {
          amount,
          method: this.paymentMethod,
          type: this.paymentType,
          note: this.paymentNote,
        })
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: () => completeSuccess(),
          error: (err: { error?: { message?: string } }) =>
            this.toastr.error(err?.error?.message || 'Unable to collect payment'),
        });
    };

    if (discount > 0) {
      this.backend
        .applyEncounterDiscount(encounterId, {
          amount: discount,
          note: this.paymentNote || 'Payment discount',
        })
        .subscribe({
          next: () => runPayment(),
          error: (err: { error?: { message?: string } }) => {
            this.saving = false;
            this.toastr.error(err?.error?.message || 'Unable to apply discount');
          },
        });
      return;
    }

    runPayment();
  }

  selectReceiptPayment(payment: PatientPaymentDetailPayment): void {
    this.selectedReceiptPayment = payment;
  }

  isReceiptSelected(payment: PatientPaymentDetailPayment): boolean {
    return this.selectedReceiptPayment?._id === payment._id;
  }

  buildPaymentReceiptHtml = (): string => {
    if (!this.detail || !this.selectedReceiptPayment) return '';
    const encounter =
      this.detail.encounters.find((item) => item._id === this.selectedReceiptPayment?.encounterId) ||
      this.detail.encounters.find((item) => item._id === this.detail?.primaryEncounterId);
    return buildPaymentReceiptDocumentHtml({
      payment: this.selectedReceiptPayment as unknown as LedgerPayment,
      patient: this.detail.patient,
      encounterNo: encounter?.encounterNo || this.selectedReceiptPayment.encounterId || '—',
      hospital: readStoredHospitalDocumentInfo(),
      generatedBy: readCurrentUserName(),
      receivedBy: readCurrentUserName(),
    });
  };

  sourceLabel(sourceType: string): string {
    const map: Record<string, string> = {
      appointment: 'Appointment',
      lab: 'Laboratory',
      bed: 'Room / Bed',
      ward: 'Ward',
      pharmacy: 'Pharmacy',
      doctor: 'Doctor',
      procedure: 'Procedure',
      nursing: 'Nursing',
      manual: 'Manual',
      misc: 'Other',
    };
    return map[sourceType] || sourceType;
  }

  private pickMostRecentPayment(
    payments: PatientPaymentDetailPayment[]
  ): PatientPaymentDetailPayment | null {
    if (!payments.length) {
      return null;
    }
    // API returns newest-first; also defend against unsorted payloads
    return [...payments].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    })[0];
  }

  private resetForm(): void {
    this.detail = null;
    this.discountAmount = 0;
    this.collectAmount = 0;
    this.paymentMethod = 'cash';
    this.paymentType = 'partial';
    this.paymentNote = '';
    this.selectedReceiptPayment = null;
  }
}

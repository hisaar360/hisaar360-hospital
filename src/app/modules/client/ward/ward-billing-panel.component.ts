import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { buildDischargeStatementDocumentHtml, buildRunningBillDocumentHtml } from '../../../core/documents/discharge-document.builder';
import { readCurrentUserName, readStoredHospitalDocumentInfo } from '../../../core/utils/hms-document-context.util';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';

@Component({
  selector: 'app-ward-billing-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, HmsDocumentToolbarComponent],
  templateUrl: './ward-billing-panel.component.html',
  styleUrl: './ward-billing-panel.component.scss',
})
export class WardBillingPanelComponent implements OnChanges {
  @Input() admissionId = '';
  @Input() mode: 'billing' | 'payments' | 'settlement' | 'medicines' | 'doctor-visits' | 'procedures' | 'operations' | 'discharge' = 'billing';

  loading = false;
  billData: Record<string, unknown> = {};
  dischargeData: Record<string, unknown> = {};
  chargeForm = { title: '', rate: 0, category: 'misc' };
  paymentForm = { amount: 0, method: 'cash', type: 'partial', note: '' };
  securityForm = { amount: 0, method: 'cash', note: 'Admission security deposit' };
  visitForm = { doctorId: '', visitType: 'regular_round', fee: 0, chargeable: true, clinicalNote: '' };
  medicineForm = { productId: '', requestedQty: 1, notes: '' };
  procedureForm = { procedureName: '', procedureType: '', doctorId: '', rate: 0, qty: 1, notes: '' };
  operationForm = { operationName: '', surgeonId: '', baseCharge: 0, otRoom: '', clinicalNote: '' };
  doctorVisits: Array<Record<string, unknown>> = [];
  medicineRequests: Array<Record<string, unknown>> = [];
  procedures: Array<Record<string, unknown>> = [];
  operations: Array<Record<string, unknown>> = [];

  constructor(private backend: BackendService, private toastr: ToastrService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['admissionId']?.currentValue || changes['mode']?.currentValue) {
      this.load();
    }
  }

  get summary(): Record<string, unknown> {
    return (this.billData['billingSummary'] as Record<string, unknown>) || {};
  }

  get ledgerItems(): Array<Record<string, unknown>> {
    const ledger = (this.billData['ledger'] as Record<string, unknown>) || {};
    return (ledger['items'] as Array<Record<string, unknown>>) || [];
  }

  get ledgerPayments(): Array<Record<string, unknown>> {
    const ledger = (this.billData['ledger'] as Record<string, unknown>) || {};
    return (ledger['payments'] as Array<Record<string, unknown>>) || [];
  }

  get settlements(): Array<Record<string, unknown>> {
    return (this.billData['settlements'] as Array<Record<string, unknown>>) || [];
  }

  get dischargeStatement(): Record<string, unknown> {
    return (this.dischargeData['dischargeStatement'] as Record<string, unknown>) || {};
  }

  buildRunningBillDocument = (): string => {
    const admission = (this.billData['admission'] as Record<string, unknown>) || {};
    const patient = (admission['patient'] as Record<string, unknown>) || null;
    return buildRunningBillDocumentHtml({
      patient: patient as { firstName?: string; lastName?: string; patientNo?: string },
      admissionNo: String(admission['admissionNo'] || ''),
      encounterNo: String((this.billData['encounter'] as Record<string, unknown> | undefined)?.['encounterNo'] || ''),
      wardLabel: String(admission['wardLabel'] || admission['roomType'] || ''),
      roomBed: String(admission['bedLabel'] || ''),
      admittedAt: String(admission['admittedAt'] || ''),
      chargeBreakdown: (this.billData['chargeBreakdown'] as Record<string, number>) || {},
      summary: {
        totalCharges: Number(this.summary['totalCharges'] || 0),
        totalDiscount: Number(this.summary['totalDiscount'] || 0),
        netPayable: Number(this.summary['netPayable'] || 0),
        totalPaid: Number(this.summary['totalPaid'] || 0),
        totalRefunded: Number(this.summary['totalRefunded'] || 0),
        balance: Number(this.summary['outstandingBalance'] || this.summary['balance'] || 0),
        securityDepositHeld: Number(this.summary['securityDepositHeld'] || 0),
        securityDepositApplied: Number(this.summary['securityDepositApplied'] || 0),
        advanceCreditBalance: Number(this.summary['advanceCreditBalance'] || 0),
      },
      hospital: readStoredHospitalDocumentInfo(),
      generatedBy: readCurrentUserName(),
    });
  };

  buildDischargeDocument = (): string => {
    const statement = this.dischargeStatement;
    const patient = (statement['patient'] as Record<string, unknown>) || null;
    return buildDischargeStatementDocumentHtml({
      patient: patient as { firstName?: string; lastName?: string; patientNo?: string },
      admissionNo: String(statement['admissionNo'] || ''),
      wardLabel: String(statement['wardLabel'] || ''),
      admittedAt: String(statement['admittedAt'] || ''),
      dischargedAt: String(statement['dischargedAt'] || ''),
      chargeBreakdown: (statement['chargeBreakdown'] as Record<string, number>) || {},
      summary: {
        totalCharges: Number(statement['grossCharges'] || 0),
        totalDiscount: Number(statement['totalDiscount'] || 0),
        netPayable: Number(statement['netCharges'] || 0),
        totalPaid: Number(statement['previousPayments'] || 0),
        balance: Number(statement['balanceDue'] || 0),
        securityDepositHeld: Number(statement['securityAvailable'] || 0),
        securityDepositApplied: Number(statement['securityAdjusted'] || 0),
        advanceCreditBalance: Number(statement['advanceCreditBalance'] || 0),
      },
      hospital: readStoredHospitalDocumentInfo(),
      generatedBy: readCurrentUserName(),
    });
  };

  load(): void {
    if (!this.admissionId) {
      return;
    }
    this.loading = true;
    if (this.mode === 'discharge') {
      this.backend.getWardDischargeStatement(this.admissionId).subscribe({
        next: (data) => {
          this.dischargeData = data || {};
          this.billData = data || {};
          this.medicineRequests = (data?.['medicineRequests'] as Array<Record<string, unknown>>) || [];
          this.procedures = (data?.['procedures'] as Array<Record<string, unknown>>) || [];
          this.operations = (data?.['operations'] as Array<Record<string, unknown>>) || [];
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toastr.error(err?.error?.message || 'Unable to load discharge statement');
        },
      });
      return;
    }

    this.backend.getWardAdmissionBill(this.admissionId).subscribe({
      next: (data) => {
        this.billData = data || {};
        this.medicineRequests = (data?.['medicineRequests'] as Array<Record<string, unknown>>) || [];
        this.procedures = (data?.['procedures'] as Array<Record<string, unknown>>) || [];
        this.operations = (data?.['operations'] as Array<Record<string, unknown>>) || [];
        this.loading = false;
        if (this.mode === 'doctor-visits') {
          this.loadDoctorVisits();
        }
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err?.error?.message || 'Unable to load ward bill');
      },
    });
  }

  loadDoctorVisits(): void {
    this.backend.listWardDoctorVisits(this.admissionId).subscribe({
      next: (items) => (this.doctorVisits = items || []),
      error: () => (this.doctorVisits = []),
    });
  }

  addCharge(): void {
    if (!this.chargeForm.title || this.chargeForm.rate <= 0) {
      this.toastr.warning('Enter charge title and rate');
      return;
    }
    this.backend.addWardCharge(this.admissionId, this.chargeForm).subscribe({
      next: () => {
        this.toastr.success('Charge added');
        this.chargeForm = { title: '', rate: 0, category: 'misc' };
        this.load();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to add charge'),
    });
  }

  collectPayment(): void {
    if (this.paymentForm.amount <= 0) {
      this.toastr.warning('Enter payment amount');
      return;
    }
    this.backend.collectWardPayment(this.admissionId, this.paymentForm).subscribe({
      next: () => {
        this.toastr.success('Payment collected');
        this.paymentForm = { amount: 0, method: 'cash', type: 'partial', note: '' };
        this.load();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to collect payment'),
    });
  }

  collectSecurity(): void {
    if (this.securityForm.amount <= 0) {
      this.toastr.warning('Enter security deposit amount');
      return;
    }
    this.backend.collectWardSecurityDeposit(this.admissionId, {
      ...this.securityForm,
      type: 'security_deposit',
    }).subscribe({
      next: () => {
        this.toastr.success('Security deposit collected');
        this.securityForm = { amount: 0, method: 'cash', note: 'Admission security deposit' };
        this.load();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to collect security deposit'),
    });
  }

  createVisit(): void {
    if (!this.visitForm.doctorId) {
      this.toastr.warning('Doctor ID is required');
      return;
    }
    this.backend.createWardDoctorVisit({ roomAllotmentId: this.admissionId, ...this.visitForm }).subscribe({
      next: () => {
        this.toastr.success('Doctor visit scheduled');
        this.loadDoctorVisits();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to create visit'),
    });
  }

  completeVisit(visitId: string): void {
    this.backend.completeWardDoctorVisit(visitId).subscribe({
      next: () => {
        this.toastr.success('Visit completed');
        this.load();
        this.loadDoctorVisits();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to complete visit'),
    });
  }

  createMedicineRequest(): void {
    if (!this.medicineForm.productId || this.medicineForm.requestedQty <= 0) {
      this.toastr.warning('Product ID and quantity are required');
      return;
    }
    this.backend
      .createWardMedicineRequest({
        roomAllotmentId: this.admissionId,
        notes: this.medicineForm.notes,
        items: [{ productId: this.medicineForm.productId, requestedQty: this.medicineForm.requestedQty }],
      })
      .subscribe({
        next: () => {
          this.toastr.success('Medicine request created');
          this.medicineForm = { productId: '', requestedQty: 1, notes: '' };
          this.load();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to create medicine request'),
      });
  }

  createProcedure(): void {
    if (!this.procedureForm.procedureName || this.procedureForm.rate < 0) {
      this.toastr.warning('Procedure name and rate are required');
      return;
    }
    this.backend
      .createWardProcedure({ roomAllotmentId: this.admissionId, ...this.procedureForm })
      .subscribe({
        next: () => {
          this.toastr.success('Procedure scheduled');
          this.procedureForm = { procedureName: '', procedureType: '', doctorId: '', rate: 0, qty: 1, notes: '' };
          this.load();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to schedule procedure'),
      });
  }

  completeProcedure(id: string): void {
    this.backend.completeWardProcedure(id).subscribe({
      next: () => {
        this.toastr.success('Procedure completed');
        this.load();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to complete procedure'),
    });
  }

  cancelProcedure(id: string): void {
    this.backend.cancelWardProcedure(id).subscribe({
      next: () => {
        this.toastr.success('Procedure cancelled');
        this.load();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to cancel procedure'),
    });
  }

  createOperation(): void {
    if (!this.operationForm.operationName) {
      this.toastr.warning('Operation name is required');
      return;
    }
    this.backend.createWardOperation({ roomAllotmentId: this.admissionId, ...this.operationForm }).subscribe({
      next: () => {
        this.toastr.success('Operation scheduled');
        this.operationForm = { operationName: '', surgeonId: '', baseCharge: 0, otRoom: '', clinicalNote: '' };
        this.load();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to schedule operation'),
    });
  }

  completeOperation(id: string): void {
    this.backend.completeWardOperation(id).subscribe({
      next: () => {
        this.toastr.success('Operation completed');
        this.load();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to complete operation'),
    });
  }

  cancelOperation(id: string): void {
    this.backend.cancelWardOperation(id).subscribe({
      next: () => {
        this.toastr.success('Operation cancelled');
        this.load();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to cancel operation'),
    });
  }

  printDischarge(): void {
    window.print();
  }

  money(value: unknown): string {
    return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  settlementClass(status: unknown): string {
    const value = String(status || '').toLowerCase();
    if (value === 'settled') return 'ward-badge ward-badge--stable';
    if (value === 'pending_settlement') return 'ward-badge ward-badge--watch';
    return 'ward-badge';
  }

  asDate(value: unknown): string | number | Date | null {
    if (value == null) return null;
    return value as string | number | Date;
  }

  asId(value: unknown): string {
    return String(value || '');
  }

  requestItems(row: Record<string, unknown>): Array<Record<string, unknown>> {
    return (row['items'] as Array<Record<string, unknown>>) || [];
  }

  saleCount(row: Record<string, unknown>): number {
    const ids = row['pharmacySaleIds'];
    return Array.isArray(ids) ? ids.length : 0;
  }

  pharmacySettlement(): Record<string, unknown> {
    return (this.dischargeStatement['pharmacySettlement'] as Record<string, unknown>) || {};
  }
}

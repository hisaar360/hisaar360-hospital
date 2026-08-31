import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { Encounter, Hospital, LabOrder, LabTestCatalog, Patient } from '../../../shared/models/hospital.model';
import { canEditLabOrder } from './lab-order.utils';
import { printLabInvoice } from './lab-order-invoice.builder';

@Component({
  selector: 'app-lab-order-create',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lab-order-create.component.html',
  styleUrl: './lab-order-create.component.scss',
})
export class LabOrderCreateComponent implements OnInit {
  patients: Patient[] = [];
  catalog: LabTestCatalog[] = [];
  selectedTests: LabTestCatalog[] = [];
  loading = false;
  saving = false;
  patientPhone = '';
  phoneLookupLoading = false;
  phoneLookupPerformed = false;
  phoneMatchedTotal = 0;
  selectedPatientId = '';
  selectedPatient: Patient | null = null;
  currentHospitalId: string | null = null;
  hospital: Hospital | null = null;
  source: 'doctor' | 'walk-in' | 'admission' | 'emergency' = 'walk-in';
  openEncounters: Encounter[] = [];
  selectedEncounterId = '';
  encountersLoading = false;
  referredBy = '';
  priority: 'normal' | 'urgent' = 'normal';
  paidAmount = 0;
  paymentMethod = 'cash';
  paymentReceivedNow = true;
  notes = '';
  testSearch = '';
  isEditMode = false;
  editingOrderId = '';
  editingOrderNo = '';
  orderLoading = false;
  private pendingEditOrder: LabOrder | null = null;

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null') as
      | { hospitalId?: string | null }
      | null;
    this.currentHospitalId = currentUser?.hospitalId || null;
    this.backend.getMe().subscribe({
      next: (user) => {
        this.currentHospitalId = user.hospitalId || this.currentHospitalId;
        this.loadHospital(this.currentHospitalId);
      },
    });
    this.loadCatalog();

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') || '';
      if (id) {
        this.isEditMode = true;
        this.editingOrderId = id;
        this.loadOrderForEdit(id);
      }
    });
  }

  loadCatalog(): void {
    this.loading = true;
    this.backend
      .getLabTests({ limit: 100, isActive: true })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.catalog = result.items;
          if (this.catalog.length === 0) {
            this.backend.seedDefaultLabTests().subscribe({
              next: () => this.loadCatalog(),
            });
            return;
          }

          if (this.pendingEditOrder) {
            this.applyOrderToForm(this.pendingEditOrder);
            this.pendingEditOrder = null;
          }
        },
        error: () => {
          this.catalog = [];
        },
      });
  }

  canSearchPatientPhone(): boolean {
    return this.normalizePhone(this.patientPhone).length >= 4 && !this.phoneLookupLoading;
  }

  lookupPatientsByPhone(): void {
    const phone = this.patientPhone.trim();
    const normalizedPhone = this.normalizePhone(phone);

    if (normalizedPhone.length < 4) {
      this.toastr.error('Enter at least 4 digits of phone number.');
      return;
    }

    this.phoneLookupLoading = true;
    this.phoneLookupPerformed = false;
    this.phoneMatchedTotal = 0;
    this.patients = [];
    this.selectedPatientId = '';
    this.selectedPatient = null;
    this.clearEncounterAttachment();

    this.backend
      .getPatients({ limit: 100, status: 'active', search: phone })
      .pipe(finalize(() => (this.phoneLookupLoading = false)))
      .subscribe({
        next: (result) => {
          this.patients = (result.items || []).filter((patient) =>
            this.normalizePhone(patient.phone || '').includes(normalizedPhone)
          );
          this.phoneMatchedTotal = this.patients.length;
          this.phoneLookupPerformed = true;

          if (this.phoneMatchedTotal === 0) {
            this.toastr.info('No patient found against this phone number.');
          }
        },
        error: (err) => {
          this.phoneLookupPerformed = true;
          this.toastr.error(err?.error?.message || 'Unable to search patients.');
        },
      });
  }

  filteredCatalog(): LabTestCatalog[] {
    const query = this.testSearch.trim().toLowerCase();
    if (!query) {
      return this.catalog;
    }

    return this.catalog.filter((test) =>
      `${test.name} ${test.shortCode} ${test.department}`.toLowerCase().includes(query)
    );
  }

  patientName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`.trim();
  }

  selectPatient(patient: Patient): void {
    this.selectedPatientId = patient._id;
    this.selectedPatient = patient;
    this.patientPhone = patient.phone || this.patientPhone;
    this.loadHospital(patient.hospitalId || this.currentHospitalId);
    this.loadOpenEncounters(patient._id);
  }

  onSourceChange(): void {
    this.applyDefaultEncounter();
    if (this.isEditMode) {
      return;
    }

    if (this.source === 'admission' || this.source === 'emergency') {
      this.paymentReceivedNow = false;
      this.paidAmount = 0;
      return;
    }

    this.paymentReceivedNow = true;
    this.syncPaidAmountWithSelection();
  }

  onPaymentReceivedToggle(): void {
    this.syncPaidAmountWithSelection();
  }

  onPaidAmountChange(): void {
    const total = this.totalAmount();
    const paid = Number(this.paidAmount || 0);
    this.paymentReceivedNow = total > 0 && paid >= total;
  }

  private syncPaidAmountWithSelection(): void {
    this.paidAmount = this.paymentReceivedNow ? this.totalAmount() : 0;
  }

  billingHint(): string {
    if (this.source === 'admission' || this.source === 'emergency') {
      return 'Admitted / emergency: leave unpaid so charges go to the hospital visit bill. Tick “Payment received now” only if the lab collected cash/card at the counter.';
    }

    if (this.source === 'doctor') {
      return 'OPD / doctor order: payment received now prints a PAID invoice and posts it to the hospital ledger under the staff who collected it.';
    }

    return 'Walk-in: payment is received at the lab counter by default. Save & Print Invoice will show PAID and the name of the staff who collected it.';
  }

  invoiceStatusPreview(): string {
    const total = this.totalAmount();
    const paid = Number(this.paidAmount || 0);
    if (total <= 0) {
      return 'NO CHARGE';
    }
    if (paid <= 0) {
      return 'UNPAID';
    }
    if (paid >= total) {
      return 'PAID';
    }
    return 'PARTIAL';
  }

  canCollectPayment(): boolean {
    return (
      this.backend.hasPermission('ledger_payments.create') ||
      this.backend.hasPermission('bills.update_payment')
    );
  }

  matchingEncounters(): Encounter[] {
    const type = this.encounterTypeForSource();
    return this.openEncounters.filter(
      (encounter) =>
        encounter.type === type &&
        encounter.status !== 'closed' &&
        encounter.status !== 'cancelled'
    );
  }

  attachedEncounterLabel(): string {
    const encounter = this.matchingEncounters().find((item) => item._id === this.selectedEncounterId);
    if (!encounter) {
      return '';
    }

    return `${encounter.encounterNo} · ${encounter.type} · ${encounter.status}`;
  }

  private encounterTypeForSource(): Encounter['type'] {
    if (this.source === 'emergency') {
      return 'emergency';
    }

    if (this.source === 'admission') {
      return 'admission';
    }

    return 'opd';
  }

  private clearEncounterAttachment(): void {
    this.openEncounters = [];
    this.selectedEncounterId = '';
    this.encountersLoading = false;
  }

  private loadOpenEncounters(patientId: string, preferredEncounterId = ''): void {
    this.encountersLoading = true;
    this.backend
      .getEncounters({ patientId, limit: 50 })
      .pipe(finalize(() => (this.encountersLoading = false)))
      .subscribe({
        next: (result) => {
          this.openEncounters = (result.items || []).filter(
            (encounter) => encounter.status !== 'closed' && encounter.status !== 'cancelled'
          );
          this.applyDefaultEncounter(preferredEncounterId);
        },
        error: () => {
          this.openEncounters = [];
          this.selectedEncounterId = '';
        },
      });
  }

  private applyDefaultEncounter(preferredEncounterId = ''): void {
    const matches = this.matchingEncounters();
    if (preferredEncounterId && matches.some((item) => item._id === preferredEncounterId)) {
      this.selectedEncounterId = preferredEncounterId;
      return;
    }

    if (this.selectedEncounterId && matches.some((item) => item._id === this.selectedEncounterId)) {
      return;
    }

    const withAppointment = matches.find((item) => item.appointmentId);
    this.selectedEncounterId = (withAppointment || matches[0])?._id || '';
  }

  private loadHospital(hospitalId: string | null | undefined): void {
    this.backend.getLabSettings().subscribe({
      next: (settings) => {
        this.hospital = {
          _id: hospitalId || settings.hospital._id || this.currentHospitalId || '',
          name: settings.hospital.name,
          code: '',
          status: 'active',
          phone: settings.hospital.phone,
          email: settings.hospital.email,
          address: settings.hospital.address,
          city: settings.hospital.city,
          logoUrl: settings.hospital.logoUrl,
          laboratorySettings: settings.laboratorySettings,
        };
      },
      error: () => undefined,
    });
  }

  resolveHospitalId(): string | null {
    return this.currentHospitalId || this.selectedPatient?.hospitalId || null;
  }

  toggleTest(test: LabTestCatalog): void {
    const exists = this.selectedTests.some((item) => item._id === test._id);
    this.selectedTests = exists
      ? this.selectedTests.filter((item) => item._id !== test._id)
      : [...this.selectedTests, test];
    if (this.paymentReceivedNow) {
      this.syncPaidAmountWithSelection();
    }
  }

  isSelected(test: LabTestCatalog): boolean {
    return this.selectedTests.some((item) => item._id === test._id);
  }

  totalAmount(): number {
    return this.selectedTests.reduce((sum, test) => sum + Number(test.price || 0), 0);
  }

  balanceAmount(): number {
    return Math.max(this.totalAmount() - Number(this.paidAmount || 0), 0);
  }

  loadOrderForEdit(id: string): void {
    this.orderLoading = true;
    this.backend
      .getLabOrder(id)
      .pipe(finalize(() => (this.orderLoading = false)))
      .subscribe({
        next: (order) => {
          if (!canEditLabOrder(order)) {
            this.toastr.error('This lab order can no longer be edited.');
            void this.router.navigate(['/laboratory/orders', id]);
            return;
          }

          if (this.catalog.length) {
            this.applyOrderToForm(order);
          } else {
            this.pendingEditOrder = order;
          }
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Unable to load lab order for editing.');
          void this.router.navigate(['/laboratory']);
        },
      });
  }

  private applyOrderToForm(order: LabOrder): void {
    this.editingOrderNo = order.orderNo;
    this.selectedPatientId = order.patientId;
    this.selectedPatient = order.patient || null;
    this.patientPhone = order.patient?.phone || '';
    this.phoneLookupPerformed = Boolean(order.patient);
    this.source = order.source;
    this.referredBy = order.referredBy || '';
    this.priority = order.priority;
    this.paidAmount = order.paidAmount;
    this.paymentMethod = order.paymentMethod || 'cash';
    this.paymentReceivedNow = Number(order.totalAmount || 0) > 0 && Number(order.paidAmount || 0) >= Number(order.totalAmount || 0);
    this.notes = order.notes || '';

    const testIds = new Set(
      (order.items || []).map((item) => String(item.testId || '')).filter(Boolean)
    );
    this.selectedTests = this.catalog.filter((test) => testIds.has(test._id));

    if (order.patient) {
      this.patients = [order.patient];
      this.phoneMatchedTotal = 1;
    }

    this.loadHospital(order.hospitalId || this.currentHospitalId);
    if (order.patientId) {
      this.loadOpenEncounters(order.patientId, order.encounterId || '');
    }
  }

  saveOrder(printReceipt = false): void {
    if (!this.selectedPatientId) {
      this.toastr.error('Select a patient first.');
      return;
    }

    if (this.selectedTests.length === 0) {
      this.toastr.error('Select at least one test.');
      return;
    }

    if (Number(this.paidAmount || 0) > this.totalAmount()) {
      this.toastr.error('Paid amount cannot exceed total amount.');
      return;
    }

    if (this.paymentReceivedNow && this.canCollectPayment()) {
      this.paidAmount = this.totalAmount();
    }

    if (!this.canCollectPayment()) {
      this.paidAmount = 0;
      this.paymentReceivedNow = false;
    }

    const payload: Record<string, unknown> = {
      source: this.source,
      referredBy: this.referredBy,
      priority: this.priority,
      paidAmount: this.paidAmount,
      paymentMethod: this.paymentMethod,
      notes: this.notes,
      tests: this.selectedTests.map((test) => ({ testId: test._id })),
    };

    if (this.selectedEncounterId) {
      payload['encounterId'] = this.selectedEncounterId;
    }

    if (this.isEditMode && this.editingOrderId) {
      this.updateOrder(printReceipt, payload);
      return;
    }

    const hospitalId = this.resolveHospitalId();
    if (!hospitalId) {
      this.toastr.error('Hospital is required. Select a patient linked to a hospital.');
      return;
    }

    this.saving = true;
    this.backend
      .createLabOrder({
        hospitalId,
        patientId: this.selectedPatientId,
        ...payload,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          const order = response.data;
          const orderId = order?._id || '';
          this.toastr.success('Lab order created.');

          if (printReceipt && order) {
            this.printLabOrderReceipt(order, orderId);
            return;
          }

          if (orderId) {
            void this.router.navigate(['/laboratory/orders', orderId]);
          }
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to create lab order.'),
      });
  }

  private updateOrder(printReceipt: boolean, payload: Record<string, unknown>): void {
    this.saving = true;
    this.backend
      .updateLabOrder(this.editingOrderId, payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          const order = response.data;
          const orderId = order?._id || this.editingOrderId;
          this.toastr.success('Lab order updated.');

          if (printReceipt && order) {
            this.printLabOrderReceipt(order, orderId);
            return;
          }

          void this.router.navigate(['/laboratory/orders', orderId]);
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to update lab order.'),
      });
  }

  private printLabOrderReceipt(order: LabOrder, orderId: string): void {
    const merged: LabOrder = {
      ...order,
      patient: order.patient || this.selectedPatient || order.patient,
    };
    printLabInvoice(merged, this.hospital);
    window.setTimeout(() => this.navigateAfterReceiptPrint(orderId), 400);
  }

  private navigateAfterReceiptPrint(orderId: string): void {
    if (orderId) {
      void this.router.navigate(['/laboratory/orders', orderId]);
    }
  }

  private normalizePhone(value: string): string {
    return value.replace(/\D/g, '');
  }
}

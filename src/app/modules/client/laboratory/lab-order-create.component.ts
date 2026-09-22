import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import {
  HMS_KEYBOARD_STANDARDS,
  HmsKeyboardDirective,
  HmsKeyboardService,
  HmsSelectKeyboardDirective,
  isEditableTarget,
  isModKey,
} from '../../../core/keyboard';
import { BackendService } from '../../../core/services/backend.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { Encounter, Hospital, LabOrder, LabTestCatalog, Patient } from '../../../shared/models/hospital.model';
import { HmsCurrencyPipe } from '../../../shared/pipes/hms-currency.pipe';
import { canEditLabOrder } from './lab-order.utils';
import { printLabInvoice } from './lab-order-invoice.builder';

@Component({
  selector: 'app-lab-order-create',
  imports: [CommonModule, FormsModule, RouterLink, HmsCurrencyPipe, HmsKeyboardDirective, HmsSelectKeyboardDirective],
  templateUrl: './lab-order-create.component.html',
  styleUrl: './lab-order-create.component.scss',
})
export class LabOrderCreateComponent implements OnInit, OnDestroy {
  @ViewChild('labTestSearchInput') labTestSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('labPatientPhoneInput') labPatientPhoneInput?: ElementRef<HTMLInputElement>;
  @ViewChild('labDiscountInput') labDiscountInput?: ElementRef<HTMLInputElement>;
  @ViewChild('labPaidAmountInput') labPaidAmountInput?: ElementRef<HTMLInputElement>;
  @ViewChild('labSavePrintBtn') labSavePrintBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('labSaveBtn') labSaveBtn?: ElementRef<HTMLButtonElement>;

  patients: Patient[] = [];
  catalog: LabTestCatalog[] = [];
  selectedTests: LabTestCatalog[] = [];
  loading = false;
  saving = false;
  patientPhone = '';
  phoneLookupLoading = false;
  phoneLookupPerformed = false;
  phoneMatchedTotal = 0;
  highlightedPatientIndex = 0;
  keyboardHintOpen = false;
  readonly keyboardHints = [
    ...HMS_KEYBOARD_STANDARDS,
    { keys: '↑ ↓ + Enter', action: 'Select patient from phone results' },
    { keys: 'Type + ↑ ↓ + Enter', action: 'Pick test from search suggestions (like POS)' },
    { keys: 'Ctrl/Cmd+D', action: 'Jump to Discount / Payment' },
    { keys: 'Ctrl/Cmd+Enter', action: 'Save & Print Invoice' },
  ];
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
  categoryFilter = 'All';
  highlightedTestIndex = 0;
  showTestSuggestions = false;
  private readonly suggestionLimit = 12;
  collectionDateTime = '';
  discountValue = 0;
  discountUnit: 'flat' | 'percent' = 'flat';
  usePackageRates = false;
  isEditMode = false;
  editingOrderId = '';
  editingOrderNo = '';
  orderLoading = false;
  private pendingEditOrder: LabOrder | null = null;
  private defaultsSynced = false;

  constructor(
    private backend: BackendService,
    private currency: CurrencyService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private keyboard: HmsKeyboardService
  ) {}

  ngOnInit(): void {
    this.currency.ensureLoaded();
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
    this.collectionDateTime = this.defaultCollectionDateTime();

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') || '';
      if (id) {
        this.isEditMode = true;
        this.editingOrderId = id;
        this.loadOrderForEdit(id);
      }
    });
  }

  ngOnDestroy(): void {
    // Directive unregisters; keep hook for future cleanup.
  }

  readonly onPageKeydown = (event: KeyboardEvent): boolean => {
    if (this.keyboard.isSaveChord(event)) {
      if (!this.saving && !this.orderLoading) {
        this.saveOrder(false);
      }
      return true;
    }

    // Ctrl/Cmd+Enter → Save & Print Invoice
    if (
      isModKey(event) &&
      !event.shiftKey &&
      !event.altKey &&
      event.key === 'Enter' &&
      !this.saving &&
      !this.orderLoading
    ) {
      this.saveOrder(this.canCollectPayment());
      return true;
    }

    if (this.keyboard.isFindChord(event) || this.keyboard.isFocusSearchSlash(event)) {
      this.focusTestSearch();
      return true;
    }

    // Jump straight to payment / discount (skip catalog noise).
    if (isModKey(event) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'd') {
      this.focusPaymentSection();
      return true;
    }

    if (event.key === '?' && !isEditableTarget(event.target) && !event.ctrlKey && !event.metaKey) {
      this.keyboardHintOpen = !this.keyboardHintOpen;
      return true;
    }

    if (
      this.phoneLookupPerformed &&
      this.patients.length > 0 &&
      !this.selectedPatientId &&
      !isEditableTarget(event.target)
    ) {
      if (event.key === 'ArrowDown') {
        this.highlightedPatientIndex = Math.min(
          this.highlightedPatientIndex + 1,
          this.patients.length - 1
        );
        return true;
      }
      if (event.key === 'ArrowUp') {
        this.highlightedPatientIndex = Math.max(this.highlightedPatientIndex - 1, 0);
        return true;
      }
      if (event.key === 'Enter') {
        const pick = this.patients[this.highlightedPatientIndex];
        if (pick) {
          this.selectPatient(pick);
          return true;
        }
      }
    }

    return false;
  };

  readonly onPageEscape = (): boolean => {
    if (this.keyboardHintOpen) {
      this.keyboardHintOpen = false;
      return true;
    }
    if (this.testSearch || this.showTestSuggestions) {
      this.testSearch = '';
      this.highlightedTestIndex = 0;
      this.showTestSuggestions = false;
      return true;
    }
    return false;
  };

  focusTestSearch(): void {
    const el = this.labTestSearchInput?.nativeElement;
    if (el) {
      el.focus();
      el.select();
      return;
    }
    this.labPatientPhoneInput?.nativeElement?.focus();
  }

  focusPaymentSection(): void {
    const discount = this.labDiscountInput?.nativeElement;
    if (discount) {
      discount.focus();
      discount.select();
      discount.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    this.labPaidAmountInput?.nativeElement?.focus();
  }

  toggleKeyboardHint(): void {
    this.keyboardHintOpen = !this.keyboardHintOpen;
  }

  loadCatalog(): void {
    this.loading = true;
    this.backend
      .getLabTests({ limit: 500, isActive: true })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.catalog = result.items || [];

          if (!this.defaultsSynced) {
            this.defaultsSynced = true;
            this.backend.seedDefaultLabTests().subscribe({
              next: (response) => {
                if ((response.data?.seeded || 0) > 0) {
                  this.loadCatalog();
                  return;
                }
                this.afterCatalogReady();
              },
              error: () => this.afterCatalogReady(),
            });
            return;
          }

          this.afterCatalogReady();
        },
        error: () => {
          this.catalog = [];
        },
      });
  }

  private afterCatalogReady(): void {
    if (this.pendingEditOrder) {
      this.applyOrderToForm(this.pendingEditOrder);
      this.pendingEditOrder = null;
    }
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
    this.highlightedPatientIndex = 0;
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
          this.highlightedPatientIndex = 0;

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

  /** Browse table: category chips only — search does not shrink the table. */
  filteredCatalog(): LabTestCatalog[] {
    return this.catalog.filter((test) => {
      if (this.categoryFilter !== 'All' && test.department !== this.categoryFilter) {
        return false;
      }
      return true;
    });
  }

  /** POS-style suggestion list while typing in search. */
  searchSuggestions(): LabTestCatalog[] {
    const query = this.testSearch.trim().toLowerCase();
    if (!query) {
      return [];
    }

    const matches = this.catalog.filter((test) => {
      if (this.categoryFilter !== 'All' && test.department !== this.categoryFilter) {
        return false;
      }
      const haystack =
        `${test.name} ${test.shortCode} ${test.department} ${test.sampleType || ''} ${test.tubeType || ''}`.toLowerCase();
      return haystack.includes(query);
    });

    // Prefer exact / prefix code matches first for one-keyword entry (e.g. CBC).
    const scored = matches
      .map((test) => {
        const code = (test.shortCode || '').toLowerCase();
        const name = (test.name || '').toLowerCase();
        let score = 0;
        if (code === query || name === query) score = 0;
        else if (code.startsWith(query) || name.startsWith(query)) score = 1;
        else score = 2;
        return { test, score };
      })
      .sort((a, b) => a.score - b.score || a.test.shortCode.localeCompare(b.test.shortCode));

    return scored.slice(0, this.suggestionLimit).map((item) => item.test);
  }

  get showTestSearchDropdown(): boolean {
    return this.showTestSuggestions && this.testSearch.trim().length > 0;
  }

  onTestSearchChange(): void {
    this.highlightedTestIndex = 0;
    this.showTestSuggestions = this.testSearch.trim().length > 0;
  }

  onTestSearchFocus(): void {
    if (this.testSearch.trim()) {
      this.showTestSuggestions = true;
    }
  }

  onTestSearchBlur(): void {
    // Delay so mousedown on a suggestion still registers.
    window.setTimeout(() => {
      this.showTestSuggestions = false;
    }, 150);
  }

  onTestSearchKeydown(event: KeyboardEvent): void {
    const matches = this.searchSuggestions();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.showTestSuggestions = true;
      if (!matches.length) {
        return;
      }
      this.highlightedTestIndex = Math.min(this.highlightedTestIndex + 1, matches.length - 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!matches.length) {
        return;
      }
      this.highlightedTestIndex = Math.max(this.highlightedTestIndex - 1, 0);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTopSearchResult();
      return;
    }

    if (event.key === 'Escape') {
      this.testSearch = '';
      this.highlightedTestIndex = 0;
      this.showTestSuggestions = false;
    }
  }

  addTopSearchResult(): void {
    const matches = this.searchSuggestions();
    if (!matches.length) {
      this.toastr.warning('No lab test matches this search.');
      return;
    }

    const query = this.testSearch.trim().toLowerCase();
    const exact =
      matches.find((test) => test.shortCode.toLowerCase() === query) ||
      matches.find((test) => test.name.toLowerCase() === query);
    const pick =
      exact ||
      matches[Math.min(Math.max(this.highlightedTestIndex, 0), matches.length - 1)] ||
      matches[0];

    if (!pick) {
      return;
    }

    this.addTestFromSuggestion(pick);
  }

  addTestFromSuggestion(test: LabTestCatalog, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.isSelected(test)) {
      this.toastr.info(`${test.shortCode} is already selected.`);
    } else {
      this.toggleTest(test);
      this.toastr.success(`${test.shortCode} added.`);
    }

    this.testSearch = '';
    this.highlightedTestIndex = 0;
    this.showTestSuggestions = false;
    this.focusTestSearch();
  }

  categoryChips(): Array<{ name: string; count: number }> {
    const counts = new Map<string, number>();
    for (const test of this.catalog) {
      const dept = test.department || 'General';
      counts.set(dept, (counts.get(dept) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  setCategory(name: string): void {
    this.categoryFilter = name;
    this.highlightedTestIndex = 0;
  }

  specimenLabel(test: LabTestCatalog): string {
    if (test.tubeType) {
      return `${test.sampleType} (${test.tubeType})`;
    }
    return test.sampleType || '—';
  }

  tatLabel(test: LabTestCatalog): string {
    const hours = Number(test.turnaroundHours || 0);
    if (!hours) {
      return '—';
    }
    if (hours < 24) {
      return `${hours}-${hours + 2} hrs`;
    }
    return `${Math.round(hours / 24)} day${hours >= 48 ? 's' : ''}`;
  }

  patientAge(patient: Patient): string {
    if (!patient.dateOfBirth) {
      return 'Age —';
    }
    const dob = new Date(patient.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      return 'Age —';
    }
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
      age -= 1;
    }
    return `${age} years`;
  }

  chargePrice(test: LabTestCatalog): number {
    if (this.usePackageRates && Number(test.packageRate || 0) > 0) {
      return Number(test.packageRate);
    }
    return Number(test.price || 0);
  }

  get currencyLabel(): string {
    return this.currency.label;
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

  clearSelectedTests(): void {
    this.selectedTests = [];
    if (this.paymentReceivedNow) {
      this.syncPaidAmountWithSelection();
    }
  }

  isSelected(test: LabTestCatalog): boolean {
    return this.selectedTests.some((item) => item._id === test._id);
  }

  subtotalAmount(): number {
    return this.selectedTests.reduce((sum, test) => sum + this.chargePrice(test), 0);
  }

  discountAmount(): number {
    const subtotal = this.subtotalAmount();
    if (this.discountUnit === 'percent') {
      return Math.min(subtotal, (subtotal * Number(this.discountValue || 0)) / 100);
    }
    return Math.min(subtotal, Number(this.discountValue || 0));
  }

  totalAmount(): number {
    return Math.max(this.subtotalAmount() - this.discountAmount(), 0);
  }

  onDiscountChange(): void {
    if (this.paymentReceivedNow) {
      this.syncPaidAmountWithSelection();
    }
  }

  onPackageRateToggle(): void {
    if (this.paymentReceivedNow) {
      this.syncPaidAmountWithSelection();
    }
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

    const pricedTests = this.buildPricedTests();
    let notes = (this.notes || '').trim();
    if (this.collectionDateTime) {
      const scheduled = `Collection scheduled: ${this.formatCollectionLabel(this.collectionDateTime)}`;
      notes = notes ? `${scheduled}\n${notes}` : scheduled;
    }
    if (this.discountAmount() > 0) {
      const discountNote =
        this.discountUnit === 'percent'
          ? `Discount: ${this.discountValue}% (${this.currency.format(this.discountAmount())})`
          : `Discount: ${this.currency.format(this.discountAmount())}`;
      notes = notes ? `${notes}\n${discountNote}` : discountNote;
    }
    if (this.usePackageRates) {
      notes = notes ? `${notes}\nPackage rates applied` : 'Package rates applied';
    }

    const payload: Record<string, unknown> = {
      source: this.source,
      referredBy: this.referredBy,
      priority: this.priority,
      paidAmount: this.paidAmount,
      paymentMethod: this.paymentMethod,
      notes,
      tests: pricedTests,
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

  private buildPricedTests(): Array<{ testId: string; price: number }> {
    const basePrices = this.selectedTests.map((test) => this.chargePrice(test));
    const subtotal = basePrices.reduce((sum, price) => sum + price, 0);
    const discount = this.discountAmount();

    if (subtotal <= 0 || discount <= 0) {
      return this.selectedTests.map((test, index) => ({
        testId: test._id,
        price: basePrices[index],
      }));
    }

    let allocated = 0;
    return this.selectedTests.map((test, index) => {
      const isLast = index === this.selectedTests.length - 1;
      let price: number;
      if (isLast) {
        price = Math.max(0, Math.round((subtotal - discount - allocated) * 100) / 100);
      } else {
        const share = (basePrices[index] / subtotal) * discount;
        price = Math.max(0, Math.round((basePrices[index] - share) * 100) / 100);
        allocated += price;
      }
      return { testId: test._id, price };
    });
  }

  private formatCollectionLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private defaultCollectionDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }
}

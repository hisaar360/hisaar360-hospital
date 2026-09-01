import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BackendService } from '../../../core/services/backend.service';
import { HmsDocumentService } from '../../../core/services/hms-document.service';
import { readCurrentUserName } from '../../../core/utils/hms-document-context.util';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';
import {
  Hospital,
  LabComparisonRow,
  LabOrder,
  LabOrderItem,
  LabOrderStatus,
  LabResultParameter,
  LabSample,
  LabTestCatalog,
  User,
} from '../../../shared/models/hospital.model';
import { buildLabOrderReportHtml } from './lab-order-report.builder';
import { isLabOrderReportReady } from './lab-print-details';
import {
  buildLabComparisonColumns,
  findComparisonHistoryPoint,
  LabComparisonColumn,
} from './lab-comparison.utils';
import { printLabSampleLabels } from './lab-sample-label.builder';
import { printLabInvoice } from './lab-order-invoice.builder';
import {
  activeLabSamples,
  canEditLabOrder,
  canVerifyLabItem,
  hasLabItemResultData,
  hasPendingSampleCollection,
  isLabItemVerified,
  labItemVerifyBlockReason,
  sampleStatusLabel,
} from './lab-order.utils';

@Component({
  selector: 'app-lab-order-detail',
  imports: [CommonModule, FormsModule, RouterLink, HmsDocumentToolbarComponent],
  templateUrl: './lab-order-detail.component.html',
  styleUrl: './lab-order-detail.component.scss',
})
export class LabOrderDetailComponent implements OnInit {
  order: LabOrder | null = null;
  hospital: Hospital | null = null;
  comparison: LabComparisonRow[] = [];
  catalog: LabTestCatalog[] = [];
  loading = false;
  saving = false;
  activeItemId = '';
  remarks = '';
  reportNotes = '';
  uploadUrl = '';
  addonSearch = '';
  selectedAddonIds: string[] = [];
  parameterGroups: Array<{
    subCategory: string;
    parameters: LabResultParameter[];
    showHeader: boolean;
  }> = [];
  activeItemSnapshot: LabOrderItem | null = null;
  comparisonRowsSnapshot: LabComparisonRow[] = [];
  comparisonColumnsSnapshot: LabComparisonColumn[] = [];
  filteredAddonsSnapshot: LabTestCatalog[] = [];

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') || '';
      if (id) {
        this.loadOrder(id);
      }
    });
    if (this.canUpdateLabOrder() && this.backend.hasPermission('lab_tests.read')) {
      this.backend.getLabTests({ limit: 100, isActive: true }).subscribe({
        next: (result) => {
          this.catalog = result.items;
          this.refreshFilteredAddons();
        },
      });
    }
  }

  loadOrder(id: string): void {
    this.loading = true;
    this.backend
      .getLabOrder(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (order) => {
          if (!order) {
            this.order = null;
            this.activeItemSnapshot = null;
            this.parameterGroups = [];
            this.comparisonRowsSnapshot = [];
            this.comparisonColumnsSnapshot = [];
            return;
          }

          const previousItemId = this.activeItemId;
          this.order = order;
          this.activeItemId =
            order.items?.find((item) => item._id === previousItemId)?._id ||
            order.items?.[0]?._id ||
            '';
          this.refreshActiveItemView();
          this.loadHospital(order.hospitalId);
          this.loadComparison(order.patientId);
        },
        error: (err) => {
          this.order = null;
          this.activeItemSnapshot = null;
          this.parameterGroups = [];
          this.comparisonRowsSnapshot = [];
          this.comparisonColumnsSnapshot = [];
          this.toastr.error(err?.error?.message || 'Unable to load lab order.');
        },
      });
  }

  loadHospital(hospitalId: string): void {
    this.backend.getLabSettings().subscribe({
      next: (settings) => {
        this.hospital = {
          _id: hospitalId || settings.hospital._id || '',
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
      error: () => {
        this.hospital = null;
      },
    });
  }

  loadComparison(patientId: string): void {
    this.backend.getPatientLabComparison(patientId).subscribe({
      next: (rows) => {
        this.comparison = rows;
        this.refreshComparisonView();
      },
      error: () => {
        this.comparison = [];
        this.refreshComparisonView();
      },
    });
  }

  activeItem(): LabOrderItem | null {
    return this.activeItemSnapshot;
  }

  selectItem(item: LabOrderItem): void {
    if (this.activeItemId === item._id) {
      return;
    }

    this.activeItemId = item._id;
    this.refreshActiveItemView();
  }

  trackByItemId(_index: number, item: LabOrderItem): string {
    return item._id;
  }

  trackByParameterKey(_index: number, parameter: LabResultParameter): string {
    return `${parameter.subCategory || ''}:${parameter.parameterName}`;
  }

  trackByComparisonColumn(_index: number, column: LabComparisonColumn): string {
    return column.orderId;
  }

  trackByComparisonRow(_index: number, row: LabComparisonRow): string {
    return row.parameterName;
  }

  trackByCatalogTestId(_index: number, test: LabTestCatalog): string {
    return test._id;
  }

  refreshActiveItemView(): void {
    this.activeItemSnapshot =
      this.order?.items.find((item) => item._id === this.activeItemId) ||
      this.order?.items[0] ||
      null;
    this.remarks = this.activeItemSnapshot?.remarks || '';
    this.reportNotes = this.order?.notes || '';
    this.refreshParameterGroups();
    this.refreshComparisonView();
  }

  refreshComparisonView(): void {
    const item = this.activeItemSnapshot;
    if (!item) {
      this.comparisonRowsSnapshot = [];
      this.comparisonColumnsSnapshot = [];
      return;
    }

    const testName = item.testName.toLowerCase();
    this.comparisonRowsSnapshot = this.comparison.filter(
      (row) => row.testName.toLowerCase() === testName
    );
    this.comparisonColumnsSnapshot = buildLabComparisonColumns(
      this.comparisonRowsSnapshot,
      this.order?._id,
      4
    );
  }

  refreshFilteredAddons(): void {
    const existing = new Set((this.order?.items || []).map((item) => item.testName.toLowerCase()));
    const query = this.addonSearch.trim().toLowerCase();
    this.filteredAddonsSnapshot = this.catalog.filter((test) => {
      if (existing.has(test.name.toLowerCase()) || existing.has(test.shortCode.toLowerCase())) {
        return false;
      }
      return !query || `${test.name} ${test.shortCode}`.toLowerCase().includes(query);
    });
  }

  patientName(): string {
    const patient = this.order?.patient;
    return patient ? `${patient.firstName} ${patient.lastName}`.trim() : '-';
  }

  canEditOrder(): boolean {
    return this.canUpdateLabOrder() && canEditLabOrder(this.order);
  }

  hasPendingSampleCollection(): boolean {
    return this.canUpdateLabOrder() && hasPendingSampleCollection(this.order);
  }

  canUpdateLabOrder(): boolean {
    return this.backend.hasPermission('lab_orders.update');
  }

  canCollectLabPayment(): boolean {
    return this.backend.hasPermission('ledger_payments.create') || this.backend.hasPermission('bills.update_payment');
  }

  canPrintLabInvoice(): boolean {
    return this.canCollectLabPayment();
  }

  canPrintSampleLabels(): boolean {
    return this.canUpdateLabOrder() && this.activeSamples().length > 0;
  }

  canViewLabFinance(): boolean {
    return (
      this.canCollectLabPayment() ||
      this.backend.hasPermission('ledger_payments.read') ||
      this.backend.hasPermission('bills.read')
    );
  }

  paymentStatusLabel(order: LabOrder | null | undefined): string {
    if (!order) {
      return 'UNPAID';
    }
    if (order.paymentStatus === 'paid') {
      return 'PAID';
    }
    if (order.paymentStatus === 'partial') {
      return 'PARTIAL';
    }
    const total = Number(order.totalAmount || 0);
    const paid = Number(order.paidAmount || 0);
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

  canVerifyLabResults(): boolean {
    return this.backend.hasPermission('lab_results.verify');
  }

  canVerifyActiveItem(): boolean {
    return this.canVerifyLabResults() && canVerifyLabItem(this.activeItem());
  }

  isActiveItemVerified(): boolean {
    return isLabItemVerified(this.activeItem());
  }

  canSendActiveItemForVerification(): boolean {
    return this.canUpdateLabOrder() && hasLabItemResultData(this.activeItem()) && !this.isActiveItemVerified();
  }

  activeItemVerifyHint(): string {
    return labItemVerifyBlockReason(this.activeItem());
  }

  hasActiveItemResultData(): boolean {
    return hasLabItemResultData(this.activeItem());
  }

  resultGateHint(): string {
    if (this.isActiveItemVerified()) {
      return '';
    }

    if (this.canVerifyActiveItem()) {
      return '';
    }

    if (this.canUpdateLabOrder() && !this.hasActiveItemResultData()) {
      return 'Enter all result values before sending for verification.';
    }

    return this.activeItemVerifyHint();
  }

  activeSamples(): LabSample[] {
    return activeLabSamples(this.order);
  }

  sampleStatusLabel(status?: string): string {
    return sampleStatusLabel(status);
  }

  testsForSample(sample: LabSample): string {
    if (sample.testsSummary) {
      return sample.testsSummary;
    }

    const linked = (this.order?.items || []).filter((item) => item.sampleId === sample._id);
    return linked.map((item) => item.shortCode || item.testName).join(', ') || '-';
  }

  sampleForItem(item: LabOrderItem | null | undefined): LabSample | null {
    if (!item?.sampleId) {
      return null;
    }

    return (this.order?.samples || []).find((sample) => sample._id === item.sampleId) || null;
  }

  canRejectSample(sample: LabSample): boolean {
    if (!this.canUpdateLabOrder() || sample.status === 'rejected') {
      return false;
    }

    const linked = (this.order?.items || []).filter((item) => item.sampleId === sample._id);
    return linked.every((item) => ['sample_collected', 'ordered'].includes(item.status));
  }

  refreshParameterGroups(): void {
    const item = this.activeItem();
    if (!item) {
      this.parameterGroups = [];
      return;
    }

    const grouped = new Map<string, LabResultParameter[]>();

    (item.parameters || []).forEach((parameter) => {
      const key = (parameter.subCategory || '').trim() || '__default__';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)?.push(parameter);
    });

    this.parameterGroups = Array.from(grouped.entries()).map(([key, parameters]) => ({
      subCategory: key === '__default__' ? '' : key,
      parameters,
      showHeader: key !== '__default__',
    }));
  }

  reloadOrderParameters(): void {
    const orderId = this.order?._id;
    if (!orderId) {
      return;
    }

    this.loadOrder(orderId);
    this.toastr.info('Reloading parameters from test catalog...');
  }

  collectSample(): void {
    if (!this.order || !this.canUpdateLabOrder()) {
      return;
    }

    this.backend.collectLabSample(this.order._id, {}).subscribe({
      next: (response) => {
        this.order = response.data || this.order;
        this.refreshActiveItemView();
        this.refreshFilteredAddons();
        const labels = (this.order?.samples || []).filter((sample) => sample.status === 'collected');
        if (this.order && labels.length) {
          printLabSampleLabels(this.order, labels, this.hospital);
        }
        this.toastr.success(`${labels.length || 1} sample label(s) ready.`);
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to collect sample.'),
    });
  }

  printSampleLabels(): void {
    if (!this.order) {
      return;
    }

    const labels = this.activeSamples();
    if (!labels.length) {
      this.toastr.info('No collected samples available for printing.');
      return;
    }

    printLabSampleLabels(this.order, labels, this.hospital);
  }

  printSingleSampleLabel(sample: LabSample): void {
    if (!this.order || sample.status === 'rejected') {
      return;
    }

    printLabSampleLabels(this.order, [sample], this.hospital);
  }

  printInvoice(): void {
    if (!this.order) {
      return;
    }

    if (!printLabInvoice(this.order, this.hospital)) {
      this.toastr.error('Unable to open invoice print preview.');
    }
  }

  saveReportNotes(): void {
    if (!this.order || !this.canUpdateLabOrder()) {
      return;
    }

    this.saving = true;
    this.backend
      .updateLabOrder(this.order._id, { notes: this.reportNotes.trim() })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.order = response.data || this.order;
          this.reportNotes = this.order?.notes || this.reportNotes;
          this.toastr.success('Report notes saved.');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to save notes.'),
      });
  }

  collectRemainingPayment(): void {
    if (!this.order || !this.canCollectLabPayment()) {
      return;
    }

    const total = Number(this.order.totalAmount || 0);
    if (total <= 0 || Number(this.order.balanceAmount || 0) <= 0) {
      return;
    }

    this.saving = true;
    this.backend
      .collectLabOrderPayment(this.order._id, {
        paidAmount: total,
        paymentMethod: this.order.paymentMethod || 'cash',
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.order = response.data || this.order;
          this.toastr.success('Payment recorded as received.');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to record payment.'),
      });
  }

  rejectSample(sample: LabSample): void {
    if (!this.order || !this.canUpdateLabOrder()) {
      return;
    }

    const reason = window.prompt('Enter rejection reason (clotted, insufficient quantity, wrong container, etc.)');
    if (!reason?.trim()) {
      return;
    }

    this.backend.rejectLabSample(this.order._id, sample._id, { rejectionReason: reason.trim() }).subscribe({
      next: (response) => {
        this.order = response.data || this.order;
        this.refreshActiveItemView();
        this.refreshFilteredAddons();
        this.toastr.success('Sample rejected. Collect again to generate a new sample ID.');
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to reject sample.'),
    });
  }

  saveResults(submitForVerification = false): void {
    const order = this.order;
    const item = this.activeItem();
    if (!order || !item || !this.canUpdateLabOrder()) {
      return;
    }

    if (submitForVerification && !hasLabItemResultData(item)) {
      this.toastr.error('Enter all result values before sending for verification.');
      return;
    }

    this.saving = true;
    this.backend
      .saveLabItemResults(order._id, item._id, {
        parameters: item.parameters,
        remarks: this.remarks,
        submitForVerification,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.order = response.data || order;
          this.refreshActiveItemView();
          this.toastr.success(submitForVerification ? 'Sent for verification.' : 'Results saved.');
          this.loadComparison(order.patientId);
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to save results.'),
      });
  }

  uploadReport(): void {
    const order = this.order;
    const item = this.activeItem();
    if (!order || !item || !this.canUpdateLabOrder() || !this.uploadUrl.trim()) {
      this.toastr.error('Enter report file URL.');
      return;
    }

    this.saving = true;
    this.backend
      .uploadLabItemReport(order._id, item._id, {
        fileUrl: this.uploadUrl.trim(),
        fileType: this.uploadUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
        reportType: item.testName,
        submitForVerification: true,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.order = response.data || order;
          this.uploadUrl = '';
          this.refreshActiveItemView();
          this.toastr.success('Report uploaded.');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to upload report.'),
      });
  }

  verifyItem(): void {
    const order = this.order;
    const item = this.activeItem();
    if (!order || !item || !this.canVerifyActiveItem()) {
      this.toastr.error(this.activeItemVerifyHint() || 'Results are not entered yet.');
      return;
    }

    this.backend.verifyLabOrderItem(order._id, item._id, { remarks: this.remarks }).subscribe({
      next: (response) => {
        this.order = response.data || order;
        this.refreshActiveItemView();
        this.toastr.success('Result verified.');
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to verify result.'),
    });
  }

  toggleAddon(test: LabTestCatalog): void {
    this.selectedAddonIds = this.selectedAddonIds.includes(test._id)
      ? this.selectedAddonIds.filter((id) => id !== test._id)
      : [...this.selectedAddonIds, test._id];
  }

  addExtraTests(): void {
    if (!this.order || !this.canUpdateLabOrder() || this.selectedAddonIds.length === 0) {
      return;
    }

    this.backend
      .addTestsToLabOrder(this.order._id, {
        tests: this.selectedAddonIds.map((testId) => ({ testId })),
      })
      .subscribe({
        next: (response) => {
          this.order = response.data || this.order;
          this.activeItemId = this.order?.items?.[0]?._id || this.activeItemId;
          this.selectedAddonIds = [];
          this.refreshActiveItemView();
          this.refreshFilteredAddons();
          this.toastr.success('Extra tests added to order.');
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to add tests.'),
      });
  }

  comparisonPoint(row: LabComparisonRow, column: LabComparisonColumn) {
    return findComparisonHistoryPoint(row, column.orderId);
  }

  isReportReady(): boolean {
    return isLabOrderReportReady(this.order);
  }

  latestTrend(row: LabComparisonRow): string | undefined {
    const latest = [...row.history]
      .filter((point) => point.date)
      .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime())[0];
    return latest?.trend;
  }

  formatRange(parameter: LabResultParameter): string {
    if (parameter.referenceMin != null && parameter.referenceMax != null) {
      return `${parameter.referenceMin} - ${parameter.referenceMax}`;
    }
    return '—';
  }

  formatComparisonRange(row: LabComparisonRow): string {
    if (row.referenceMin != null && row.referenceMax != null) {
      return `${row.referenceMin} - ${row.referenceMax}`;
    }
    return '—';
  }

  patientMeta(): string {
    const patient = this.order?.patient;
    if (!patient) {
      return '—';
    }

    const parts = [
      patient.patientNo ? `MRN ${patient.patientNo}` : '',
      patient.gender ? patient.gender.toUpperCase() : '',
      patient.phone || '',
    ].filter(Boolean);

    return parts.join(' · ') || '—';
  }

  sourceLabel(source?: string): string {
    const labels: Record<string, string> = {
      doctor: 'Doctor Prescription',
      'walk-in': 'Walk-in',
      admission: 'Admission',
      emergency: 'Emergency',
    };
    return labels[String(source || '')] || source || '—';
  }

  statusLabel(status?: string): string {
    return String(status || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  resultModeLabel(mode?: string): string {
    const labels: Record<string, string> = {
      structured: 'Structured Entry',
      uploaded_report: 'Upload Report',
      both: 'Structured + Upload',
    };
    return labels[String(mode || '')] || 'Structured Entry';
  }

  trendLabel(trend?: string): string {
    const labels: Record<string, string> = {
      improved: 'Improving',
      worsened: 'Worsening',
      stable: 'Stable',
      unknown: 'Unknown',
    };
    return labels[String(trend || '')] || this.statusLabel(trend);
  }

  orderStatusClass(status?: string): string {
    return `status-${String(status || 'ordered').replace(/_/g, '-')}`;
  }

  paramStatusClass(status?: string): string {
    return `param-${String(status || 'unknown').replace(/_/g, '-')}`;
  }

  trendClass(trend?: string): string {
    return `trend-${String(trend || 'unknown').replace(/_/g, '-')}`;
  }

  isStepDone(step: LabOrderStatus): boolean {
    const steps = ['ordered', 'sample_collected', 'processing', 'result_entered', 'verified', 'completed'];
    const current = this.workflowStatus();
    return steps.indexOf(step) <= steps.indexOf(current);
  }

  isStepCurrent(step: LabOrderStatus): boolean {
    return this.workflowStatus() === step;
  }

  private workflowStatus(): LabOrderStatus {
    const status = this.order?.status || 'ordered';
    return status === 'verified' ? 'completed' : status;
  }

  statusClass(status?: string): string {
    return this.orderStatusClass(status);
  }

  buildLabReportDocumentHtml = (): string => {
    if (!this.order || !isLabOrderReportReady(this.order)) return '';
    return buildLabOrderReportHtml({
      order: this.order,
      hospital: this.hospital,
      comparison: this.comparison,
      reportGeneratedBy: this.currentUser(),
    });
  };

  private currentUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    } catch {
      return null;
    }
  }
}

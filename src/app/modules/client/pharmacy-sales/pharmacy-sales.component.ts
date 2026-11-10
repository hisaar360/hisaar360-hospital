import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AppDialogService } from '../../../core/services/app-dialog.service';
import { BackendService } from '../../../core/services/backend.service';
import { downloadExcelWorkbook } from '../../../core/utils/excel-export.util';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';
import { PharmacySaleReturnModalComponent } from '../../../shared/components/pharmacy-sale-return-modal/pharmacy-sale-return-modal.component';
import { PharmacyOpenReturnModalComponent } from '../../../shared/components/pharmacy-open-return-modal/pharmacy-open-return-modal.component';
import { Sale, SalesReturn, Store } from '../../../shared/models/hospital.model';
import { formatCurrency, formatDateTime, readAssignedStoreId } from '../pharmacy-admin.utils';
import { buildPharmacyReportHtml } from '../pharmacy-export.util';

@Component({
  selector: 'app-pharmacy-sales',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    HmsDocumentToolbarComponent,
    PharmacySaleReturnModalComponent,
    PharmacyOpenReturnModalComponent,
  ],
  templateUrl: './pharmacy-sales.component.html',
  styleUrl: './pharmacy-sales.component.scss',
})
export class PharmacySalesComponent implements OnInit {
  stores: Store[] = [];
  sales: Sale[] = [];
  loading = false;
  storeId = readAssignedStoreId();
  status = '';
  fromDate = '';
  toDate = '';
  nearExpiryOnly = false;
  returnModalOpen = false;
  returnSaleId: string | null = null;
  openReturnModalOpen = false;

  readonly getExportHtml = () =>
    buildPharmacyReportHtml(
      'Pharmacy Sales',
      [
        { header: 'Invoice', key: 'invoiceNo' },
        { header: 'Date', key: 'saleDate' },
        { header: 'Status', key: 'status' },
        { header: 'Payment', key: 'paymentStatus' },
        { header: 'Near-expiry lines', key: 'nearExpiry' },
        { header: 'Total', key: 'total' },
        { header: 'Paid', key: 'paidAmount' },
        { header: 'Balance', key: 'balance' },
      ],
      this.exportRows(),
    );

  constructor(
    private backend: BackendService,
    private dialog: AppDialogService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.nearExpiryOnly = params.get('nearExpiryOnly') === 'true';
      this.loadSales();
    });
    this.loadStores();
  }

  loadStores(): void {
    if (!this.backend.hasPermission('stores.read')) {
      return;
    }

    this.backend.getStores({ limit: 100, isActive: true }).subscribe({
      next: (result) => (this.stores = result.items),
      error: () => (this.stores = []),
    });
  }

  loadSales(): void {
    this.loading = true;
    this.backend
      .getSales({
        limit: 100,
        storeId: this.storeId || undefined,
        status: this.status || undefined,
        nearExpiryOnly: this.nearExpiryOnly ? 'true' : undefined,
        fromDate: this.fromDate ? new Date(`${this.fromDate}T00:00:00`).toISOString() : undefined,
        toDate: this.toDate ? new Date(`${this.toDate}T23:59:59`).toISOString() : undefined,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => (this.sales = result.items),
        error: (err) => {
          this.sales = [];
          this.toastr.error(err?.error?.message || 'Unable to load sales.');
        },
      });
  }

  reset(): void {
    this.storeId = readAssignedStoreId();
    this.status = '';
    this.fromDate = '';
    this.toDate = '';
    this.nearExpiryOnly = false;
    this.loadSales();
  }

  nearExpiryLineCount(sale: Sale): number {
    return (sale.items || []).filter((item) => item.nearExpirySale).length;
  }

  hasNearExpiry(sale: Sale): boolean {
    return this.nearExpiryLineCount(sale) > 0;
  }

  nearExpiryLabel(sale: Sale): string {
    const count = this.nearExpiryLineCount(sale);
    if (count <= 0) {
      return 'None';
    }
    return count === 1 ? '1 near-expiry item' : `${count} near-expiry items`;
  }

  nearExpiryHint(sale: Sale): string {
    const count = this.nearExpiryLineCount(sale);
    if (count <= 0) {
      return 'No medicines on this bill were sold from a near-expiry batch.';
    }
    return count === 1
      ? '1 medicine on this bill was sold from a batch expiring within 6 months.'
      : `${count} medicines on this bill were sold from batches expiring within 6 months.`;
  }

  canCancel(sale: Sale): boolean {
    return this.backend.hasPermission('sales.cancel') && sale.status === 'completed';
  }

  canReturn(sale: Sale): boolean {
    if (String(sale._id || '').startsWith('local-')) {
      return false;
    }
    const canCreate =
      this.backend.hasPermission('returns.create') ||
      this.backend.hasPermission('*');
    return canCreate && ['completed', 'returned'].includes(sale.status);
  }

  openReturn(sale: Sale): void {
    if (!this.canReturn(sale)) {
      return;
    }
    this.returnSaleId = sale._id;
    this.returnModalOpen = true;
  }

  closeReturnModal(): void {
    this.returnModalOpen = false;
    this.returnSaleId = null;
  }

  onReturnCompleted(salesReturn: SalesReturn): void {
    this.toastr.success(
      `Sales return ${salesReturn.returnNo || salesReturn._id} completed successfully.`,
    );
    this.closeReturnModal();
    this.loadSales();
  }

  canOpenRandomReturn(): boolean {
    return this.backend.hasPermission('returns.create') || this.backend.hasPermission('*');
  }

  openRandomReturn(): void {
    if (!this.canOpenRandomReturn()) {
      this.toastr.warning('You do not have permission to create returns.');
      return;
    }
    this.openReturnModalOpen = true;
  }

  closeOpenReturnModal(): void {
    this.openReturnModalOpen = false;
  }

  onOpenReturnCompleted(salesReturn: SalesReturn): void {
    const direction = salesReturn.settlementDirection || 'even';
    const settleHint =
      direction === 'collect'
        ? `Received ${formatCurrency(salesReturn.collectAmount || 0)}`
        : direction === 'refund'
          ? `Refunded ${formatCurrency(salesReturn.refundAmount || 0)}`
          : 'Even exchange';
    this.toastr.success(
      `Random return ${salesReturn.returnNo || salesReturn._id} completed. ${settleHint}.`,
    );
    this.closeOpenReturnModal();
    this.loadSales();
  }

  get totalSales(): number {
    return this.sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  }

  get totalPaid(): number {
    return this.sales.reduce((sum, sale) => sum + Number(sale.paidAmount || 0), 0);
  }

  get totalItems(): number {
    return this.sales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);
  }

  get unpaidCount(): number {
    return this.sales.filter((sale) => String(sale.paymentStatus || '').toLowerCase() !== 'paid').length;
  }

  statusClass(status?: string): string {
    return `status-${String(status || 'draft').replace(/_/g, '-')}`;
  }

  paymentStatusClass(status?: string): string {
    const value = String(status || '').toLowerCase();
    if (value === 'paid') {
      return 'status-paid';
    }
    if (value === 'unpaid' || value === 'partial' || value === 'partially_paid') {
      return 'status-unpaid';
    }
    return this.statusClass(status);
  }

  exportExcel(): void {
    downloadExcelWorkbook('pharmacy-sales', [
      {
        name: 'Sales',
        columns: [
          { header: 'Invoice', key: 'invoiceNo' },
          { header: 'Date', key: 'saleDate' },
          { header: 'Status', key: 'status' },
          { header: 'Payment', key: 'paymentStatus' },
          { header: 'Total', key: 'total' },
          { header: 'Paid', key: 'paidAmount' },
          { header: 'Balance', key: 'balance' },
        ],
        rows: this.exportRows(),
      },
    ]);
  }

  async cancel(sale: Sale): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'Cancel Sale',
      message: `Cancel ${sale.invoiceNo}? This will reverse stock.`,
      confirmText: 'Cancel Sale',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    this.backend.cancelSale(sale._id).subscribe({
      next: () => {
        this.toastr.success('Sale cancelled.');
        this.loadSales();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Unable to cancel sale.'),
    });
  }

  currency(value: number | string | null | undefined): string {
    return formatCurrency(value);
  }

  dateTime(value: string | null | undefined): string {
    return formatDateTime(value);
  }

  private exportRows(): Array<Record<string, unknown>> {
    return this.sales.map((sale) => {
      const total = Number(sale.total || 0);
      const paid = Number(sale.paidAmount || 0);
      return {
        nearExpiry: this.nearExpiryLineCount(sale),
        invoiceNo: sale.invoiceNo,
        saleDate: this.dateTime(sale.saleDate),
        status: sale.status,
        paymentStatus: sale.paymentStatus,
        total: this.currency(total),
        paidAmount: this.currency(paid),
        balance: this.currency(Math.max(total - paid, 0)),
      };
    });
  }
}

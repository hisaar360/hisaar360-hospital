import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { BackendService } from '../../../core/services/backend.service';
import { Sale, SalesReturn, Store } from '../../../shared/models/hospital.model';
import { formatCurrency, formatDate, readAssignedStoreId, toDateInputValue } from '../pharmacy-admin.utils';

interface SalesReturnLine {
  productId: string;
  name?: string;
  sku?: string;
  soldQty: number;
  returnedQty: number;
  unitPrice: number;
  qty: number;
  reason: string;
}

@Component({
  selector: 'app-pharmacy-sales-returns',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pharmacy-sales-returns.component.html',
  styleUrl: './pharmacy-sales-returns.component.scss',
})
export class PharmacySalesReturnsComponent implements OnInit {
  stores: Store[] = [];
  returns: SalesReturn[] = [];
  sales: Sale[] = [];
  loading = false;
  saving = false;
  modalOpen = false;
  salesLoading = false;
  storeId = readAssignedStoreId();
  fromDate = '';
  toDate = '';
  saleSearch = '';
  selectedSaleId = '';
  selectedSale: Sale | null = null;
  returnDate = toDateInputValue(new Date());
  refundAmount = 0;
  refundTouched = false;
  paymentMethod = 'cash';
  previousRefund = 0;
  returnLines: SalesReturnLine[] = [];

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadStores();
    this.loadReturns();
  }

  get refundTotal(): number {
    return this.returns.reduce((sum, item) => sum + Number(item.refundAmount || 0), 0);
  }

  get returnValueTotal(): number {
    return this.returns.reduce((sum, item) => sum + Number(item.total || 0), 0);
  }

  get itemTotal(): number {
    return this.returns.reduce((sum, item) => sum + (item.items?.length || 0), 0);
  }

  get completedCount(): number {
    return this.returns.filter((item) => String(item.status || '').toLowerCase() === 'completed').length;
  }

  get filteredSales(): Sale[] {
    const query = this.saleSearch.trim().toLowerCase();
    if (!query) {
      return this.sales;
    }
    return this.sales.filter((sale) => String(sale.invoiceNo || '').toLowerCase().includes(query));
  }

  get returnValue(): number {
    return this.round(
      this.returnLines.reduce((sum, line) => sum + Number(line.qty || 0) * line.unitPrice, 0),
    );
  }

  get returnQtyTotal(): number {
    return this.returnLines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  }

  get maxRefund(): number {
    if (!this.selectedSale) {
      return 0;
    }
    const refundable = Math.max(Number(this.selectedSale.paidAmount || 0) - this.previousRefund, 0);
    return this.round(Math.min(refundable, this.returnValue));
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

  loadReturns(): void {
    this.loading = true;
    this.backend.listSalesReturns({
      limit: 100,
      storeId: this.storeId || undefined,
      fromDate: this.fromDate ? new Date(`${this.fromDate}T00:00:00`).toISOString() : undefined,
      toDate: this.toDate ? new Date(`${this.toDate}T23:59:59`).toISOString() : undefined,
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => (this.returns = result.items),
        error: (err) => {
          this.returns = [];
          this.toastr.error(err?.error?.message || 'Unable to load sales returns.');
        },
      });
  }

  reset(): void {
    this.storeId = readAssignedStoreId();
    this.fromDate = '';
    this.toDate = '';
    this.loadReturns();
  }

  openCreate(): void {
    this.modalOpen = true;
    this.saleSearch = '';
    this.clearSelection();
    this.returnDate = toDateInputValue(new Date());
    this.loadSales();
  }

  loadSales(invoiceNo?: string): void {
    this.salesLoading = true;
    this.backend
      .getSales({
        limit: 100,
        storeId: this.storeId || undefined,
        status: 'completed',
        invoiceNo: invoiceNo ? invoiceNo.toUpperCase() : undefined,
      })
      .pipe(finalize(() => (this.salesLoading = false)))
      .subscribe({
        next: (result) => {
          if (invoiceNo) {
            const found = result.items || [];
            this.sales = [...found, ...this.sales.filter((sale) => !found.some((hit) => hit._id === sale._id))];
          } else {
            this.sales = result.items || [];
          }
        },
        error: () => {
          if (!invoiceNo) {
            this.sales = [];
          }
        },
      });
  }

  searchInvoice(event: Event): void {
    event.preventDefault();
    const query = this.saleSearch.trim();
    if (!query) {
      return;
    }
    const exact = this.sales.find((sale) => String(sale.invoiceNo || '').toLowerCase() === query.toLowerCase());
    if (exact) {
      this.chooseSale(exact);
      return;
    }
    this.loadSales(query);
  }

  closeModal(): void {
    if (!this.saving) {
      this.modalOpen = false;
    }
  }

  chooseSale(sale: Sale): void {
    this.selectedSaleId = sale._id;
    this.selectedSale = sale;
    this.refundTouched = false;
    this.previousRefund = 0;
    this.returnLines = (sale.items || []).map((item) => ({
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      soldQty: Number(item.qty || 0),
      returnedQty: 0,
      unitPrice: this.lineUnitNet(item.qty, item.unitPrice, item.discount),
      qty: 0,
      reason: '',
    }));
    this.refundAmount = 0;

    this.backend.listSalesReturns({ saleId: sale._id, limit: 100 }).subscribe({
      next: (result) => {
        if (this.selectedSaleId !== sale._id) {
          return;
        }
        const previous = (result.items || []).filter((item) => item.status === 'completed');
        this.previousRefund = previous.reduce((sum, item) => sum + Number(item.refundAmount || 0), 0);
        for (const line of this.returnLines) {
          line.returnedQty = previous.reduce(
            (sum, record) =>
              sum +
              (record.items || [])
                .filter((item) => String(item.productId) === String(line.productId))
                .reduce((acc, item) => acc + Number(item.qty || 0), 0),
            0,
          );
        }
        this.syncRefund();
      },
    });
  }

  clearSelection(): void {
    this.selectedSaleId = '';
    this.selectedSale = null;
    this.returnLines = [];
    this.refundAmount = 0;
    this.refundTouched = false;
    this.previousRefund = 0;
    this.paymentMethod = 'cash';
  }

  remaining(line: SalesReturnLine): number {
    return Math.max(line.soldQty - line.returnedQty, 0);
  }

  setLineQty(line: SalesReturnLine, value: number): void {
    const qty = Number(value || 0);
    line.qty = Math.min(Math.max(Number.isFinite(qty) ? qty : 0, 0), this.remaining(line));
    this.syncRefund();
  }

  returnAll(): void {
    this.returnLines.forEach((line) => (line.qty = this.remaining(line)));
    this.syncRefund();
  }

  clearQty(): void {
    this.returnLines.forEach((line) => (line.qty = 0));
    this.syncRefund();
  }

  onRefundChange(value: number): void {
    this.refundTouched = true;
    this.refundAmount = Math.min(Math.max(Number(value || 0), 0), this.maxRefund);
  }

  save(): void {
    if (!this.selectedSale) {
      this.toastr.error('Choose a sale first.');
      return;
    }

    const items = this.returnLines
      .filter((line) => Number(line.qty) > 0)
      .map((line) => ({
        productId: line.productId,
        qty: Number(line.qty),
        reason: line.reason.trim() || undefined,
      }));

    if (!items.length) {
      this.toastr.error('Add at least one return quantity.');
      return;
    }

    this.saving = true;
    this.backend.createSalesReturn({
      saleId: this.selectedSale._id,
      returnDate: this.returnDate,
      items,
      refundAmount: this.round(Math.min(Number(this.refundAmount || 0), this.maxRefund)),
      paymentMethod: this.paymentMethod as 'cash' | 'card' | 'bank',
    }).subscribe({
      next: () => {
        this.saving = false;
        this.modalOpen = false;
        this.toastr.success('Sales return created.');
        this.loadReturns();
      },
      error: (err) => {
        this.saving = false;
        this.toastr.error(err?.error?.message || 'Unable to create sales return.');
      },
    });
  }

  saleLabel(item: SalesReturn): string {
    return item.invoiceNo || '-';
  }

  statusClass(status?: string): string {
    return `pharmacy-status-pill status-${String(status || 'draft').replace(/_/g, '-')}`;
  }

  currency(value: number | string | null | undefined): string {
    return formatCurrency(value);
  }

  date(value: string | null | undefined): string {
    return formatDate(value);
  }

  private syncRefund(): void {
    if (!this.refundTouched) {
      this.refundAmount = this.maxRefund;
    } else if (this.refundAmount > this.maxRefund) {
      this.refundAmount = this.maxRefund;
    }
  }

  private lineUnitNet(qty: unknown, unitPrice: unknown, discount: unknown): number {
    const price = Number(unitPrice || 0);
    const units = Number(qty || 0);
    const disc = Number(discount || 0);
    if (!units || !disc) {
      return price;
    }
    return Math.max(price - disc / units, 0);
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}

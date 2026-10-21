import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { BackendService } from '../../../core/services/backend.service';
import { downloadExcelWorkbook } from '../../../core/utils/excel-export.util';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';
import { ProductCatalogItem, StockLot, Store } from '../../../shared/models/hospital.model';
import { formatCurrency, normalizeText, readAssignedStoreId } from '../pharmacy-admin.utils';
import {
  getPharmacyExpiryTone,
  pharmacyExpiryBadgeClass,
  pharmacyExpiryLabel,
} from '../pharmacy-expiry.util';
import { buildPharmacyReportHtml } from '../pharmacy-export.util';

@Component({
  selector: 'app-pharmacy-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HmsDocumentToolbarComponent],
  templateUrl: './pharmacy-inventory.component.html',
  styleUrl: './pharmacy-inventory.component.scss',
})
export class PharmacyInventoryComponent implements OnInit {
  stores: Store[] = [];
  products: ProductCatalogItem[] = [];
  filteredProducts: ProductCatalogItem[] = [];
  loading = false;
  savingAdjust = false;
  search = '';
  storeId = readAssignedStoreId();
  lowStockOnly = false;
  outOfStockOnly = false;
  expiryFilter: '' | 'expired' | 'near_expiry' | 'valid' = '';
  adjustModalOpen = false;
  adjustProduct: ProductCatalogItem | null = null;
  adjustLot: StockLot | null = null;
  adjustType: 'INCREASE' | 'DECREASE' = 'INCREASE';
  adjustQty: number | null = null;
  adjustNote = '';
  adjustReason: 'MANUAL_ADJUSTMENT' | 'WRITE_OFF' | 'EXPIRED' | 'DAMAGE' = 'MANUAL_ADJUSTMENT';
  expandedProductId = '';
  lotsByProductId: Record<string, StockLot[]> = {};
  lotsLoadingId = '';
  writingOffLotId = '';

  readonly getExportHtml = () =>
    buildPharmacyReportHtml(
      'Pharmacy Inventory',
      [
        { header: 'Medicine', key: 'name' },
        { header: 'SKU', key: 'sku' },
        { header: 'Brand', key: 'brand' },
        { header: 'Batch', key: 'batchNumber' },
        { header: 'Expiry', key: 'expiryDate' },
        { header: 'Available', key: 'available' },
        { header: 'Status', key: 'status' },
        { header: 'Cost', key: 'cost' },
        { header: 'Retail', key: 'retail' },
        { header: 'Valuation', key: 'valuation' },
      ],
      this.exportRows(),
    );

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const expiryStatus = params.get('expiryStatus');
      if (
        expiryStatus === 'expired' ||
        expiryStatus === 'near_expiry' ||
        expiryStatus === 'valid'
      ) {
        this.expiryFilter = expiryStatus;
      }
      if (params.get('lowStock') === 'true' || params.get('lowStock') === '1') {
        this.lowStockOnly = true;
      }
      if (params.get('outOfStock') === 'true' || params.get('outOfStock') === '1') {
        this.outOfStockOnly = true;
      }
    });
    this.loadStores();
  }

  get totalUnits(): number {
    return this.filteredProducts.reduce((sum, product) => sum + this.qty(product), 0);
  }

  get totalRetailValue(): number {
    return this.filteredProducts.reduce((sum, product) => sum + this.qty(product) * this.price(product), 0);
  }

  get totalCostValue(): number {
    return this.filteredProducts.reduce((sum, product) => sum + this.qty(product) * this.cost(product), 0);
  }

  get lowStockCount(): number {
    return this.filteredProducts.filter((product) => this.isLowStock(product)).length;
  }

  get inventoryMode(): 'all' | 'low' | 'out' {
    if (this.outOfStockOnly) {
      return 'out';
    }
    if (this.lowStockOnly) {
      return 'low';
    }
    return 'all';
  }

  onInventoryModeChange(mode: 'all' | 'low' | 'out'): void {
    this.lowStockOnly = mode === 'low';
    this.outOfStockOnly = mode === 'out';
    this.applyFilters();
  }

  isLowStock(product: ProductCatalogItem): boolean {
    return this.qty(product) <= this.reorder(product);
  }

  loadStores(): void {
    if (!this.backend.hasPermission('stores.read')) {
      this.loadInventory();
      return;
    }

    this.backend.getStores({ limit: 100, isActive: true }).subscribe({
      next: (result) => {
        this.stores = result.items || [];
        if (!this.storeId && this.stores[0]?._id) {
          this.storeId = this.stores[0]._id;
        }
        this.loadInventory();
      },
      error: () => {
        this.stores = [];
        this.loadInventory();
      },
    });
  }

  loadInventory(): void {
    this.loading = true;
    this.lotsByProductId = {};
    this.expandedProductId = '';
    this.backend.getProducts({
      limit: 500,
      isActive: true,
      storeId: this.storeId || undefined,
      ...(this.expiryFilter ? { expiryStatus: this.expiryFilter } : {}),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.products = result.items;
          this.applyFilters();
        },
        error: (err) => {
          this.products = [];
          this.filteredProducts = [];
          this.toastr.error(err?.error?.message || 'Unable to load inventory.');
        },
      });
  }

  applyFilters(): void {
    const query = normalizeText(this.search);
    this.filteredProducts = this.products.filter((product) => {
      const matchesSearch =
        !query ||
        normalizeText([
          product.name,
          product.sku,
          product.barcode,
          product.batchNumber,
          product.nearestLotNumber,
          product.brand,
        ].join(' ')).includes(query);
      const qty = this.qty(product);
      const matchesLowStock = !this.lowStockOnly || qty <= this.reorder(product);
      const matchesOutOfStock = !this.outOfStockOnly || qty <= 0;
      return matchesSearch && matchesLowStock && matchesOutOfStock;
    });
  }

  qty(product: ProductCatalogItem): number {
    return Number(product.availableQuantity ?? product.stockQuantity ?? 0) || 0;
  }

  reorder(product: ProductCatalogItem): number {
    return Number(product.reorderLevel ?? 0) || 0;
  }

  price(product: ProductCatalogItem): number {
    return Number(product.sellingPrice ?? 0) || 0;
  }

  cost(product: ProductCatalogItem): number {
    return Number(product.costPrice ?? 0) || 0;
  }

  currency(value: number | string | null | undefined): string {
    return formatCurrency(value);
  }

  productExpiryValue(product: ProductCatalogItem): string | null {
    return product.earliestLotExpiry || product.expiryDate || null;
  }

  expiryLabel(product: ProductCatalogItem): string {
    return pharmacyExpiryLabel(getPharmacyExpiryTone(this.productExpiryValue(product)));
  }

  expiryBadgeClass(product: ProductCatalogItem): string {
    return pharmacyExpiryBadgeClass(getPharmacyExpiryTone(this.productExpiryValue(product)));
  }

  lotExpiryLabel(lot: StockLot): string {
    return pharmacyExpiryLabel(getPharmacyExpiryTone(lot.expiryDate));
  }

  lotExpiryBadgeClass(lot: StockLot): string {
    return pharmacyExpiryBadgeClass(getPharmacyExpiryTone(lot.expiryDate));
  }

  lotQty(lot: StockLot): number {
    return Number(lot.availableQuantity ?? lot.quantity ?? 0) || 0;
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString();
  }

  toggleLots(product: ProductCatalogItem): void {
    if (this.expandedProductId === product._id) {
      this.expandedProductId = '';
      return;
    }

    this.expandedProductId = product._id;
    if (this.lotsByProductId[product._id] || !this.storeId) {
      return;
    }

    this.lotsLoadingId = product._id;
    this.backend
      .getProductStockOptions(product._id, { storeId: this.storeId })
      .pipe(finalize(() => (this.lotsLoadingId = '')))
      .subscribe({
        next: (result) => {
          this.lotsByProductId[product._id] = result.lots || [];
        },
        error: (err) => {
          this.lotsByProductId[product._id] = [];
          this.toastr.error(err?.error?.message || 'Unable to load batches.');
        },
      });
  }

  exportExcel(): void {
    downloadExcelWorkbook('pharmacy-inventory', [
      {
        name: 'Inventory',
        columns: [
          { header: 'Medicine', key: 'name' },
          { header: 'SKU', key: 'sku' },
          { header: 'Brand', key: 'brand' },
          { header: 'Batch', key: 'batchNumber' },
          { header: 'Expiry', key: 'expiryDate' },
          { header: 'Available', key: 'available' },
          { header: 'Status', key: 'status' },
          { header: 'Cost', key: 'cost' },
          { header: 'Retail', key: 'retail' },
          { header: 'Valuation', key: 'valuation' },
        ],
        rows: this.exportRows(),
      },
    ]);
  }

  private exportRows(): Array<Record<string, unknown>> {
    return this.filteredProducts.map((product) => ({
      name: product.name,
      sku: product.sku || '',
      brand: product.brand || '',
      batchNumber: product.nearestLotNumber || product.batchNumber || '-',
      expiryDate: this.productExpiryValue(product) || '-',
      available: this.qty(product),
      status: this.isLowStock(product) ? 'Low Stock' : 'In Stock',
      cost: this.currency(product.costPrice),
      retail: this.currency(product.sellingPrice),
      valuation: this.currency(this.qty(product) * this.price(product)),
    }));
  }

  canAdjust(): boolean {
    return this.backend.hasPermission('inventory.adjust') && Boolean(this.storeId);
  }

  get adjustCurrentQty(): number {
    if (this.adjustLot) {
      return this.lotQty(this.adjustLot);
    }
    return this.adjustProduct ? this.qty(this.adjustProduct) : 0;
  }

  get adjustEnteredQty(): number {
    const quantity = Number(this.adjustQty);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  }

  get adjustNextQty(): number {
    if (this.adjustType === 'DECREASE') {
      return Math.max(this.adjustCurrentQty - this.adjustEnteredQty, 0);
    }
    return this.adjustCurrentQty + this.adjustEnteredQty;
  }

  get adjustShortfall(): boolean {
    return this.adjustType === 'DECREASE' && this.adjustEnteredQty > this.adjustCurrentQty;
  }

  openAdjust(product: ProductCatalogItem, lot: StockLot | null = null): void {
    this.adjustProduct = product;
    this.adjustLot = lot;
    this.adjustType = lot ? 'DECREASE' : 'INCREASE';
    this.adjustQty = lot ? this.lotQty(lot) : null;
    this.adjustNote = lot ? `Write-off batch ${lot.lotNumber || lot._id}` : '';
    this.adjustReason = lot ? 'WRITE_OFF' : 'MANUAL_ADJUSTMENT';
    this.adjustModalOpen = true;
  }

  writeOffLot(product: ProductCatalogItem, lot: StockLot): void {
    if (!this.storeId) {
      this.toastr.error('Select a store before writing off a batch.');
      return;
    }

    const quantity = this.lotQty(lot);
    if (quantity <= 0) {
      this.toastr.error('This batch has no available quantity.');
      return;
    }

    this.writingOffLotId = lot._id;
    this.backend
      .adjustInventory({
        productId: product._id,
        locationType: 'store',
        locationId: this.storeId,
        adjustmentType: 'DECREASE',
        quantity,
        reason: getPharmacyExpiryTone(lot.expiryDate) === 'expired' ? 'EXPIRED' : 'WRITE_OFF',
        lotId: lot._id,
        lotNumber: lot.lotNumber || undefined,
        expiryDate: lot.expiryDate || undefined,
        note: `Write-off batch ${lot.lotNumber || lot._id}`,
      })
      .pipe(finalize(() => (this.writingOffLotId = '')))
      .subscribe({
        next: () => {
          this.toastr.success('Batch written off.');
          delete this.lotsByProductId[product._id];
          this.loadInventory();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to write off batch.'),
      });
  }

  dismissAdjust(): void {
    if (!this.savingAdjust) {
      this.adjustModalOpen = false;
      this.adjustProduct = null;
      this.adjustLot = null;
    }
  }

  submitAdjust(): void {
    if (!this.adjustProduct || !this.storeId) {
      this.toastr.error('Select a store before adjusting stock.');
      return;
    }

    const quantity = Number(this.adjustQty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.toastr.error('Enter a valid adjustment quantity.');
      return;
    }
    if (this.adjustType === 'DECREASE' && quantity > this.adjustCurrentQty) {
      this.toastr.error('Decrease quantity is higher than current stock.');
      return;
    }

    this.savingAdjust = true;
    this.backend
      .adjustInventory({
        productId: this.adjustProduct._id,
        locationType: 'store',
        locationId: this.storeId,
        adjustmentType: this.adjustType,
        quantity,
        reason: this.adjustReason,
        note: this.adjustNote.trim() || undefined,
        ...(this.adjustLot
          ? {
              lotId: this.adjustLot._id,
              lotNumber: this.adjustLot.lotNumber || undefined,
              expiryDate: this.adjustLot.expiryDate || undefined,
            }
          : {}),
      })
      .pipe(finalize(() => (this.savingAdjust = false)))
      .subscribe({
        next: () => {
          this.toastr.success(this.adjustLot ? 'Batch adjusted.' : 'Stock adjusted.');
          this.adjustModalOpen = false;
          if (this.adjustProduct) {
            delete this.lotsByProductId[this.adjustProduct._id];
          }
          this.adjustProduct = null;
          this.adjustLot = null;
          this.loadInventory();
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to adjust stock.'),
      });
  }
}

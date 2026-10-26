import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AppDialogService } from '../../../core/services/app-dialog.service';
import { BackendService } from '../../../core/services/backend.service';
import { Payment, ProductCatalogItem, Supplier, Warehouse } from '../../../shared/models/hospital.model';
import { formatCurrency, formatDate, toDateInputValue } from '../pharmacy-admin.utils';

const PURCHASE_SEARCH_LIMIT = 25;

interface PurchaseLineForm {
  productId: string;
  productLabel: string;
  sku: string;
  qty: number;
  unitCost: number;
  discount: number;
  tax: number;
  batchNumber: string;
  expiryDate: string;
}

interface SupplierSummaryRow {
  supplierId: string;
  name: string;
  phone: string;
  city: string;
  creditLimit: number;
  openingBalance: number;
  billCount: number;
  openOrderCount: number;
  openOrderValue: number;
  totalPurchased: number;
  totalPaid: number;
  returnCredit: number;
  pending: number;
  availableCredit: number;
  lastPurchaseDate: string | null;
}

interface SupplierSummaryTotals {
  totalPurchased: number;
  totalPaid: number;
  returnCredit: number;
  pending: number;
  billCount: number;
  openOrderCount: number;
  vendorsWithDues: number;
}

interface SupplierHistoryEntry {
  type: 'purchase' | 'payment' | 'return';
  date: string;
  reference: string;
  purchaseId: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface PurchaseReturnLine {
  productId: string;
  name: string;
  sku: string;
  purchasedQty: number;
  returnedQty: number;
  unitCost: number;
  qty: number;
  reason: string;
}

const EMPTY_TOTALS: SupplierSummaryTotals = {
  totalPurchased: 0,
  totalPaid: 0,
  returnCredit: 0,
  pending: 0,
  billCount: 0,
  openOrderCount: 0,
  vendorsWithDues: 0,
};

@Component({
  selector: 'app-pharmacy-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pharmacy-purchases.component.html',
  styleUrl: './pharmacy-purchases.component.scss',
})
export class PharmacyPurchasesComponent implements OnInit, OnDestroy {
  view: 'list' | 'create' | 'detail' | 'returns' = 'list';
  listTab: 'bills' | 'vendors' | 'history' = 'bills';
  loading = false;
  saving = false;
  purchases: Array<Record<string, unknown>> = [];
  purchase: Record<string, unknown> | null = null;
  purchasePayments: Payment[] = [];
  purchaseReturnsForDetail: Array<Record<string, unknown>> = [];
  returns: Array<Record<string, unknown>> = [];
  suppliers: Supplier[] = [];
  warehouses: Warehouse[] = [];
  products: ProductCatalogItem[] = [];

  status = '';
  supplierFilter = '';
  fromDate = '';
  toDate = '';
  invoiceSearch = '';

  summaryLoading = false;
  summaryTotals: SupplierSummaryTotals = { ...EMPTY_TOTALS };
  summaryRows: SupplierSummaryRow[] = [];
  vendorHistory: SupplierHistoryEntry[] = [];
  vendorSearch = '';
  createSupplierRow: SupplierSummaryRow | null = null;

  form = this.emptyForm();
  warehouseCreateOpen = false;
  creatingWarehouse = false;
  warehouseForm = { name: '', code: '' };

  quickSearch = '';
  quickResults: ProductCatalogItem[] = [];
  quickLoading = false;
  quickOpen = false;
  quickResolving = false;
  private quickTimer: ReturnType<typeof setTimeout> | null = null;
  private quickSeq = 0;

  payOpen = false;
  payTarget: Record<string, unknown> | null = null;
  payForm = { amount: 0, method: 'cash', paymentDate: toDateInputValue(new Date()), referenceNo: '', note: '' };

  returnOpen = false;
  returnSearch = '';
  returnCandidates: Array<Record<string, unknown>> = [];
  returnCandidatesLoading = false;
  returnPurchase: Record<string, unknown> | null = null;
  returnLines: PurchaseReturnLine[] = [];
  returnPrevRefund = 0;
  returnDate = toDateInputValue(new Date());
  returnRefund = 0;
  returnRefundTouched = false;
  returnMethod = 'cash';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backend: BackendService,
    private dialog: AppDialogService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.view = (data['purchasesView'] as typeof this.view) || 'list';
      this.refresh();
    });
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.view = 'detail';
        this.loadPurchase(id);
      }
    });
    this.route.queryParamMap.subscribe((params) => {
      const supplierId = params.get('supplierId') || '';
      if (supplierId && supplierId !== this.supplierFilter) {
        this.supplierFilter = supplierId;
        if (this.view === 'list') {
          this.listTab = 'history';
          this.applyFilters();
        }
      }
    });
    this.backend.getSuppliers({ limit: 100 }).subscribe({
      next: (result) => (this.suppliers = result.items),
      error: () => (this.suppliers = []),
    });
    this.loadWarehouses();
    this.backend.getProducts({ limit: 100, isActive: true }).subscribe({
      next: (result) => (this.products = result.items),
      error: () => (this.products = []),
    });
  }

  ngOnDestroy(): void {
    if (this.quickTimer) {
      clearTimeout(this.quickTimer);
      this.quickTimer = null;
    }
  }

  get canCreate(): boolean {
    return this.backend.hasPermission('purchases.create');
  }

  get canReceive(): boolean {
    return this.backend.hasPermission('purchases.receive');
  }

  get canCancel(): boolean {
    return this.backend.hasPermission('purchases.cancel');
  }

  get canManageWarehouses(): boolean {
    return this.backend.hasPermission('warehouses.manage');
  }

  get canPay(): boolean {
    return this.backend.hasPermission('payments.create');
  }

  get canCreateReturn(): boolean {
    return this.backend.hasPermission('purchase_returns.create');
  }

  get visiblePurchases(): Array<Record<string, unknown>> {
    const query = this.invoiceSearch.trim().toLowerCase();
    if (!query) {
      return this.purchases;
    }
    return this.purchases.filter((item) =>
      [item['invoiceNo'], item['supplierInvoiceNo'], this.supplierName(item)]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(query))
    );
  }

  get visibleVendors(): SupplierSummaryRow[] {
    const query = this.vendorSearch.trim().toLowerCase();
    if (!query) {
      return this.summaryRows;
    }
    return this.summaryRows.filter((row) =>
      [row.name, row.phone, row.city].some((value) => String(value || '').toLowerCase().includes(query))
    );
  }

  get selectedVendorRow(): SupplierSummaryRow | null {
    if (!this.supplierFilter) {
      return null;
    }
    return this.summaryRows.find((row) => String(row.supplierId) === this.supplierFilter) || null;
  }

  get returnTotal(): number {
    return this.returns.reduce((sum, item) => sum + Number(item['total'] || 0), 0);
  }

  get returnRefundTotal(): number {
    return this.returns.reduce((sum, item) => sum + Number(item['refundAmount'] || 0), 0);
  }

  get returnCreditTotal(): number {
    return Math.max(this.returnTotal - this.returnRefundTotal, 0);
  }

  get formSubtotal(): number {
    return this.round(
      this.form.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitCost || 0), 0)
    );
  }

  get formDiscount(): number {
    return this.round(this.form.items.reduce((sum, item) => sum + Number(item.discount || 0), 0));
  }

  get formTax(): number {
    return this.round(this.form.items.reduce((sum, item) => sum + Number(item.tax || 0), 0));
  }

  get formItemsTotal(): number {
    return this.round(this.form.items.reduce((sum, item) => sum + this.lineTotal(item), 0));
  }

  get formQtyTotal(): number {
    return this.form.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }

  get formPaid(): number {
    if (this.form.status !== 'received') {
      return 0;
    }
    return Math.min(Math.max(Number(this.form.paidAmount || 0), 0), this.formItemsTotal);
  }

  get formCredit(): number {
    return this.round(Math.max(this.formItemsTotal - this.formPaid, 0));
  }

  get selectedSupplier(): Supplier | null {
    return this.suppliers.find((supplier) => supplier._id === this.form.supplierId) || null;
  }

  get supplierCreditHint(): string {
    const supplier = this.selectedSupplier;
    if (!supplier || this.view !== 'create') {
      return '';
    }
    const creditLimit = Number(supplier.creditLimit || 0);
    if (creditLimit <= 0) {
      return 'Credit not allowed for this supplier (limit is 0). Pay full amount.';
    }
    const remaining = this.createSupplierRow
      ? this.createSupplierRow.availableCredit
      : Math.max(creditLimit - this.partyOutstanding(supplier), 0);
    return `Credit available ${formatCurrency(remaining)} of ${formatCurrency(creditLimit)} limit.`;
  }

  get returnValue(): number {
    return this.round(
      this.returnLines.reduce((sum, line) => sum + Number(line.qty || 0) * line.unitCost, 0)
    );
  }

  get returnQtyTotal(): number {
    return this.returnLines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  }

  get returnMaxRefund(): number {
    if (!this.returnPurchase) {
      return 0;
    }
    const refundable = Math.max(Number(this.returnPurchase['paidAmount'] || 0) - this.returnPrevRefund, 0);
    return this.round(Math.min(refundable, this.returnValue));
  }

  get filteredReturnCandidates(): Array<Record<string, unknown>> {
    const query = this.returnSearch.trim().toLowerCase();
    if (!query) {
      return this.returnCandidates;
    }
    return this.returnCandidates.filter((item) =>
      [item['invoiceNo'], item['supplierInvoiceNo'], this.supplierName(item)]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(query))
    );
  }

  loadWarehouses(): void {
    this.backend.getWarehouses({ limit: 100, isActive: true }).subscribe({
      next: (result) => {
        this.warehouses = result.items || [];
        if (this.view === 'create' && !this.form.warehouseId && this.warehouses.length === 1) {
          this.form.warehouseId = this.warehouses[0]._id;
        }
      },
      error: () => (this.warehouses = []),
    });
  }

  openWarehouseCreate(): void {
    this.warehouseCreateOpen = true;
    this.warehouseForm = { name: '', code: '' };
  }

  createWarehouse(): void {
    const name = this.warehouseForm.name.trim();
    const code = this.warehouseForm.code.trim().toUpperCase();
    if (name.length < 2 || code.length < 2) {
      this.toastr.error('Warehouse name and code must be at least 2 characters');
      return;
    }
    this.creatingWarehouse = true;
    this.backend
      .createWarehouse({ name, code })
      .pipe(finalize(() => (this.creatingWarehouse = false)))
      .subscribe({
        next: (response) => {
          const warehouse = response.data;
          this.toastr.success('Warehouse created');
          this.warehouseCreateOpen = false;
          this.warehouseForm = { name: '', code: '' };
          if (warehouse?._id) {
            this.warehouses = [warehouse, ...this.warehouses.filter((item) => item._id !== warehouse._id)];
            this.form.warehouseId = warehouse._id;
          } else {
            this.loadWarehouses();
          }
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to create warehouse'),
      });
  }

  refresh(): void {
    if (this.view === 'returns') {
      this.loadReturns();
      return;
    }
    if (this.view === 'create') {
      return;
    }
    if (this.view !== 'detail') {
      this.applyFilters();
    }
  }

  applyFilters(): void {
    this.loadPurchases();
    this.loadSupplierSummary();
  }

  resetFilters(): void {
    this.status = '';
    this.supplierFilter = '';
    this.fromDate = '';
    this.toDate = '';
    this.invoiceSearch = '';
    if (this.listTab === 'history') {
      this.listTab = 'bills';
    }
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.applyFilters();
  }

  setTab(tab: 'bills' | 'vendors' | 'history'): void {
    this.listTab = tab;
  }

  openVendor(row: SupplierSummaryRow): void {
    this.supplierFilter = String(row.supplierId);
    this.listTab = 'history';
    void this.router.navigate([], { queryParams: { supplierId: this.supplierFilter }, replaceUrl: true });
    this.applyFilters();
  }

  onSupplierFilterChange(): void {
    if (!this.supplierFilter && this.listTab === 'history') {
      this.listTab = 'bills';
    }
    void this.router.navigate([], {
      queryParams: this.supplierFilter ? { supplierId: this.supplierFilter } : {},
      replaceUrl: true,
    });
    this.applyFilters();
  }

  loadPurchases(): void {
    this.loading = true;
    this.backend
      .getPurchases({
        limit: 100,
        status: this.status || undefined,
        supplierId: this.supplierFilter || undefined,
        ...this.dateParams(),
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => (this.purchases = result.items),
        error: (err) => {
          this.purchases = [];
          this.toastr.error(err?.error?.message || 'Unable to load purchases');
        },
      });
  }

  loadSupplierSummary(): void {
    this.summaryLoading = true;
    this.backend
      .getPurchaseSupplierSummary({ supplierId: this.supplierFilter || undefined, ...this.dateParams() })
      .pipe(finalize(() => (this.summaryLoading = false)))
      .subscribe({
        next: (result) => {
          this.summaryTotals = { ...EMPTY_TOTALS, ...((result['totals'] as SupplierSummaryTotals) || {}) };
          this.summaryRows = (result['items'] as SupplierSummaryRow[]) || [];
          this.vendorHistory = (result['history'] as SupplierHistoryEntry[]) || [];
        },
        error: () => {
          this.summaryTotals = { ...EMPTY_TOTALS };
          this.summaryRows = [];
          this.vendorHistory = [];
        },
      });
  }

  onCreateSupplierChange(): void {
    this.createSupplierRow = null;
    if (!this.form.supplierId) {
      return;
    }
    const supplierId = this.form.supplierId;
    this.backend.getPurchaseSupplierSummary({ supplierId }).subscribe({
      next: (result) => {
        if (this.form.supplierId !== supplierId) {
          return;
        }
        const rows = (result['items'] as SupplierSummaryRow[]) || [];
        this.createSupplierRow = rows[0] || null;
      },
    });
  }

  loadPurchase(id: string): void {
    this.loading = true;
    this.backend
      .getPurchaseById(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (item) => {
          this.purchase = item;
          this.loadPurchaseActivity(id);
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Purchase not found'),
      });
  }

  loadPurchaseActivity(id: string): void {
    this.backend.getPayments({ referenceType: 'purchase', referenceId: id, limit: 100 }).subscribe({
      next: (result) => (this.purchasePayments = result.items || []),
      error: () => (this.purchasePayments = []),
    });
    this.backend.getPurchaseReturns({ purchaseId: id, limit: 100 }).subscribe({
      next: (result) => (this.purchaseReturnsForDetail = result.items || []),
      error: () => (this.purchaseReturnsForDetail = []),
    });
  }

  loadReturns(): void {
    this.loading = true;
    this.backend
      .getPurchaseReturns({ limit: 100, ...this.dateParams() })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => (this.returns = result.items || []),
        error: () => (this.returns = []),
      });
    if (!this.purchases.length) {
      this.backend.getPurchases({ limit: 100 }).subscribe({
        next: (result) => (this.purchases = result.items || []),
      });
    }
  }

  // ---------- Create form ----------

  onQuickSearchChange(): void {
    const raw = this.quickSearch.trim();
    if (this.quickTimer) {
      clearTimeout(this.quickTimer);
      this.quickTimer = null;
    }
    this.quickOpen = true;
    if (!raw) {
      this.quickResults = [];
      this.quickLoading = false;
      return;
    }
    this.quickTimer = setTimeout(() => void this.runQuickSearch(raw), 220);
  }

  onQuickSearchBlur(): void {
    setTimeout(() => (this.quickOpen = false), 180);
  }

  async handleQuickSearchEnter(event: Event): Promise<void> {
    event.preventDefault();
    if (this.quickResolving) {
      return;
    }
    const raw = this.quickSearch.trim();
    if (!raw) {
      return;
    }
    if (this.quickTimer) {
      clearTimeout(this.quickTimer);
      this.quickTimer = null;
    }
    this.quickResolving = true;
    try {
      const product = await this.resolveScannedOrSearchedProduct(raw);
      if (!product) {
        this.toastr.warning('No medicine found for this barcode / SKU / name.');
        return;
      }
      this.addProduct(product);
    } finally {
      this.quickResolving = false;
    }
  }

  addProduct(product: ProductCatalogItem): void {
    this.mergeProductIntoCatalog(product);
    const existing = this.form.items.find((line) => line.productId === product._id && !line.batchNumber);
    if (existing) {
      existing.qty = Number(existing.qty || 0) + 1;
      this.toastr.info(`${product.name}: qty increased to ${existing.qty}`);
    } else {
      const line = this.emptyLine();
      line.productId = product._id;
      line.productLabel = product.name;
      line.sku = product.sku || '';
      const cost = Number(product.costPrice ?? 0);
      line.unitCost = Number.isFinite(cost) && cost > 0 ? cost : 0;
      this.form.items.push(line);
    }
    this.quickSearch = '';
    this.quickResults = [];
    this.quickOpen = false;
  }

  duplicateLine(index: number): void {
    const source = this.form.items[index];
    if (!source) {
      return;
    }
    this.form.items.splice(index + 1, 0, { ...source, qty: 1, batchNumber: '', expiryDate: '' });
  }

  removeLine(index: number): void {
    this.form.items.splice(index, 1);
  }

  lineTotal(item: PurchaseLineForm): number {
    const line =
      Number(item.qty || 0) * Number(item.unitCost || 0) - Number(item.discount || 0) + Number(item.tax || 0);
    return Math.max(line, 0);
  }

  payFullOnCreate(): void {
    this.form.paidAmount = this.formItemsTotal;
    if (!this.form.paymentMethod) {
      this.form.paymentMethod = 'cash';
    }
  }

  onCreateStatusChange(): void {
    if (this.form.status !== 'received') {
      this.form.paidAmount = 0;
    }
  }

  save(): void {
    if (this.saving) {
      return;
    }
    if (!this.form.supplierId) {
      this.toastr.error('Select a vendor / supplier');
      return;
    }
    if (!this.form.warehouseId) {
      this.toastr.error('Select the receiving warehouse');
      return;
    }
    if (!this.form.items.length) {
      this.toastr.error('Add at least one medicine');
      return;
    }
    const badLine = this.form.items.find((item) => !(Number(item.qty) > 0));
    if (badLine) {
      this.toastr.error(`Quantity must be greater than 0 for ${badLine.productLabel}`);
      return;
    }

    const total = this.formItemsTotal;
    const paidAmount = this.formPaid;
    const unpaid = Math.max(total - paidAmount, 0);
    if (this.form.status === 'received' && unpaid > 0) {
      const creditError = this.validateSupplierCredit(unpaid);
      if (creditError) {
        this.toastr.error(creditError);
        return;
      }
    }

    this.saving = true;
    this.backend
      .createPurchase({
        warehouseId: this.form.warehouseId,
        supplierId: this.form.supplierId,
        purchaseDate: this.form.purchaseDate,
        supplierInvoiceNo: this.form.supplierInvoiceNo.trim() || undefined,
        note: this.form.note,
        status: this.form.status,
        paidAmount,
        paymentMethod: paidAmount > 0 ? this.form.paymentMethod || 'cash' : undefined,
        items: this.form.items.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          unitCost: item.unitCost || 0,
          discount: item.discount || 0,
          tax: item.tax || 0,
          batchNumber: item.batchNumber || undefined,
          expiryDate: item.expiryDate || undefined,
        })),
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.toastr.success('Purchase saved');
          const data = (response.data || {}) as Record<string, unknown>;
          const created = (data['purchase'] as Record<string, unknown> | undefined) || data;
          const id = String(created['_id'] || '');
          if (id) {
            void this.router.navigate(['/pharmacy/purchases', id]);
          } else {
            void this.router.navigate(['/pharmacy/purchases']);
          }
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to save purchase'),
      });
  }

  // ---------- Receive / cancel ----------

  receive(id: string): void {
    if (this.saving) {
      return;
    }
    this.dialog
      .confirm({
        title: 'Receive purchase',
        message: 'Receive this purchase into inventory and post accounts payable?',
        confirmText: 'Receive',
      })
      .then((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.saving = true;
        this.backend
          .receivePurchase(id)
          .pipe(finalize(() => (this.saving = false)))
          .subscribe({
            next: () => {
              this.toastr.success('Purchase received');
              this.loadPurchase(id);
            },
            error: (err) => this.toastr.error(err?.error?.message || 'Unable to receive purchase'),
          });
      });
  }

  cancel(id: string): void {
    if (this.saving) {
      return;
    }
    this.dialog
      .confirm({
        title: 'Cancel purchase',
        message: 'Cancel this purchase? Posted stock must be reversed with a purchase return.',
        confirmText: 'Cancel',
      })
      .then((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.saving = true;
        this.backend
          .cancelPurchase(id)
          .pipe(finalize(() => (this.saving = false)))
          .subscribe({
            next: () => {
              this.toastr.success('Purchase cancelled');
              this.loadPurchase(id);
            },
            error: (err) => this.toastr.error(err?.error?.message || 'Unable to cancel purchase'),
          });
      });
  }

  // ---------- Vendor payment ----------

  canPayPurchase(record: Record<string, unknown> | null): boolean {
    return !!record && this.canPay && this.text(record['status']) === 'received' && this.balance(record) > 0;
  }

  openPay(record: Record<string, unknown>): void {
    this.payTarget = record;
    this.payForm = {
      amount: this.balance(record),
      method: 'cash',
      paymentDate: toDateInputValue(new Date()),
      referenceNo: '',
      note: '',
    };
    this.payOpen = true;
  }

  openPayById(purchaseId: string): void {
    const record = this.purchases.find((item) => this.text(item['_id']) === purchaseId);
    if (record) {
      this.openPay(record);
      return;
    }
    this.backend.getPurchaseById(purchaseId).subscribe({
      next: (item) => this.openPay(item),
      error: (err) => this.toastr.error(err?.error?.message || 'Purchase not found'),
    });
  }

  closePay(): void {
    if (!this.saving) {
      this.payOpen = false;
      this.payTarget = null;
    }
  }

  submitPay(): void {
    if (!this.payTarget || this.saving) {
      return;
    }
    const balance = this.balance(this.payTarget);
    const amount = this.round(Number(this.payForm.amount || 0));
    if (!(amount > 0)) {
      this.toastr.error('Enter a payment amount');
      return;
    }
    if (amount > balance + 0.001) {
      this.toastr.error(`Amount cannot exceed the pending balance ${formatCurrency(balance)}`);
      return;
    }
    const purchaseId = this.text(this.payTarget['_id']);
    this.saving = true;
    this.backend
      .createPayment({
        referenceType: 'purchase',
        referenceId: purchaseId,
        method: this.payForm.method,
        amount,
        paymentDate: this.payForm.paymentDate,
        referenceNo: this.payForm.referenceNo.trim() || undefined,
        note: this.payForm.note.trim() || undefined,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.toastr.success(`Payment of ${formatCurrency(amount)} recorded`);
          this.payOpen = false;
          this.payTarget = null;
          if (this.view === 'detail') {
            this.loadPurchase(purchaseId);
          } else {
            this.applyFilters();
          }
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to record payment'),
      });
  }

  // ---------- Purchase return ----------

  openReturn(record?: Record<string, unknown> | null): void {
    this.returnOpen = true;
    this.returnSearch = '';
    this.clearReturnSelection();
    this.returnDate = toDateInputValue(new Date());
    if (record) {
      this.chooseReturnPurchase(record);
      return;
    }
    this.returnCandidatesLoading = true;
    this.backend
      .getPurchases({ limit: 100, status: 'received' })
      .pipe(finalize(() => (this.returnCandidatesLoading = false)))
      .subscribe({
        next: (result) => (this.returnCandidates = result.items || []),
        error: () => (this.returnCandidates = []),
      });
  }

  closeReturn(): void {
    if (!this.saving) {
      this.returnOpen = false;
    }
  }

  clearReturnSelection(): void {
    this.returnPurchase = null;
    this.returnLines = [];
    this.returnPrevRefund = 0;
    this.returnRefund = 0;
    this.returnRefundTouched = false;
    this.returnMethod = 'cash';
    if (this.returnOpen && !this.returnCandidates.length && !this.returnCandidatesLoading) {
      this.returnCandidatesLoading = true;
      this.backend
        .getPurchases({ limit: 100, status: 'received' })
        .pipe(finalize(() => (this.returnCandidatesLoading = false)))
        .subscribe({
          next: (result) => (this.returnCandidates = result.items || []),
          error: () => (this.returnCandidates = []),
        });
    }
  }

  chooseReturnPurchase(record: Record<string, unknown>): void {
    this.returnPurchase = record;
    this.returnRefundTouched = false;
    const grouped = new Map<string, PurchaseReturnLine>();
    for (const item of this.linesOf(record)) {
      const productId = this.text(item['productId']);
      const current = grouped.get(productId);
      if (current) {
        current.purchasedQty += Number(item['qty'] || 0);
        continue;
      }
      grouped.set(productId, {
        productId,
        name: this.text(item['name']) || productId,
        sku: this.text(item['sku']),
        purchasedQty: Number(item['qty'] || 0),
        returnedQty: 0,
        unitCost: Number(item['unitCost'] || 0),
        qty: 0,
        reason: '',
      });
    }
    this.returnLines = [...grouped.values()];

    const purchaseId = this.text(record['_id']);
    this.backend.getPurchaseReturns({ purchaseId, limit: 100 }).subscribe({
      next: (result) => {
        if (this.text(this.returnPurchase?.['_id']) !== purchaseId) {
          return;
        }
        const previous = (result.items || []).filter((item) => this.text(item['status']) === 'completed');
        this.returnPrevRefund = previous.reduce((sum, item) => sum + Number(item['refundAmount'] || 0), 0);
        for (const line of this.returnLines) {
          line.returnedQty = previous.reduce(
            (sum, entry) =>
              sum +
              this.linesOf(entry)
                .filter((item) => this.text(item['productId']) === line.productId)
                .reduce((acc, item) => acc + Number(item['qty'] || 0), 0),
            0
          );
        }
        this.syncReturnRefund();
      },
    });
  }

  returnRemaining(line: PurchaseReturnLine): number {
    return Math.max(line.purchasedQty - line.returnedQty, 0);
  }

  setReturnQty(line: PurchaseReturnLine, value: number): void {
    const qty = Number(value || 0);
    line.qty = Math.min(Math.max(Number.isFinite(qty) ? qty : 0, 0), this.returnRemaining(line));
    this.syncReturnRefund();
  }

  returnAllLines(): void {
    this.returnLines.forEach((line) => (line.qty = this.returnRemaining(line)));
    this.syncReturnRefund();
  }

  clearReturnQty(): void {
    this.returnLines.forEach((line) => (line.qty = 0));
    this.syncReturnRefund();
  }

  onReturnRefundChange(value: number): void {
    this.returnRefundTouched = true;
    this.returnRefund = Math.min(Math.max(Number(value || 0), 0), this.returnMaxRefund);
  }

  submitReturn(): void {
    if (!this.returnPurchase || this.saving) {
      return;
    }
    const items = this.returnLines
      .filter((line) => Number(line.qty) > 0)
      .map((line) => ({ productId: line.productId, qty: Number(line.qty), reason: line.reason.trim() || undefined }));
    if (!items.length) {
      this.toastr.error('Enter return quantity for at least one medicine');
      return;
    }
    const refund = this.round(Math.min(Number(this.returnRefund || 0), this.returnMaxRefund));
    const purchaseId = this.text(this.returnPurchase['_id']);
    this.saving = true;
    this.backend
      .createPurchaseReturn({
        purchaseId,
        returnDate: this.returnDate,
        items,
        refundAmount: refund,
        paymentMethod: refund > 0 ? this.returnMethod : undefined,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Purchase return created');
          this.returnOpen = false;
          if (this.view === 'detail') {
            this.loadPurchase(purchaseId);
          } else {
            this.loadReturns();
          }
        },
        error: (err) => this.toastr.error(err?.error?.message || 'Unable to create purchase return'),
      });
  }

  // ---------- Formatting helpers ----------

  text(value: unknown): string {
    return value == null ? '' : String(value);
  }

  currency(value: unknown): string {
    return formatCurrency(value as string | number | null | undefined);
  }

  date(value: unknown): string {
    return formatDate(this.text(value) || null);
  }

  statusClass(status?: string): string {
    return `status-${String(status || 'draft').replace(/_/g, '-')}`;
  }

  balance(record: Record<string, unknown> | null = this.purchase): number {
    const total = Number(record?.['total'] || 0);
    const paid = Number(record?.['paidAmount'] || 0);
    return this.round(Math.max(total - paid, 0));
  }

  paymentStatusLabel(record: Record<string, unknown> | null = this.purchase): string {
    const status = this.text(record?.['paymentStatus']) || 'unpaid';
    return status.replace(/_/g, ' ');
  }

  supplierName(record: Record<string, unknown> | null = this.purchase): string {
    const id = this.text(record?.['supplierId']);
    return this.suppliers.find((supplier) => supplier._id === id)?.name || id || '—';
  }

  warehouseName(record: Record<string, unknown> | null = this.purchase): string {
    const id = this.text(record?.['warehouseId']);
    return this.warehouses.find((warehouse) => warehouse._id === id)?.name || id || '—';
  }

  purchaseInvoice(purchaseId: unknown): string {
    const id = this.text(purchaseId);
    const match = this.purchases.find((item) => this.text(item['_id']) === id);
    return this.text(match?.['invoiceNo']) || '—';
  }

  purchaseLines(): Array<Record<string, unknown>> {
    return this.linesOf(this.purchase);
  }

  linesOf(record: Record<string, unknown> | null | undefined): Array<Record<string, unknown>> {
    const items = record?.['items'];
    return Array.isArray(items) ? (items as Array<Record<string, unknown>>) : [];
  }

  methodLabel(method: unknown): string {
    const value = this.text(method);
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';
  }

  creditUsedPct(row: SupplierSummaryRow): number {
    if (!(row.creditLimit > 0)) {
      return 0;
    }
    return Math.min((row.pending / row.creditLimit) * 100, 100);
  }

  trackByIndex(index: number): number {
    return index;
  }

  // ---------- Private ----------

  private dateParams(): Record<string, string | undefined> {
    return {
      fromDate: this.fromDate ? new Date(`${this.fromDate}T00:00:00`).toISOString() : undefined,
      toDate: this.toDate ? new Date(`${this.toDate}T23:59:59`).toISOString() : undefined,
    };
  }

  private syncReturnRefund(): void {
    if (!this.returnRefundTouched) {
      this.returnRefund = this.returnMaxRefund;
    } else if (this.returnRefund > this.returnMaxRefund) {
      this.returnRefund = this.returnMaxRefund;
    }
  }

  private validateSupplierCredit(unpaidPortion: number): string | null {
    const supplier = this.selectedSupplier;
    if (!supplier) {
      return 'Select a supplier before creating a credit purchase.';
    }

    const creditLimit = Number(supplier.creditLimit || 0);
    if (creditLimit <= 0) {
      return 'Credit not allowed for this supplier (limit is 0). Pay the full purchase amount.';
    }

    const available = this.createSupplierRow
      ? this.createSupplierRow.availableCredit
      : supplier.availableCredit != null && supplier.availableCredit !== ''
        ? Number(supplier.availableCredit || 0)
        : Math.max(creditLimit - this.partyOutstanding(supplier), 0);
    if (unpaidPortion > available + 0.001) {
      return `Credit limit exceeded. Unpaid ${formatCurrency(unpaidPortion)} > available credit ${formatCurrency(available)}.`;
    }
    return null;
  }

  private partyOutstanding(party: Supplier): number {
    if (party.outstandingBalance != null && party.outstandingBalance !== '') {
      return Math.max(Number(party.outstandingBalance || 0), 0);
    }
    return Math.max(Number(party.openingBalance || 0), 0);
  }

  private async runQuickSearch(raw: string): Promise<void> {
    const requestId = ++this.quickSeq;
    this.quickLoading = true;
    try {
      const result = await firstValueFrom(
        this.backend.getProducts({ search: raw, isActive: true, limit: PURCHASE_SEARCH_LIMIT })
      );
      if (requestId !== this.quickSeq || this.quickSearch.trim() !== raw) {
        return;
      }
      this.quickResults = this.rankSearchHits(result.items || [], raw);
    } catch {
      if (requestId !== this.quickSeq) {
        return;
      }
      this.quickResults = this.localProductMatches(raw).slice(0, PURCHASE_SEARCH_LIMIT);
    } finally {
      if (requestId === this.quickSeq) {
        this.quickLoading = false;
      }
    }
  }

  private async resolveScannedOrSearchedProduct(raw: string): Promise<ProductCatalogItem | null> {
    const localExact = this.findLocalExactCodeMatch(raw);
    if (localExact) {
      return localExact;
    }

    try {
      const byBarcode = await firstValueFrom(this.backend.getProducts({ barcode: raw, isActive: true, limit: 5 }));
      const barcodeHit =
        (byBarcode.items || []).find((item) => this.isExactCodeMatch(item, raw)) || byBarcode.items?.[0];
      if (barcodeHit) {
        return barcodeHit;
      }

      const bySku = await firstValueFrom(
        this.backend.getProducts({ sku: raw.toUpperCase(), isActive: true, limit: 5 })
      );
      const skuHit = (bySku.items || []).find((item) => this.isExactCodeMatch(item, raw)) || bySku.items?.[0];
      if (skuHit) {
        return skuHit;
      }

      const bySearch = await firstValueFrom(
        this.backend.getProducts({ search: raw, isActive: true, limit: PURCHASE_SEARCH_LIMIT })
      );
      const ranked = this.rankSearchHits(bySearch.items || [], raw);
      return ranked.find((item) => this.isExactCodeMatch(item, raw)) || ranked[0] || null;
    } catch {
      return this.findLocalExactCodeMatch(raw) || this.localProductMatches(raw)[0] || null;
    }
  }

  private rankSearchHits(items: ProductCatalogItem[], raw: string): ProductCatalogItem[] {
    return [...items].sort((a, b) => {
      const aExact = this.isExactCodeMatch(a, raw) ? 0 : 1;
      const bExact = this.isExactCodeMatch(b, raw) ? 0 : 1;
      if (aExact !== bExact) {
        return aExact - bExact;
      }
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }

  private localProductMatches(raw: string): ProductCatalogItem[] {
    const query = String(raw || '').trim().toLowerCase();
    if (!query) {
      return this.products.slice(0, 20);
    }
    const exact = this.products.filter((product) => this.isExactCodeMatch(product, raw));
    const partial = this.products.filter(
      (product) => !this.isExactCodeMatch(product, raw) && this.productSearchText(product).includes(query)
    );
    return [...exact, ...partial];
  }

  private findLocalExactCodeMatch(raw: string): ProductCatalogItem | null {
    return this.products.find((product) => this.isExactCodeMatch(product, raw)) || null;
  }

  private isExactCodeMatch(product: ProductCatalogItem, raw: string): boolean {
    const code = String(raw || '').trim().toLowerCase();
    if (!code) {
      return false;
    }
    const barcode = String(product.barcode || '').trim().toLowerCase();
    const sku = String(product.sku || '').trim().toLowerCase();
    return (!!barcode && barcode === code) || (!!sku && sku === code);
  }

  private productSearchText(product: ProductCatalogItem): string {
    return [product.name, product.sku, product.barcode, product.brand].filter(Boolean).join(' ').toLowerCase();
  }

  private mergeProductIntoCatalog(product: ProductCatalogItem): void {
    if (!product?._id) {
      return;
    }
    const index = this.products.findIndex((item) => item._id === product._id);
    if (index >= 0) {
      this.products[index] = product;
      return;
    }
    this.products = [product, ...this.products];
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private emptyLine(): PurchaseLineForm {
    return {
      productId: '',
      productLabel: '',
      sku: '',
      qty: 1,
      unitCost: 0,
      discount: 0,
      tax: 0,
      batchNumber: '',
      expiryDate: '',
    };
  }

  private emptyForm() {
    return {
      warehouseId: '',
      supplierId: '',
      supplierInvoiceNo: '',
      purchaseDate: toDateInputValue(new Date()),
      note: '',
      status: 'received',
      paidAmount: 0,
      paymentMethod: 'cash',
      items: [] as PurchaseLineForm[],
    };
  }
}

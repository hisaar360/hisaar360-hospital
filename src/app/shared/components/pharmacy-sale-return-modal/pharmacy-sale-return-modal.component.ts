import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { BackendService } from '../../../core/services/backend.service';
import { MooliOfflineService } from '../../../core/services/mooli-offline.service';
import {
  CreateSalesReturnPayload,
  Sale,
  SalesReturn,
} from '../../models/hospital.model';
import { formatCurrency } from '../../../modules/client/pharmacy-admin.utils';
import { clampMoney, moneyLte, roundMoney, sumMoney } from '../../utils/money';
import { PharmacySaleReturnLine } from './pharmacy-sale-return-modal.models';

/** Offline return picker keeps this many calendar days of completed sales. */
const RETURNABLE_SALES_WINDOW_DAYS = 30;
const RETURNABLE_PAGE_LIMIT = 100;
const RETURNABLE_MAX_PAGES = 15;

@Component({
  selector: 'app-pharmacy-sale-return-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacy-sale-return-modal.component.html',
  styleUrl: './pharmacy-sale-return-modal.component.scss',
})
export class PharmacySaleReturnModalComponent implements OnChanges {
  private readonly backend = inject(BackendService);
  readonly offline = inject(MooliOfflineService);

  /** Controls backdrop visibility. */
  @Input() open = false;
  /** When set, skip picker and load this sale immediately. */
  @Input() initialSaleId: string | null = null;
  /** Show invoice picker (POS). Sales list passes false. */
  @Input() enablePicker = true;
  /** Store scope for picker fetch. */
  @Input() storeId = '';
  /** When true, picker also scopes to this open register session (POS default). */
  @Input() registerSessionId: string | null = null;
  /** Use register session filter only when dates are empty. */
  @Input() preferRegisterSession = true;
  /** Unsynced local OFF sales from POS recent/outbox. */
  @Input() localQueuedSales: Sale[] = [];
  /** When true, never wait on HTTP — always queue return via parent. */
  @Input() localFirst = false;

  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<SalesReturn>();
  /** Parent voids unsynced local bill from IndexedDB outbox. */
  @Output() voidLocalSale = new EventEmitter<string>();
  /** Parent queues sales return for local-first sync. */
  @Output() queueReturn = new EventEmitter<{
    payload: CreateSalesReturnPayload;
    storeId: string;
    saleInvoiceNo: string;
  }>();

  loading = false;
  submitting = false;
  errorMessage = '';

  pickerSales: Sale[] = [];
  returnSaleSearch = '';
  fromDate = '';
  toDate = '';

  selectedReturnSale: Sale | null = null;
  returnLines: PharmacySaleReturnLine[] = [];
  returnRefundAmount = 0;
  returnRefundTouched = false;
  returnPaymentMethod: CreateSalesReturnPayload['paymentMethod'] = 'cash';
  private selectedReturnRefundCeiling = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        this.bootstrapOpen();
      } else {
        this.resetState();
      }
    } else if (this.open && changes['initialSaleId'] && this.initialSaleId) {
      this.loadSaleForReturn(this.initialSaleId);
    }
  }

  get isSelectedLocalSale(): boolean {
    return Boolean(this.selectedReturnSale && this.isLocalSaleId(this.selectedReturnSale._id));
  }

  get returnablePickerSales(): Sale[] {
    const search = this.returnSaleSearch.trim().toLowerCase();
    const merged = this.mergePickerSales(this.pickerSales, this.localQueuedSales);
    return merged
      .filter((sale) => this.canReturnSale(sale) || this.isLocalSaleId(sale._id))
      .filter((sale) => ['completed', 'returned'].includes(sale.status))
      .filter((sale) => {
        if (!search) {
          return true;
        }
        return [sale.invoiceNo, sale._id, sale.paymentStatus, sale.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      });
  }

  get selectedReturnItemsCount(): number {
    return this.returnLines.filter((line) => line.qty > 0).length;
  }

  get saleReturnEstimatedTotal(): number {
    return sumMoney(
      this.returnLines.map(
        (line) => Number(line.qty || 0) * Number(line.unitPrice || 0),
      ),
    );
  }

  get saleReturnRefundLimit(): number {
    return roundMoney(
      Math.min(this.saleReturnEstimatedTotal, this.selectedReturnRefundCeiling),
    );
  }

  currency(value: unknown): string {
    return formatCurrency(value);
  }

  saleItemsSummary(sale: Sale): string {
    const count = (sale.items || []).length;
    return `${count} item${count === 1 ? '' : 's'}`;
  }

  close(): void {
    if (this.submitting) {
      return;
    }
    this.closed.emit();
  }

  applyDateFilter(): void {
    void this.loadPickerSales();
  }

  resetDateFilter(): void {
    this.fromDate = '';
    this.toDate = '';
    void this.loadPickerSales();
  }

  /** POS calls this while online so returns still work after wifi drops. */
  warmStoreCache(storeId?: string): void {
    const id = String(storeId || this.storeId || '').trim();
    if (!id || !this.offline.online()) {
      return;
    }
    void this.fetchAndCacheReturnableSales(id);
  }

  selectSaleForReturn(saleId: string): void {
    if (!saleId) {
      this.errorMessage = 'Select a sale to continue with the return.';
      return;
    }
    this.loadSaleForReturn(saleId);
  }

  updateReturnLineQty(line: PharmacySaleReturnLine, value: string | number): void {
    const qty = Math.max(0, Math.min(Number(value || 0), line.maxQty));
    line.qty = Number.isFinite(qty) ? qty : 0;
    this.syncReturnRefundFromLines();
  }

  returnAllSaleLines(): void {
    this.returnLines.forEach((line) => {
      line.qty = line.maxQty;
    });
    this.syncReturnRefundFromLines();
  }

  clearReturnSaleQtys(): void {
    this.returnLines.forEach((line) => {
      line.qty = 0;
    });
    this.syncReturnRefundFromLines();
  }

  returnLineValue(line: PharmacySaleReturnLine): number {
    return roundMoney(Number(line.qty || 0) * Number(line.unitPrice || 0));
  }

  updateReturnRefundAmount(value: string | number): void {
    this.returnRefundTouched = true;
    const numericValue = Number(value || 0);
    this.returnRefundAmount = clampMoney(
      Number.isFinite(numericValue) ? numericValue : 0,
      0,
      this.saleReturnRefundLimit,
    );
  }

  fillReturnRefundToLimit(): void {
    this.returnRefundTouched = true;
    this.returnRefundAmount = roundMoney(this.saleReturnRefundLimit);
  }

  voidSelectedLocalSale(): void {
    if (!this.selectedReturnSale || !this.isSelectedLocalSale) {
      return;
    }
    this.voidLocalSale.emit(this.selectedReturnSale._id);
    this.closed.emit();
  }

  submit(): void {
    if (!this.selectedReturnSale) {
      this.errorMessage = 'Select a sale to continue with the return.';
      return;
    }

    if (this.isSelectedLocalSale) {
      this.errorMessage =
        'This bill is still unsynced (OFF). Void the local bill instead of creating a server return.';
      return;
    }

    const items = this.returnLines
      .filter((line) => line.qty > 0)
      .map((line) => ({
        productId: line.productId,
        qty: Number(line.qty || 0),
        reason: line.reason.trim() || undefined,
      }));

    if (!items.length) {
      this.errorMessage = 'Select at least one return item quantity.';
      return;
    }

    const limit = this.saleReturnRefundLimit;
    const refundAmount = clampMoney(this.returnRefundAmount || 0, 0, limit);
    this.returnRefundAmount = refundAmount;

    if (!moneyLte(refundAmount, limit)) {
      this.errorMessage = 'Refund amount cannot exceed the selected return total.';
      return;
    }

    const payload: CreateSalesReturnPayload = {
      saleId: this.selectedReturnSale._id,
      returnDate: new Date().toISOString(),
      items,
      refundAmount,
      paymentMethod: refundAmount > 0 ? this.returnPaymentMethod : undefined,
      clientReturnId: this.offline.buildClientId(),
    };

    if (this.localFirst || !this.offline.online()) {
      this.emitQueuedReturn(payload);
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.backend
      .createSalesReturn(payload, { idempotencyKey: payload.clientReturnId })
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (salesReturn) => {
          this.completed.emit(salesReturn);
          this.closed.emit();
        },
        error: (err) => {
          if (this.offline.shouldQueue(err)) {
            this.emitQueuedReturn(payload);
            return;
          }
          this.errorMessage =
            err?.error?.message || 'Unable to complete sales return.';
        },
      });
  }

  private emitQueuedReturn(payload: CreateSalesReturnPayload): void {
    this.queueReturn.emit({
      payload,
      storeId: this.storeId || String(this.selectedReturnSale?.storeId || ''),
      saleInvoiceNo: String(this.selectedReturnSale?.invoiceNo || ''),
    });
    this.completed.emit({
      _id: `local-sales_return-${payload.clientReturnId}`,
      storeId: this.storeId || String(this.selectedReturnSale?.storeId || ''),
      returnNo: `OFF-R-${String(payload.clientReturnId).slice(-6).toUpperCase()}`,
      returnDate: payload.returnDate,
      items: payload.items,
      total: this.saleReturnEstimatedTotal,
      refundAmount: payload.refundAmount || 0,
      status: 'completed',
    });
    this.closed.emit();
  }

  private bootstrapOpen(): void {
    this.resetState();
    if (this.initialSaleId) {
      void this.loadSaleForReturn(this.initialSaleId);
      return;
    }
    if (this.enablePicker) {
      void this.loadPickerSales();
    }
  }

  private resetState(): void {
    this.loading = false;
    this.submitting = false;
    this.errorMessage = '';
    this.pickerSales = [];
    this.returnSaleSearch = '';
    this.selectedReturnSale = null;
    this.returnLines = [];
    this.returnRefundAmount = 0;
    this.returnRefundTouched = false;
    this.returnPaymentMethod = 'cash';
    this.selectedReturnRefundCeiling = 0;
  }

  private async loadPickerSales(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    const storeId = String(this.storeId || '').trim();

    try {
      let sales: Sale[] = [];
      if (this.offline.online() && storeId) {
        try {
          sales = await this.fetchAndCacheReturnableSales(storeId);
        } catch (err) {
          sales = await this.readReturnableSalesCache(storeId);
          if (
            !sales.length &&
            !this.offline.shouldQueue(err) &&
            !(this.localQueuedSales || []).length
          ) {
            this.errorMessage =
              (err as { error?: { message?: string } })?.error?.message ||
              'Unable to load sales.';
          }
        }
      } else {
        sales = storeId ? await this.readReturnableSalesCache(storeId) : [];
        if (!sales.length && !(this.localQueuedSales || []).length) {
          this.errorMessage =
            'No cached invoices for returns. Open POS once while online to save the last 30 days of sales.';
        }
      }

      this.pickerSales = this.filterSalesByPickerDates(sales);
    } finally {
      this.loading = false;
    }
  }

  private async loadSaleForReturn(saleId: string): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.selectedReturnSale = null;
    this.returnLines = [];
    this.returnRefundAmount = 0;
    this.returnRefundTouched = false;
    this.selectedReturnRefundCeiling = 0;

    if (this.isLocalSaleId(saleId)) {
      const local =
        (this.localQueuedSales || []).find((sale) => sale._id === saleId) || null;
      if (!local) {
        this.loading = false;
        this.errorMessage = 'Local sale not found in the sync queue.';
        return;
      }
      this.applySaleForReturn(local, []);
      return;
    }

    // Offline / local-first: use IndexedDB sale + pending return history.
    if (!this.offline.online() || this.localFirst) {
      const cached = await this.findCachedSale(saleId);
      if (cached) {
        const history = await this.returnHistoryForSale(saleId);
        this.applySaleForReturn(cached, history);
        return;
      }
      if (!this.offline.online()) {
        this.loading = false;
        this.errorMessage =
          'Invoice not found in offline cache. Search another invoice or open POS while online first.';
        return;
      }
    }

    this.backend.getSaleById(saleId).subscribe({
      next: (sale) => {
        this.backend.listSalesReturns({ saleId, limit: 100 }).subscribe({
          next: (result) => {
            const history = result.items || [];
            void this.cacheSaleReturnDetail(sale, history);
            this.applySaleForReturn(sale, history);
          },
          error: (err) => {
            this.loading = false;
            this.errorMessage =
              err?.error?.message || 'Unable to load previous return history.';
          },
        });
      },
      error: async (err) => {
        const cached = await this.findCachedSale(saleId);
        if (cached) {
          const history = await this.returnHistoryForSale(saleId);
          this.applySaleForReturn(cached, history);
          return;
        }
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Unable to load sale for return.';
      },
    });
  }

  private filterSalesByPickerDates(sales: Sale[]): Sale[] {
    const fromMs = this.fromDate
      ? new Date(`${this.fromDate}T00:00:00`).getTime()
      : null;
    const toMs = this.toDate
      ? new Date(`${this.toDate}T23:59:59`).getTime()
      : null;
    if (fromMs == null && toMs == null) {
      return sales;
    }
    return sales.filter((sale) => {
      const ts = new Date(sale.saleDate || sale.createdAt || 0).getTime();
      if (!Number.isFinite(ts)) {
        return true;
      }
      if (fromMs != null && ts < fromMs) {
        return false;
      }
      if (toMs != null && ts > toMs) {
        return false;
      }
      return true;
    });
  }

  private windowRangeIso(): { fromDate: string; toDate: string } {
    const to = new Date();
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (RETURNABLE_SALES_WINDOW_DAYS - 1));
    to.setHours(23, 59, 59, 999);
    return { fromDate: from.toISOString(), toDate: to.toISOString() };
  }

  private returnableSalesCacheKey(storeId: string): string {
    return this.offline.cacheKey('pos-returnable-sales', storeId || 'store');
  }

  private saleReturnHistoryCacheKey(saleId: string): string {
    return this.offline.cacheKey('pos-sale-return-history', saleId || 'sale');
  }

  private async readReturnableSalesCache(storeId: string): Promise<Sale[]> {
    return this.offline.readCachedValue<Sale[]>(
      this.returnableSalesCacheKey(storeId),
      [],
    );
  }

  private async writeReturnableSalesCache(
    storeId: string,
    sales: Sale[],
  ): Promise<void> {
    if (!storeId) {
      return;
    }
    await this.offline.cacheValue(this.returnableSalesCacheKey(storeId), sales);
  }

  /** Pull last 30 days of completed store sales (with line items) into IndexedDB. */
  private async fetchAndCacheReturnableSales(storeId: string): Promise<Sale[]> {
    const { fromDate, toDate } = this.windowRangeIso();
    const collected: Sale[] = [];
    const seen = new Set<string>();

    for (let page = 1; page <= RETURNABLE_MAX_PAGES; page += 1) {
      const result = await firstValueFrom(
        this.backend.getSales({
          page,
          limit: RETURNABLE_PAGE_LIMIT,
          storeId,
          status: 'completed',
          // Always pull the rolling 30-day window for offline returns (invoice search).
          // Custom From/To only filters the on-screen list after cache is loaded.
          fromDate,
          toDate,
        }),
      );
      const batch = Array.isArray(result?.items) ? result.items : [];
      for (const sale of batch) {
        const id = String(sale?._id || '');
        if (!id || seen.has(id)) {
          continue;
        }
        seen.add(id);
        collected.push(sale);
      }
      const totalPages = Number(result?.pagination?.totalPages || 0);
      if (
        !batch.length ||
        (totalPages > 0 && page >= totalPages) ||
        batch.length < RETURNABLE_PAGE_LIMIT
      ) {
        break;
      }
    }

    // Merge with prior cache so a date-filtered online fetch does not wipe the month.
    const previous = await this.readReturnableSalesCache(storeId);
    const merged = this.mergePickerSales(collected, previous).filter((sale) =>
      this.isSaleWithinReturnWindow(sale),
    );
    merged.sort(
      (a, b) =>
        new Date(b.saleDate || b.createdAt || 0).getTime() -
        new Date(a.saleDate || a.createdAt || 0).getTime(),
    );
    await this.writeReturnableSalesCache(storeId, merged);
    return merged;
  }

  private isSaleWithinReturnWindow(sale: Sale): boolean {
    const { fromDate } = this.windowRangeIso();
    const fromMs = new Date(fromDate).getTime();
    const ts = new Date(sale.saleDate || sale.createdAt || 0).getTime();
    if (!Number.isFinite(ts)) {
      return true;
    }
    return ts >= fromMs;
  }

  private async findCachedSale(saleId: string): Promise<Sale | null> {
    const id = String(saleId || '').trim();
    if (!id) {
      return null;
    }
    const fromPicker = this.pickerSales.find((sale) => String(sale._id) === id);
    if (fromPicker) {
      return fromPicker;
    }
    const fromLocal = (this.localQueuedSales || []).find(
      (sale) => String(sale._id) === id,
    );
    if (fromLocal) {
      return fromLocal;
    }
    const storeId = String(this.storeId || '').trim();
    if (!storeId) {
      return null;
    }
    const cached = await this.readReturnableSalesCache(storeId);
    return cached.find((sale) => String(sale._id) === id) || null;
  }

  private async returnHistoryForSale(saleId: string): Promise<SalesReturn[]> {
    const cached = await this.offline.readCachedValue<SalesReturn[]>(
      this.saleReturnHistoryCacheKey(saleId),
      [],
    );
    const pending = await this.pendingReturnsAsHistory(saleId);
    return this.mergeReturnHistory(cached, pending);
  }

  private async pendingReturnsAsHistory(saleId: string): Promise<SalesReturn[]> {
    const entries = await this.offline.getQueuedWork('sales_return');
    return entries
      .filter((entry) => {
        const payload = entry.payload as unknown as CreateSalesReturnPayload;
        return String(payload?.saleId || '') === String(saleId);
      })
      .map((entry) => {
        const payload = entry.payload as unknown as CreateSalesReturnPayload;
        return {
          _id: entry.id,
          storeId: String(entry.meta?.['storeId'] || this.storeId || ''),
          saleId: payload.saleId,
          returnNo: `OFF-R-${String(entry.localId || entry.id).slice(-6).toUpperCase()}`,
          returnDate: payload.returnDate,
          items: payload.items || [],
          total: 0,
          refundAmount: payload.refundAmount || 0,
          status: 'completed',
        } as SalesReturn;
      });
  }

  private mergeReturnHistory(
    remote: SalesReturn[],
    local: SalesReturn[],
  ): SalesReturn[] {
    const map = new Map<string, SalesReturn>();
    [...remote, ...local].forEach((item) => {
      if (item?._id) {
        map.set(String(item._id), item);
      }
    });
    return Array.from(map.values());
  }

  private async cacheSaleReturnDetail(
    sale: Sale,
    history: SalesReturn[],
  ): Promise<void> {
    const storeId = String(sale.storeId || this.storeId || '').trim();
    if (storeId && sale?._id) {
      const existing = await this.readReturnableSalesCache(storeId);
      const merged = this.mergePickerSales([sale], existing).filter((item) =>
        this.isSaleWithinReturnWindow(item),
      );
      await this.writeReturnableSalesCache(storeId, merged);
    }
    if (sale?._id) {
      await this.offline.cacheValue(
        this.saleReturnHistoryCacheKey(sale._id),
        history || [],
      );
    }
  }

  private applySaleForReturn(sale: Sale, history: SalesReturn[]): void {
    this.selectedReturnSale = sale;
    this.selectedReturnRefundCeiling = roundMoney(
      Math.max(
        Number(sale.paidAmount || 0) -
          sumMoney(history.map((item) => item.refundAmount || 0)),
        0,
      ),
    );
    this.returnLines = (sale.items || [])
      .map((item) => {
        const soldQty = Number(item.qty || 0) || 0;
        const returnedQty = this.returnedQuantityForSaleItem(item.productId, history);
        const maxQty = Math.max(soldQty - returnedQty, 0);
        return {
          productId: item.productId,
          name: item.name || 'Product',
          sku: item.sku || '',
          soldQty,
          alreadyReturnedQty: returnedQty,
          maxQty,
          qty: 0,
          unitPrice: Number(item.unitPrice || 0),
          reason: '',
        };
      })
      .filter((line) => line.maxQty > 0);
    this.loading = false;
    if (!this.returnLines.length && !this.isLocalSaleId(sale._id)) {
      this.errorMessage = 'No returnable quantity left on this sale.';
    }
  }

  private canReturnSale(sale: Sale): boolean {
    return !this.isLocalSaleId(sale._id);
  }

  private isLocalSaleId(id: string | null | undefined): boolean {
    return String(id || '').startsWith('local-');
  }

  private mergePickerSales(remote: Sale[], local: Sale[]): Sale[] {
    const map = new Map<string, Sale>();
    [...local, ...remote].forEach((sale) => {
      if (sale?._id) {
        map.set(String(sale._id), sale);
      }
    });
    return Array.from(map.values());
  }

  private returnedQuantityForSaleItem(
    productId: string,
    returns: SalesReturn[],
  ): number {
    return returns.reduce((sum, salesReturn) => {
      const returned = (salesReturn.items || [])
        .filter((item) => item.productId === productId)
        .reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0);
      return sum + returned;
    }, 0);
  }

  private syncReturnRefundFromLines(): void {
    const limit = this.saleReturnRefundLimit;
    if (!this.returnRefundTouched) {
      this.returnRefundAmount = limit;
      return;
    }
    if (!moneyLte(this.returnRefundAmount, limit)) {
      this.returnRefundAmount = limit;
    } else {
      this.returnRefundAmount = roundMoney(this.returnRefundAmount);
    }
  }
}

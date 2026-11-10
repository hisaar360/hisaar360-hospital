import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, finalize, of, switchMap, takeUntil } from 'rxjs';
import { BackendService } from '../../../core/services/backend.service';
import {
  CreateOpenSalesExchangePayload,
  ProductCatalogItem,
  SalesReturn,
  Store,
} from '../../models/hospital.model';
import { formatCurrency } from '../../../modules/client/pharmacy-admin.utils';
import { PharmacyOpenReturnLine } from './pharmacy-open-return-modal.models';

type LineSide = 'return' | 'issue';

@Component({
  selector: 'app-pharmacy-open-return-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacy-open-return-modal.component.html',
  styleUrl: './pharmacy-open-return-modal.component.scss',
})
export class PharmacyOpenReturnModalComponent implements OnChanges, OnDestroy {
  private readonly backend = inject(BackendService);
  private readonly destroy$ = new Subject<void>();
  private readonly returnSearch$ = new Subject<string>();
  private readonly issueSearch$ = new Subject<string>();
  private lineSeq = 0;

  @Input() open = false;
  @Input() storeId = '';
  @Input() registerSessionId: string | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<SalesReturn>();

  stores: Store[] = [];
  selectedStoreId = '';
  storesLoading = false;

  submitting = false;
  errorMessage = '';

  returnSearch = '';
  issueSearch = '';
  returnSuggestions: ProductCatalogItem[] = [];
  issueSuggestions: ProductCatalogItem[] = [];
  returnSearching = false;
  issueSearching = false;
  returnActiveIndex = -1;
  issueActiveIndex = -1;

  returnLines: PharmacyOpenReturnLine[] = [];
  issueLines: PharmacyOpenReturnLine[] = [];

  paymentMethod: CreateOpenSalesExchangePayload['paymentMethod'] = 'cash';
  note = '';

  constructor() {
    this.bindSearch(this.returnSearch$, 'return');
    this.bindSearch(this.issueSearch$, 'issue');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        this.resetState();
        this.bootstrapStore();
      }
    } else if (this.open && changes['storeId']) {
      this.resolveSelectedStore();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get activeStoreId(): string {
    return this.selectedStoreId || this.storeId || '';
  }

  get returnTotal(): number {
    return this.sumLines(this.returnLines);
  }

  get issueTotal(): number {
    return this.sumLines(this.issueLines);
  }

  get netAmount(): number {
    return this.roundMoney(this.issueTotal - this.returnTotal);
  }

  get settlementLabel(): string {
    if (this.netAmount > 0) {
      return 'Receive from customer';
    }
    if (this.netAmount < 0) {
      return 'Pay to customer';
    }
    return 'Even exchange';
  }

  get canSubmit(): boolean {
    return (
      !!this.activeStoreId &&
      this.returnLines.length > 0 &&
      this.returnLines.every((line) => line.qty > 0 && line.unitPrice >= 0) &&
      this.issueLines.every((line) => line.qty > 0 && line.unitPrice >= 0) &&
      !this.submitting
    );
  }

  currency(value: unknown): string {
    return formatCurrency(value);
  }

  onStoreChange(storeId: string): void {
    this.selectedStoreId = storeId;
    this.returnSearch = '';
    this.issueSearch = '';
    this.returnSuggestions = [];
    this.issueSuggestions = [];
    this.returnActiveIndex = -1;
    this.issueActiveIndex = -1;
    this.returnLines = [];
    this.issueLines = [];
  }

  onReturnSearchChange(value: string): void {
    this.returnSearch = value;
    this.returnActiveIndex = -1;
    this.returnSearch$.next(value);
  }

  onIssueSearchChange(value: string): void {
    this.issueSearch = value;
    this.issueActiveIndex = -1;
    this.issueSearch$.next(value);
  }

  onSearchKeydown(event: KeyboardEvent, side: LineSide): void {
    const suggestions = side === 'return' ? this.returnSuggestions : this.issueSuggestions;
    if (!suggestions.length) {
      return;
    }

    const activeIndex = side === 'return' ? this.returnActiveIndex : this.issueActiveIndex;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = activeIndex < 0 ? 0 : Math.min(activeIndex + 1, suggestions.length - 1);
      this.setActiveIndex(side, next);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const next = activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1;
      this.setActiveIndex(side, next);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const index = activeIndex >= 0 ? activeIndex : 0;
      const product = suggestions[index];
      if (product) {
        this.selectSuggestion(side, product);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.clearSuggestions(side);
    }
  }

  selectSuggestion(side: LineSide, product: ProductCatalogItem): void {
    if (side === 'return') {
      this.addReturnProduct(product);
      return;
    }
    this.addIssueProduct(product);
  }

  addReturnProduct(product: ProductCatalogItem): void {
    this.addLine('return', product);
    this.returnSearch = '';
    this.clearSuggestions('return');
  }

  addIssueProduct(product: ProductCatalogItem): void {
    this.addLine('issue', product);
    this.issueSearch = '';
    this.clearSuggestions('issue');
  }

  removeLine(side: LineSide, key: string): void {
    if (side === 'return') {
      this.returnLines = this.returnLines.filter((line) => line.key !== key);
      return;
    }
    this.issueLines = this.issueLines.filter((line) => line.key !== key);
  }

  setQty(line: PharmacyOpenReturnLine, value: number | string): void {
    const qty = Number(value);
    line.qty = Number.isFinite(qty) && qty > 0 ? qty : 1;
  }

  setUnitPrice(line: PharmacyOpenReturnLine, value: number | string): void {
    const price = Number(value);
    line.unitPrice = Number.isFinite(price) && price >= 0 ? price : 0;
  }

  close(): void {
    if (this.submitting) {
      return;
    }
    this.closed.emit();
  }

  submit(): void {
    if (!this.canSubmit) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const payload: CreateOpenSalesExchangePayload = {
      storeId: this.activeStoreId,
      returnDate: new Date().toISOString(),
      items: this.returnLines.map((line) => ({
        productId: line.productId,
        qty: line.qty,
        unitPrice: line.unitPrice,
        reason: line.reason || undefined,
        lotNumber: (line.lotNumber || '').trim() || undefined,
        expiryDate: (line.expiryDate || '').trim() || null,
      })),
      issueItems: this.issueLines.map((line) => ({
        productId: line.productId,
        qty: line.qty,
        unitPrice: line.unitPrice,
        reason: line.reason || undefined,
        lotId: line.lotId || null,
        lotNumber: (line.lotNumber || '').trim() || undefined,
        expiryDate: (line.expiryDate || '').trim() || null,
      })),
      paymentMethod: this.paymentMethod,
      registerSessionId: this.registerSessionId || null,
      note: this.note.trim() || undefined,
    };

    if (this.netAmount > 0) {
      payload.collectAmount = Math.abs(this.netAmount);
    } else if (this.netAmount < 0) {
      payload.refundAmount = Math.abs(this.netAmount);
    }

    this.backend
      .createOpenSalesExchange(payload)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (salesReturn) => {
          this.completed.emit(salesReturn);
          this.closed.emit();
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || error?.message || 'Unable to complete random return.';
        },
      });
  }

  private setActiveIndex(side: LineSide, index: number): void {
    if (side === 'return') {
      this.returnActiveIndex = index;
      return;
    }
    this.issueActiveIndex = index;
  }

  private clearSuggestions(side: LineSide): void {
    if (side === 'return') {
      this.returnSuggestions = [];
      this.returnActiveIndex = -1;
      this.returnSearching = false;
      return;
    }
    this.issueSuggestions = [];
    this.issueActiveIndex = -1;
    this.issueSearching = false;
  }

  private bootstrapStore(): void {
    this.resolveSelectedStore();
    if (this.stores.length) {
      this.resolveSelectedStore();
      return;
    }

    if (!this.backend.hasPermission('stores.read') && !this.backend.hasPermission('*')) {
      this.resolveSelectedStore();
      return;
    }

    this.storesLoading = true;
    this.backend
      .getStores({ limit: 100, isActive: true })
      .pipe(finalize(() => (this.storesLoading = false)))
      .subscribe({
        next: (result) => {
          this.stores = result.items || [];
          this.resolveSelectedStore();
        },
        error: () => {
          this.stores = [];
          this.resolveSelectedStore();
        },
      });
  }

  private resolveSelectedStore(): void {
    if (this.storeId) {
      this.selectedStoreId = this.storeId;
      return;
    }
    if (this.selectedStoreId && this.stores.some((store) => store._id === this.selectedStoreId)) {
      return;
    }
    this.selectedStoreId = this.stores[0]?._id || '';
  }

  private bindSearch(source$: Subject<string>, side: LineSide): void {
    source$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(250),
        switchMap((raw) => {
          const query = raw.trim();
          const storeId = this.activeStoreId;
          if (query.length < 2 || !storeId) {
            this.clearSuggestions(side);
            return of({ items: [] as ProductCatalogItem[] });
          }

          if (side === 'return') {
            this.returnSearching = true;
          } else {
            this.issueSearching = true;
          }

          return this.backend
            .getProducts({
              search: query,
              storeId,
              limit: 12,
              isActive: true,
            })
            .pipe(
              finalize(() => {
                if (side === 'return') {
                  this.returnSearching = false;
                } else {
                  this.issueSearching = false;
                }
              }),
            );
        }),
      )
      .subscribe({
        next: (result) => {
          const items = result.items || [];
          if (side === 'return') {
            this.returnSuggestions = items;
            this.returnActiveIndex = items.length ? 0 : -1;
          } else {
            this.issueSuggestions = items;
            this.issueActiveIndex = items.length ? 0 : -1;
          }
        },
        error: () => this.clearSuggestions(side),
      });
  }

  private addLine(side: LineSide, product: ProductCatalogItem): void {
    const unitPrice = Number(product.sellingPrice || 0);
    const line: PharmacyOpenReturnLine = {
      key: `${side}-${++this.lineSeq}`,
      productId: product._id,
      name: product.name,
      sku: product.sku || product.barcode || product._id,
      qty: 1,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      reason: '',
      lotNumber: '',
      expiryDate: '',
      availableQuantity:
        product.availableQuantity != null ? Number(product.availableQuantity) : null,
    };

    if (side === 'return') {
      this.returnLines = [...this.returnLines, line];
      return;
    }
    this.issueLines = [...this.issueLines, line];
  }

  private sumLines(lines: PharmacyOpenReturnLine[]): number {
    return this.roundMoney(
      lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.unitPrice || 0), 0),
    );
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private resetState(): void {
    this.submitting = false;
    this.errorMessage = '';
    this.returnSearch = '';
    this.issueSearch = '';
    this.returnSuggestions = [];
    this.issueSuggestions = [];
    this.returnActiveIndex = -1;
    this.issueActiveIndex = -1;
    this.returnLines = [];
    this.issueLines = [];
    this.paymentMethod = 'cash';
    this.note = '';
    this.lineSeq = 0;
  }
}

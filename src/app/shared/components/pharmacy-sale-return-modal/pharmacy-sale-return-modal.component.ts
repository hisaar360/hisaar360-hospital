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
import { finalize } from 'rxjs';
import { BackendService } from '../../../core/services/backend.service';
import {
  CreateSalesReturnPayload,
  Sale,
  SalesReturn,
} from '../../models/hospital.model';
import { formatCurrency } from '../../../modules/client/pharmacy-admin.utils';
import { clampMoney, moneyLte, roundMoney, sumMoney } from '../../utils/money';
import { PharmacySaleReturnLine } from './pharmacy-sale-return-modal.models';

@Component({
  selector: 'app-pharmacy-sale-return-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacy-sale-return-modal.component.html',
  styleUrl: './pharmacy-sale-return-modal.component.scss',
})
export class PharmacySaleReturnModalComponent implements OnChanges {
  private readonly backend = inject(BackendService);

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

  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<SalesReturn>();

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

  get returnablePickerSales(): Sale[] {
    const search = this.returnSaleSearch.trim().toLowerCase();
    return this.pickerSales
      .filter((sale) => this.canReturnSale(sale))
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
    this.loadPickerSales();
  }

  resetDateFilter(): void {
    this.fromDate = '';
    this.toDate = '';
    this.loadPickerSales();
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

  submit(): void {
    if (!this.selectedReturnSale) {
      this.errorMessage = 'Select a sale to continue with the return.';
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
    };

    this.submitting = true;
    this.errorMessage = '';
    this.backend
      .createSalesReturn(payload)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (salesReturn) => {
          this.completed.emit(salesReturn);
          this.closed.emit();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Unable to complete sales return.';
        },
      });
  }

  private bootstrapOpen(): void {
    this.resetState();
    if (this.initialSaleId) {
      this.loadSaleForReturn(this.initialSaleId);
      return;
    }
    if (this.enablePicker) {
      this.loadPickerSales();
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

  private loadPickerSales(): void {
    this.loading = true;
    this.errorMessage = '';
    const hasDateRange = Boolean(this.fromDate || this.toDate);
    this.backend
      .getSales({
        limit: hasDateRange ? 100 : 20,
        storeId: this.storeId || undefined,
        status: 'completed',
        registerSessionId:
          !hasDateRange && this.preferRegisterSession && this.registerSessionId
            ? this.registerSessionId
            : undefined,
        fromDate: this.fromDate
          ? new Date(`${this.fromDate}T00:00:00`).toISOString()
          : undefined,
        toDate: this.toDate
          ? new Date(`${this.toDate}T23:59:59`).toISOString()
          : undefined,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.pickerSales = result.items || [];
        },
        error: (err) => {
          this.pickerSales = [];
          this.errorMessage = err?.error?.message || 'Unable to load sales.';
        },
      });
  }

  private loadSaleForReturn(saleId: string): void {
    this.loading = true;
    this.errorMessage = '';
    this.selectedReturnSale = null;
    this.returnLines = [];
    this.returnRefundAmount = 0;
    this.returnRefundTouched = false;
    this.selectedReturnRefundCeiling = 0;

    this.backend.getSaleById(saleId).subscribe({
      next: (sale) => {
        this.backend.listSalesReturns({ saleId, limit: 100 }).subscribe({
          next: (result) => {
            const history = result.items || [];
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
                const returnedQty = this.returnedQuantityForSaleItem(
                  item.productId,
                  history,
                );
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
            if (!this.returnLines.length) {
              this.errorMessage = 'No returnable quantity left on this sale.';
            }
          },
          error: (err) => {
            this.loading = false;
            this.errorMessage =
              err?.error?.message || 'Unable to load previous return history.';
          },
        });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Unable to load sale for return.';
      },
    });
  }

  private canReturnSale(sale: Sale): boolean {
    return !String(sale._id || '').startsWith('local-');
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

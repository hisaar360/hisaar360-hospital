import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ProductCatalogItem, StockLot } from '../../models/hospital.model';
import { formatCurrency, formatDateShort } from '../../../modules/client/pharmacy-admin.utils';
import { getPharmacyExpiryTone } from '../../../modules/client/pharmacy-expiry.util';

export type PharmacyPosBatchPickResult = {
  lot: StockLot | null;
  unitPrice: number;
};

@Component({
  selector: 'app-pharmacy-pos-batch-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pharmacy-pos-batch-picker.component.html',
  styleUrl: './pharmacy-pos-batch-picker.component.scss',
})
export class PharmacyPosBatchPickerComponent implements OnChanges {
  @Input() open = false;
  @Input() product: ProductCatalogItem | null = null;
  @Input() lots: StockLot[] = [];
  @Input() defaultUnitPrice = 0;

  @Output() closed = new EventEmitter<void>();
  @Output() selected = new EventEmitter<PharmacyPosBatchPickResult>();

  focusIndex = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.focusIndex = 0;
    }
    if (changes['lots'] && this.open) {
      this.focusIndex = Math.min(this.focusIndex, Math.max(this.lots.length - 1, 0));
    }
  }

  currency(value: unknown): string {
    return formatCurrency(value);
  }

  expiryLabel(lot: StockLot): string {
    return formatDateShort(lot.expiryDate || null);
  }

  isNearExpiry(lot: StockLot): boolean {
    if (typeof lot.nearExpiry === 'boolean') {
      return lot.nearExpiry;
    }
    const tone = getPharmacyExpiryTone(lot.expiryDate);
    return tone === 'near' || tone === 'expired';
  }

  lotPrice(lot: StockLot): number {
    const fromLot = Number(lot.sellingPrice ?? 0);
    if (Number.isFinite(fromLot) && fromLot > 0) {
      return fromLot;
    }
    return Number(this.defaultUnitPrice || 0) || 0;
  }

  availableQty(lot: StockLot): number {
    return Math.max(0, Number(lot.availableQuantity ?? lot.quantity ?? 0) || 0);
  }

  close(): void {
    this.closed.emit();
  }

  choose(lot: StockLot): void {
    this.selected.emit({
      lot,
      unitPrice: this.lotPrice(lot),
    });
  }

  confirmFocused(): void {
    const lot = this.lots[this.focusIndex];
    if (lot) {
      this.choose(lot);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.open || !this.lots.length) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      this.focusIndex = Math.min(this.focusIndex + 1, this.lots.length - 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      this.focusIndex = Math.max(this.focusIndex - 1, 0);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.confirmFocused();
    }
  }
}

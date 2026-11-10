export interface PharmacyOpenReturnLine {
  key: string;
  productId: string;
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
  reason: string;
  lotId?: string | null;
  lotNumber?: string;
  expiryDate?: string | null;
  availableQuantity?: number | null;
}

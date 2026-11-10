export interface PharmacySaleReturnLine {
  productId: string;
  name: string;
  sku: string;
  soldQty: number;
  alreadyReturnedQty: number;
  maxQty: number;
  qty: number;
  unitPrice: number;
  reason: string;
}

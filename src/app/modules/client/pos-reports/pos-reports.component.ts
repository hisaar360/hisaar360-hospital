import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexPlotOptions,
  ApexStroke,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { finalize, forkJoin, map, Observable, of } from 'rxjs';

import { formatActiveCurrency } from '../../../core/services/currency.service';
import { BackendService } from '../../../core/services/backend.service';
import { downloadExcelWorkbook } from '../../../core/utils/excel-export.util';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';
import {
  ProductCatalogItem,
  RegisterSession,
  Sale,
  Store,
  User,
} from '../../../shared/models/hospital.model';
import { buildPharmacyReportHtml } from '../pharmacy-export.util';

type ReportKey =
  | 'sales'
  | 'inventory'
  | 'profit-loss'
  | 'stock-movements'
  | 'medicine-performance'
  | 'payments'
  | 'expenses';

type PeriodKey = 'today' | 'week' | 'month' | 'custom';

interface ReportDefinition {
  key: ReportKey;
  title: string;
  description: string;
  icon: string;
}

type MedicinePerfChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  legend: ApexLegend;
};

@Component({
  selector: 'app-pos-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, HmsDocumentToolbarComponent, NgApexchartsModule],
  templateUrl: './pos-reports.component.html',
  styleUrl: './pos-reports.component.scss',
})
export class PosReportsComponent implements OnInit {
  readonly reports: ReportDefinition[] = [
    {
      key: 'sales',
      title: 'Sales',
      description: 'Revenue, paid totals, invoices, and sale count.',
      icon: 'fa-line-chart',
    },
    {
      key: 'inventory',
      title: 'Inventory',
      description: 'Store-wise medicine stock, available quantity, and valuation.',
      icon: 'fa-cubes',
    },
    {
      key: 'profit-loss',
      title: 'Profit / Loss',
      description: 'Revenue, COGS, expenses, gross profit, and net profit.',
      icon: 'fa-balance-scale',
    },
    {
      key: 'stock-movements',
      title: 'Stock Movements',
      description: 'Medicine In / Out totals and audit trail of stock changes.',
      icon: 'fa-exchange',
    },
    {
      key: 'medicine-performance',
      title: 'Medicine Performance',
      description: 'Sold, returned, and purchased quantities by medicine.',
      icon: 'fa-bar-chart',
    },
    {
      key: 'payments',
      title: 'Payments',
      description: 'Payment totals, methods, and reference mix.',
      icon: 'fa-credit-card',
    },
    {
      key: 'expenses',
      title: 'Expenses',
      description: 'Expense totals and category distribution.',
      icon: 'fa-money',
    },
  ];

  readonly periodChips: Array<{ key: PeriodKey; label: string }> = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'custom', label: 'Custom' },
  ];

  activeReport: ReportKey = 'sales';
  activePeriod: PeriodKey = 'custom';
  reportData: unknown[] | Record<string, unknown> | null = null;
  stores: Store[] = [];
  loading = false;
  storesLoading = false;
  errorMessage = '';
  fromDate = '';
  toDate = '';
  storeId = '';
  lowStockOnly = false;
  localFallbackMode = false;
  medicineChart: MedicinePerfChartOptions = this.emptyMedicineChart();

  readonly getExportHtml = () =>
    buildPharmacyReportHtml(
      `Pharmacy ${this.activeReportDefinition.title} Report`,
      this.exportColumns(),
      this.exportRows(),
    );

  constructor(
    private route: ActivatedRoute,
    private backend: BackendService
  ) {}

  ngOnInit(): void {
    this.applyAssignedStore();
    const params = this.route.snapshot.queryParamMap;
    const requestedStoreId = params.get('storeId');
    if (requestedStoreId) {
      this.storeId = requestedStoreId;
    }

    const reportParam = params.get('report');
    if (reportParam && this.reports.some((report) => report.key === reportParam)) {
      this.activeReport = reportParam as ReportKey;
    }

    const fromDateParam = params.get('fromDate');
    const toDateParam = params.get('toDate');
    const periodParam = params.get('period');

    if (fromDateParam && toDateParam) {
      this.fromDate = fromDateParam.slice(0, 10);
      this.toDate = toDateParam.slice(0, 10);
      this.activePeriod =
        periodParam === 'today' || periodParam === 'week' || periodParam === 'month'
          ? periodParam
          : 'custom';
    } else if (periodParam === 'today' || periodParam === 'week' || periodParam === 'month') {
      this.applyPeriod(periodParam, false);
    } else if (this.activeReport === 'medicine-performance') {
      this.applyPeriod('month', false);
    } else {
      this.setDefaultDateRange();
      this.activePeriod = 'custom';
    }

    this.loadStores();
    this.loadReport();
  }

  get activeReportDefinition(): ReportDefinition {
    return this.reports.find((report) => report.key === this.activeReport) || this.reports[0];
  }

  get supportsLowStockFilter(): boolean {
    return this.activeReport === 'inventory';
  }

  get supportsDateFilter(): boolean {
    return this.activeReport !== 'inventory';
  }

  get showMedicineChart(): boolean {
    return this.activeReport === 'medicine-performance' && this.items.length > 0;
  }

  get canChooseStore(): boolean {
    return this.backend.hasPermission('*') || this.backend.hasPermission('stores.read');
  }

  get items(): Record<string, unknown>[] {
    if (Array.isArray(this.reportData)) {
      return this.reportData.filter(this.isRecord);
    }

    const possibleItems = this.isRecord(this.reportData) ? this.reportData['items'] : null;
    return Array.isArray(possibleItems) ? possibleItems.filter(this.isRecord) : [];
  }

  get summaryEntries(): Array<{ key: string; value: unknown }> {
    if (!this.isRecord(this.reportData) || Array.isArray(this.reportData)) {
      return [];
    }

    const preferred =
      this.activeReport === 'stock-movements'
        ? ['totalIn', 'totalOut', 'count']
        : this.activeReport === 'medicine-performance'
          ? ['totals']
          : [];

    const entries = Object.entries(this.reportData)
      .filter(([key]) => key !== 'items' && key !== 'fromDate' && key !== 'toDate')
      .map(([key, value]) => ({ key, value }));

    if (!preferred.length) {
      return entries;
    }

    const preferredSet = new Set(preferred);
    const ranked = [
      ...preferred
        .map((key) => entries.find((entry) => entry.key === key))
        .filter((entry): entry is { key: string; value: unknown } => Boolean(entry)),
      ...entries.filter((entry) => !preferredSet.has(entry.key)),
    ];
    return ranked;
  }

  get tableColumns(): string[] {
    const firstItem = this.items[0];
    if (!firstItem) {
      return [];
    }

    const hidden = new Set([
      '_id',
      'companyId',
      'userId',
      'hospitalId',
      'registerSessionId',
      'productId',
      'locationId',
      'locationType',
    ]);
    const keys = Object.keys(firstItem).filter((key) => !hidden.has(key));
    const preferred = [
      'product',
      'name',
      'sku',
      'sold',
      'returned',
      'purchased',
      'availableQuantity',
      'reservedQuantity',
      'reorderLevel',
      'valuation',
      'movementType',
      'quantityChange',
      'createdAt',
    ];
    return [...preferred.filter((key) => keys.includes(key)), ...keys.filter((key) => !preferred.includes(key))];
  }

  selectReport(reportKey: ReportKey): void {
    if (this.activeReport === reportKey) {
      return;
    }

    this.activeReport = reportKey;
    this.errorMessage = '';
    if (!this.supportsLowStockFilter) {
      this.lowStockOnly = false;
    }
    if (reportKey === 'medicine-performance' && this.activePeriod === 'custom') {
      this.applyPeriod('month', false);
    }
    this.loadReport();
  }

  selectPeriod(period: PeriodKey): void {
    this.applyPeriod(period, true);
  }

  applyFilters(): void {
    this.activePeriod = 'custom';
    this.loadReport();
  }

  resetFilters(): void {
    if (this.activeReport === 'medicine-performance') {
      this.applyPeriod('month', false);
    } else {
      this.setDefaultDateRange();
      this.activePeriod = 'custom';
    }
    this.applyAssignedStore();
    this.lowStockOnly = false;
    this.errorMessage = '';
    this.loadReport();
  }

  loadStores(): void {
    if (!this.canChooseStore) {
      return;
    }

    this.storesLoading = true;
    this.backend
      .getStores({ limit: 100, isActive: true })
      .pipe(finalize(() => (this.storesLoading = false)))
      .subscribe({
        next: (result) => {
          this.stores = result.items || [];
        },
        error: () => {
          this.stores = [];
        },
      });
  }

  loadReport(): void {
    if (this.backend.hasPermission('reports.read')) {
      this.loadBackendReport();
      return;
    }

    this.loadFallbackReport();
  }

  objectEntries(value: unknown): Array<{ key: string; value: unknown }> {
    return this.isRecord(value)
      ? Object.entries(value).map(([key, entryValue]) => ({ key, value: entryValue }))
      : [];
  }

  isPlainObject(value: unknown): boolean {
    return this.isRecord(value);
  }

  cellValue(row: Record<string, unknown>, column: string): unknown {
    return row[column];
  }

  labelFor(key: string): string {
    const labels: Record<string, string> = {
      invoiceNo: 'Invoice',
      storeId: 'Store',
      customerId: 'Customer',
      paidAmount: 'Paid',
      saleDate: 'Sale date',
      paymentStatus: 'Payment',
      totalPaid: 'Total paid',
      totalSales: 'Total sales',
      product: 'Product',
      availableQuantity: 'Available quantity',
      reservedQuantity: 'Reserved quantity',
      reorderLevel: 'Reorder level',
      valuation: 'Valuation',
      totalIn: 'Medicine In',
      totalOut: 'Medicine Out',
      sold: 'Sold',
      returned: 'Returned',
      purchased: 'Purchased',
      totals: 'Totals',
      count: 'Movements',
      sku: 'SKU',
      name: 'Medicine',
    };
    if (labels[key]) {
      return labels[key];
    }

    return key
      .replace(/_/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\bid\b/gi, 'ID')
      .replace(/^./, (letter) => letter.toUpperCase());
  }

  formatValue(key: string, value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (this.isStoreKey(key)) {
      return this.storeLabel(value);
    }

    if (this.isRecord(value)) {
      return this.formatRecord(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.formatValue(key, item)).join(', ') || '-';
    }

    if (this.isMoneyKey(key)) {
      return this.formatCurrency(value);
    }

    if (this.isDateKey(key)) {
      return this.formatDate(value);
    }

    return String(value);
  }

  trackByKey(_index: number, item: { key: string }): string {
    return item.key;
  }

  trackByColumn(_index: number, column: string): string {
    return column;
  }

  trackByIndex(index: number): number {
    return index;
  }

  exportExcel(): void {
    const columns = this.exportColumns();
    downloadExcelWorkbook(`pharmacy-${this.activeReport}-report`, [
      {
        name: this.activeReportDefinition.title,
        columns,
        rows: this.exportRows(),
      },
    ]);
  }

  private exportColumns(): Array<{ header: string; key: string }> {
    return this.tableColumns.map((column) => ({
      header: this.labelFor(column),
      key: column,
    }));
  }

  private exportRows(): Array<Record<string, unknown>> {
    return this.items.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const column of this.tableColumns) {
        mapped[column] = this.formatValue(column, this.cellValue(row, column));
      }
      return mapped;
    });
  }

  private resolveReportRequest(params: Record<string, unknown>): Observable<unknown[] | Record<string, unknown>> {
    switch (this.activeReport) {
      case 'sales':
        return this.backend.getSalesReport(params);
      case 'inventory':
        return this.backend.getInventoryReport(params);
      case 'profit-loss':
        return this.backend.getProfitLossReport(params);
      case 'stock-movements':
        return this.backend.getStockMovementsReport(params);
      case 'medicine-performance':
        return this.backend.getMedicinePerformanceReport(params);
      case 'payments':
        return this.backend.getPaymentsReport(params);
      case 'expenses':
        return this.backend.getExpensesReport(params);
      default:
        return this.backend.getSalesReport(params);
    }
  }

  private applyPeriod(period: PeriodKey, reload: boolean): void {
    this.activePeriod = period;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period === 'today') {
      this.fromDate = this.toDateInputValue(today);
      this.toDate = this.toDateInputValue(today);
    } else if (period === 'week') {
      const weekStart = new Date(today);
      const day = weekStart.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      weekStart.setDate(weekStart.getDate() + mondayOffset);
      this.fromDate = this.toDateInputValue(weekStart);
      this.toDate = this.toDateInputValue(today);
    } else if (period === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      this.fromDate = this.toDateInputValue(monthStart);
      this.toDate = this.toDateInputValue(monthEnd);
    }

    if (reload) {
      this.loadReport();
    }
  }

  private refreshMedicineChart(): void {
    if (this.activeReport !== 'medicine-performance') {
      this.medicineChart = this.emptyMedicineChart();
      return;
    }

    const top = this.items.slice(0, 12);
    this.medicineChart = {
      series: [
        { name: 'Sold', data: top.map((row) => Number(row['sold'] || 0)) },
        { name: 'Returned', data: top.map((row) => Number(row['returned'] || 0)) },
        { name: 'Purchased', data: top.map((row) => Number(row['purchased'] || 0)) },
      ],
      chart: {
        type: 'bar',
        height: 360,
        toolbar: { show: false },
        stacked: false,
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 4,
        },
      },
      colors: ['#0f766e', '#b45309', '#1d4ed8'],
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: {
        categories: top.map((row) => String(row['name'] || row['sku'] || 'Medicine')),
        labels: { rotate: -35, trim: true, hideOverlappingLabels: true },
      },
      yaxis: {
        title: { text: 'Quantity' },
        labels: {
          formatter: (value: number) => String(Math.round(value)),
        },
      },
      legend: { position: 'top', horizontalAlign: 'left' },
    };
  }

  private emptyMedicineChart(): MedicinePerfChartOptions {
    return {
      series: [],
      chart: { type: 'bar', height: 320, toolbar: { show: false } },
      plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
      colors: ['#0f766e', '#b45309', '#1d4ed8'],
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: { categories: [] },
      yaxis: {},
      legend: { position: 'top' },
    };
  }

  private buildReportParams(): Record<string, unknown> {
    return {
      fromDate: this.fromDate ? new Date(`${this.fromDate}T00:00:00`).toISOString() : undefined,
      toDate: this.toDate ? new Date(`${this.toDate}T23:59:59`).toISOString() : undefined,
      storeId: this.storeId || undefined,
      lowStock: this.supportsLowStockFilter && this.lowStockOnly ? true : undefined,
    };
  }

  private setDefaultDateRange(): void {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 30);
    this.fromDate = this.toDateInputValue(from);
    this.toDate = this.toDateInputValue(today);
  }

  private applyAssignedStore(): void {
    const currentUser = this.getStoredUser();
    this.storeId = currentUser?.storeId || '';
  }

  private getStoredUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    } catch {
      return null;
    }
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatRecord(value: Record<string, unknown>): string {
    const name = String(value['name'] || '').trim();
    if (name) {
      return name;
    }

    const firstName = String(value['firstName'] || '').trim();
    if (firstName) {
      return `${firstName} ${String(value['lastName'] || '').trim()}`.trim();
    }

    return '-';
  }

  private formatCurrency(value: unknown): string {
    const numeric = Number(value ?? 0);
    return formatActiveCurrency(Number.isFinite(numeric) ? numeric : 0, { fractionDigits: 2 });
  }

  private formatDate(value: unknown): string {
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }
    return parsed.toLocaleString();
  }

  private isMoneyKey(key: string): boolean {
    return [
      'amount',
      'cashSales',
      'cogs',
      'expenses',
      'grossProfit',
      'grossProfitToday',
      'netProfit',
      'paidAmount',
      'revenue',
      'total',
      'totalExpenses',
      'totalExpensesToday',
      'totalInventoryValue',
      'totalPaid',
      'totalPayments',
      'totalSales',
      'totalSalesToday',
      'valuation',
    ].includes(key);
  }

  private isDateKey(key: string): boolean {
    return /date|createdAt|updatedAt/i.test(key);
  }

  private isStoreKey(key: string): boolean {
    return key === 'storeId' || key === 'storeName';
  }

  private storeLabel(value: unknown): string {
    const storeId = String(value || '').trim();
    if (!storeId) {
      return '-';
    }

    const matchedStore = this.stores.find((store) => store._id === storeId);
    return matchedStore?.name || storeId;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private loadBackendReport(): void {
    this.loading = true;
    this.localFallbackMode = false;
    this.errorMessage = '';
    this.reportData = null;

    const params = this.buildReportParams();
    this.resolveReportRequest(params)
      .subscribe({
        next: (data) => {
          this.loading = false;
          this.reportData = data;
          this.refreshMedicineChart();
        },
        error: () => {
          this.loading = false;
          this.loadFallbackReport();
        },
      });
  }

  private loadFallbackReport(): void {
    this.loading = true;
    this.localFallbackMode = true;
    this.errorMessage = '';
    this.reportData = null;

    const storeId = this.storeId || this.getStoredUser()?.storeId || undefined;
    const salesParams = {
      limit: 100,
      storeId,
      fromDate: this.fromDate ? new Date(`${this.fromDate}T00:00:00`).toISOString() : undefined,
      toDate: this.toDate ? new Date(`${this.toDate}T23:59:59`).toISOString() : undefined,
    };
    const inventoryParams = {
      limit: 200,
      isActive: true,
      storeId,
    };

    const sales$ = this.backend.hasPermission('sales.read')
      ? this.backend.getSales(salesParams).pipe(map((result) => result.items || []))
      : of([] as Sale[]);
    const products$ = this.backend.hasPermission('products.read')
      ? this.backend.getProducts(inventoryParams).pipe(map((result) => result.items || []))
      : of([] as ProductCatalogItem[]);
    const register$ = this.backend.hasPermission('register_sessions.read') && storeId
      ? this.backend.getCurrentRegister({ storeId })
      : of(null as RegisterSession | null);

    forkJoin({
      sales: sales$,
      products: products$,
      register: register$,
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ sales, products, register }) => {
          this.reportData = this.buildFallbackReportData(sales, products, register);
          this.refreshMedicineChart();

          if (!this.reportData) {
            this.errorMessage =
              'No accessible POS data is available for this report. Give this user at least sales.read or products.read.';
          }
        },
        error: () => {
          this.errorMessage =
            'Unable to load POS report data for this user. Please verify sales, products, and register permissions.';
        },
      });
  }

  private buildFallbackReportData(
    sales: Sale[],
    products: ProductCatalogItem[],
    register: RegisterSession | null
  ): unknown[] | Record<string, unknown> | null {
    switch (this.activeReport) {
      case 'sales':
        return this.buildFallbackSalesReport(sales);
      case 'inventory':
        return this.buildFallbackInventoryReport(products);
      case 'profit-loss':
        return this.buildFallbackProfitLossReport(sales, products);
      case 'stock-movements':
        return this.buildFallbackStockMovementsReport(products);
      case 'medicine-performance':
        return this.buildFallbackMedicinePerformanceReport(sales, products);
      case 'payments':
        return this.buildFallbackPaymentsReport(sales, register);
      case 'expenses':
        return this.buildFallbackExpensesReport(register);
      default:
        return this.buildFallbackSalesReport(sales);
    }
  }

  private buildFallbackMedicinePerformanceReport(
    sales: Sale[],
    products: ProductCatalogItem[]
  ): Record<string, unknown> {
    const byProduct = new Map<
      string,
      { productId: string; name: string; sku: string; sold: number; returned: number; purchased: number }
    >();

    sales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const key = String(item.productId);
        const current = byProduct.get(key) || {
          productId: key,
          name: item.name || '',
          sku: item.sku || '',
          sold: 0,
          returned: 0,
          purchased: 0,
        };
        current.sold += Number(item.qty || 0);
        byProduct.set(key, current);
      });
    });

    products.forEach((product) => {
      const key = String(product._id);
      if (!byProduct.has(key)) {
        return;
      }
      const current = byProduct.get(key)!;
      current.name = current.name || product.name;
      current.sku = current.sku || product.sku || '';
    });

    const items = Array.from(byProduct.values()).sort((a, b) => b.sold - a.sold);
    const totals = items.reduce(
      (acc, row) => {
        acc.sold += row.sold;
        acc.returned += row.returned;
        acc.purchased += row.purchased;
        return acc;
      },
      { sold: 0, returned: 0, purchased: 0 }
    );

    return {
      mode: 'Local POS fallback (sold only)',
      totals,
      items,
    };
  }

  private buildFallbackSalesReport(sales: Sale[]): Record<string, unknown> {
    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const totalPaid = sales.reduce((sum, sale) => sum + Number(sale.paidAmount || 0), 0);

    return {
      mode: 'Local POS fallback',
      salesCount: sales.length,
      totalSales,
      totalPaid,
      unpaidBalance: totalSales - totalPaid,
      items: sales.map((sale) => ({
        invoiceNo: sale.invoiceNo,
        saleDate: sale.saleDate,
        itemsCount: sale.items?.length || 0,
        total: Number(sale.total || 0),
        paidAmount: Number(sale.paidAmount || 0),
        paymentStatus: sale.paymentStatus,
      })),
    };
  }

  private buildFallbackInventoryReport(products: ProductCatalogItem[]): Record<string, unknown> {
    const filteredProducts = this.lowStockOnly
      ? products.filter((product) => this.productQty(product) <= this.productReorderLevel(product))
      : products;
    const totalInventoryValue = filteredProducts.reduce(
      (sum, product) => sum + this.productQty(product) * this.productPrice(product),
      0
    );

    return {
      mode: 'Local POS fallback',
      itemsCount: filteredProducts.length,
      totalInventoryValue,
      totalUnits: filteredProducts.reduce((sum, product) => sum + this.productQty(product), 0),
      items: filteredProducts.map((product) => ({
        name: product.name,
        sku: product.sku,
        batchNumber: product.batchNumber || '-',
        expiryDate: product.expiryDate || '-',
        availableQuantity: this.productQty(product),
        reorderLevel: this.productReorderLevel(product),
        sellingPrice: this.productPrice(product),
        costPrice: this.productCost(product),
        valuation: this.productQty(product) * this.productPrice(product),
      })),
    };
  }

  private buildFallbackProfitLossReport(
    sales: Sale[],
    products: ProductCatalogItem[]
  ): Record<string, unknown> {
    const productCostMap = new Map(products.map((product) => [product._id, this.productCost(product)]));
    const revenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const cogs = sales.reduce(
      (sum, sale) =>
        sum +
        (sale.items || []).reduce((saleSum, item) => {
          const cost = productCostMap.get(item.productId) || 0;
          return saleSum + Number(item.qty || 0) * cost;
        }, 0),
      0
    );
    const grossProfit = revenue - cogs;

    return {
      mode: 'Local POS fallback',
      revenue,
      cogs,
      grossProfit,
      netProfit: grossProfit,
      items: sales.map((sale) => {
        const saleRevenue = Number(sale.total || 0);
        const saleCogs = (sale.items || []).reduce((sum, item) => {
          const cost = productCostMap.get(item.productId) || 0;
          return sum + Number(item.qty || 0) * cost;
        }, 0);

        return {
          invoiceNo: sale.invoiceNo,
          saleDate: sale.saleDate,
          revenue: saleRevenue,
          cogs: saleCogs,
          grossProfit: saleRevenue - saleCogs,
        };
      }),
    };
  }

  private buildFallbackStockMovementsReport(products: ProductCatalogItem[]): Record<string, unknown> {
    const lowStockItems = products.filter(
      (product) => this.productQty(product) <= this.productReorderLevel(product)
    ).length;

    return {
      mode: 'Local stock snapshot fallback',
      productsTracked: products.length,
      lowStockItems,
      note: 'Current stock snapshot is shown because the dedicated stock movement report needs reports.read.',
      items: products.map((product) => ({
        name: product.name,
        sku: product.sku,
        batchNumber: product.batchNumber || '-',
        expiryDate: product.expiryDate || '-',
        availableQuantity: this.productQty(product),
        reorderLevel: this.productReorderLevel(product),
        stockValue: this.productQty(product) * this.productPrice(product),
      })),
    };
  }

  private buildFallbackPaymentsReport(
    sales: Sale[],
    register: RegisterSession | null
  ): Record<string, unknown> {
    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const totalPaid = sales.reduce((sum, sale) => sum + Number(sale.paidAmount || 0), 0);

    return {
      mode: 'Local POS fallback',
      totalSales,
      totalPaid,
      totalOutstanding: totalSales - totalPaid,
      registerCashSales: Number(register?.summary?.cashSales || 0),
      items: sales.map((sale) => ({
        invoiceNo: sale.invoiceNo,
        saleDate: sale.saleDate,
        total: Number(sale.total || 0),
        paidAmount: Number(sale.paidAmount || 0),
        dueAmount: Number(sale.total || 0) - Number(sale.paidAmount || 0),
        paymentStatus: sale.paymentStatus,
      })),
    };
  }

  private buildFallbackExpensesReport(register: RegisterSession | null): Record<string, unknown> {
    return {
      mode: 'Register fallback',
      totalExpenses: Number(register?.summary?.totalExpenses || 0),
      cashExpenses: Number(register?.summary?.cashExpenses || 0),
      note: 'Detailed expenses rows require the dedicated reports API permission.',
      items: [],
    };
  }

  private productQty(product: ProductCatalogItem): number {
    return Number(product.availableQuantity ?? product.stockQuantity ?? 0) || 0;
  }

  private productPrice(product: ProductCatalogItem): number {
    return Number(product.sellingPrice || 0) || 0;
  }

  private productCost(product: ProductCatalogItem): number {
    return Number(product.costPrice || 0) || 0;
  }

  private productReorderLevel(product: ProductCatalogItem): number {
    return Number(product.reorderLevel || 0) || 0;
  }
}

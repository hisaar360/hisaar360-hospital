import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

import { BackendService } from '../../../core/services/backend.service';
import { todayYmd, toCalendarYmd } from '../../../core/utils/calendar-date';
import { HmsDocumentToolbarComponent } from '../../../shared/components/hms-document-toolbar/hms-document-toolbar.component';
import { formatCurrency, formatDateTime } from '../pharmacy-admin.utils';
import { buildPharmacyReportHtml } from '../pharmacy-export.util';

type PeriodChip = 'week' | 'month' | 'custom';
type SourceFilter = 'all' | 'sale' | 'purchase' | 'expense' | 'owner_cash';

interface PharmacyLedgerLine {
  id: string;
  movementAt: string | Date | null;
  type: string;
  typeLabel: string;
  referenceNo: string | null;
  description: string | null;
  inAmount: number;
  outAmount: number;
  balance: number;
  highlight: string | null;
}

@Component({
  selector: 'app-pharmacy-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HmsDocumentToolbarComponent],
  templateUrl: './pharmacy-ledger.component.html',
  styleUrl: './pharmacy-ledger.component.scss',
})
export class PharmacyLedgerComponent implements OnInit {
  loading = false;
  periodChip: PeriodChip = 'month';
  sourceFilter: SourceFilter = 'all';
  dateFrom = '';
  dateTo = '';
  cashInHand = 0;
  periodIn = 0;
  periodOut = 0;
  periodNet = 0;
  lines: PharmacyLedgerLine[] = [];

  readonly money = formatCurrency;

  dateTime(value: string | Date | null | undefined): string {
    if (value instanceof Date) {
      return formatDateTime(value.toISOString());
    }
    return formatDateTime(value ?? null);
  }

  readonly sourceChips: Array<{ key: SourceFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'sale', label: 'Sales' },
    { key: 'purchase', label: 'Purchases' },
    { key: 'expense', label: 'Expenses' },
    { key: 'owner_cash', label: 'Owner cash' },
  ];

  readonly getExportHtml = () =>
    buildPharmacyReportHtml(
      'Pharmacy Ledger',
      [
        { header: 'Date', key: 'date' },
        { header: 'Type', key: 'type' },
        { header: 'Reference', key: 'reference' },
        { header: 'Description', key: 'description' },
        { header: 'In', key: 'in' },
        { header: 'Out', key: 'out' },
        { header: 'Balance', key: 'balance' },
      ],
      this.lines.map((line) => ({
        date: this.dateTime(line.movementAt),
        type: line.typeLabel,
        reference: line.referenceNo || '—',
        description: line.description || '—',
        in: line.inAmount > 0 ? this.money(line.inAmount) : '—',
        out: line.outAmount > 0 ? this.money(line.outAmount) : '—',
        balance: this.money(line.balance),
      })),
    );

  constructor(
    private backend: BackendService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.applyPeriod('month', false);
    this.reload();
  }

  applyPeriod(chip: PeriodChip, reload = true): void {
    this.periodChip = chip;
    const today = new Date();
    this.dateTo = todayYmd();
    if (chip === 'week') {
      const start = new Date(today);
      start.setDate(today.getDay() === 0 ? today.getDate() - 6 : today.getDate() - (today.getDay() - 1));
      this.dateFrom = toCalendarYmd(start);
    } else if (chip === 'month') {
      this.dateFrom = toCalendarYmd(new Date(today.getFullYear(), today.getMonth(), 1));
    }
    if (reload && chip !== 'custom') {
      this.reload();
    }
  }

  applyCustom(): void {
    this.periodChip = 'custom';
    this.reload();
  }

  setSource(filter: SourceFilter): void {
    this.sourceFilter = filter;
    this.reload();
  }

  reload(): void {
    this.loading = true;
    const params: Record<string, unknown> = {
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined,
      limit: 200,
    };
    if (this.sourceFilter !== 'all') {
      params['source'] = this.sourceFilter;
    }

    this.backend
      .getPharmacyLedger(params)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.cashInHand = Number(data['cashInHand'] || 0);
          this.periodIn = Number(data['periodIn'] || 0);
          this.periodOut = Number(data['periodOut'] || 0);
          this.periodNet = Number(data['periodNet'] || 0);
          const raw = Array.isArray(data['lines']) ? data['lines'] : [];
          this.lines = raw.map((row) => {
            const r = row as Record<string, unknown>;
            return {
              id: String(r['id'] || ''),
              movementAt: (r['movementAt'] as string | Date | null) || null,
              type: String(r['type'] || ''),
              typeLabel: String(r['typeLabel'] || r['type'] || '—'),
              referenceNo: r['referenceNo'] != null ? String(r['referenceNo']) : null,
              description: r['description'] != null ? String(r['description']) : null,
              inAmount: Number(r['inAmount'] || 0),
              outAmount: Number(r['outAmount'] || 0),
              balance: Number(r['balance'] || 0),
              highlight: r['highlight'] != null ? String(r['highlight']) : null,
            };
          });
        },
        error: (err) => {
          this.lines = [];
          this.toastr.error(err?.error?.message || err?.message || 'Failed to load pharmacy ledger');
        },
      });
  }
}

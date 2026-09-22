import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { BackendService } from './backend.service';
import { CompanyProfile } from '../../shared/models/company.model';

export const DEFAULT_CURRENCY = 'PKR';

export const HMS_CURRENCY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'PKR', label: 'PKR — Pakistani Rupee' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'AFN', label: 'AFN — Afghan Afghani' },
  { code: 'CNY', label: 'CNY — Chinese Yuan' },
  { code: 'TRY', label: 'TRY — Turkish Lira' },
];

/** Display symbols for UI/print (hospital currency setting). */
const DISPLAY_LABELS: Record<string, string> = {
  PKR: 'Rs.',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED',
  SAR: 'SAR',
  INR: '₹',
  AFN: '؋',
  CNY: '¥',
  TRY: '₺',
};

/** Sync snapshot for non-DI helpers (print builders, pharmacy utils). */
let activeCurrencyCode = DEFAULT_CURRENCY;
let activeCurrencyLabel = DISPLAY_LABELS[DEFAULT_CURRENCY] || DEFAULT_CURRENCY;

function syncActiveCurrency(code: string): void {
  const next = String(code || DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY;
  activeCurrencyCode = next;
  activeCurrencyLabel = DISPLAY_LABELS[next] || next;
}

export function getHmsCurrencyCode(): string {
  return activeCurrencyCode || DEFAULT_CURRENCY;
}

export function getHmsCurrencyLabel(): string {
  return activeCurrencyLabel || DISPLAY_LABELS[DEFAULT_CURRENCY] || DEFAULT_CURRENCY;
}

/** Format money using the currently active hospital currency (works outside Angular DI). */
export function formatActiveCurrency(
  value: unknown,
  options?: { fractionDigits?: number; useCode?: boolean }
): string {
  const amount = Number(value || 0);
  const safe = Number.isFinite(amount) ? amount : 0;
  const digits =
    options?.fractionDigits ?? (Number.isInteger(safe) ? 0 : 2);
  const formatted = safe.toLocaleString('en-PK', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const prefix = options?.useCode ? getHmsCurrencyCode() : getHmsCurrencyLabel();
  return `${prefix} ${formatted}`;
}

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly codeSubject = new BehaviorSubject<string>(DEFAULT_CURRENCY);
  readonly code$ = this.codeSubject.asObservable();
  private loaded = false;

  constructor(private backend: BackendService) {
    syncActiveCurrency(DEFAULT_CURRENCY);
  }

  get code(): string {
    return this.codeSubject.value || DEFAULT_CURRENCY;
  }

  get label(): string {
    return DISPLAY_LABELS[this.code] || this.code;
  }

  /** Synchronous format for TS / print builders / components. */
  format(
    value: unknown,
    options?: { fractionDigits?: number; useCode?: boolean }
  ): string {
    return formatActiveCurrency(value, options);
  }

  ensureLoaded(): void {
    if (this.loaded) {
      return;
    }
    this.reload().subscribe({ error: () => undefined });
  }

  reload(): Observable<CompanyProfile> {
    return this.backend.getMyCompany().pipe(
      tap((company) => {
        this.applyCompany(company);
      })
    );
  }

  applyCompany(company: Pick<CompanyProfile, 'currency'> | null | undefined): void {
    const next =
      String(company?.currency || DEFAULT_CURRENCY)
        .trim()
        .toUpperCase() || DEFAULT_CURRENCY;
    this.loaded = true;
    syncActiveCurrency(next);
    if (next !== this.codeSubject.value) {
      this.codeSubject.next(next);
    }
  }

  setLocalCode(code: string): void {
    const next = String(code || DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY;
    syncActiveCurrency(next);
    this.codeSubject.next(next);
  }

  saveCurrency(code: string): Observable<CompanyProfile> {
    const currency = String(code || DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY;
    return this.backend.updateMyCurrency({ currency }).pipe(
      map((response) => response.data || ({ currency } as CompanyProfile)),
      tap((company) => this.applyCompany(company))
    );
  }
}

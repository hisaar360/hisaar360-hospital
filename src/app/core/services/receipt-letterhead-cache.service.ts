import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, switchMap, tap, timer } from 'rxjs';
import { CompanyProfile, ReceiptLetterheadSettings } from '../../shared/models/company.model';
import { BackendService } from './backend.service';

const STORAGE_PREFIX = 'hisaar360.receiptLetterhead.';
const ACTIVE_COMPANY_KEY = 'hisaar360.receiptLetterhead.companyId';
const HOUR_MS = 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class ReceiptLetterheadCacheService {
  private readonly backend = inject(BackendService);

  storageKey(companyId: string): string {
    return `${STORAGE_PREFIX}${companyId}`;
  }

  currentCompanyId(): string {
    if (typeof localStorage === 'undefined') {
      return '';
    }
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null') as { companyId?: string | null } | null;
      return String(user?.companyId || localStorage.getItem(ACTIVE_COMPANY_KEY) || '').trim();
    } catch {
      return '';
    }
  }

  read(companyId = this.currentCompanyId()): ReceiptLetterheadSettings | null {
    if (!companyId || typeof localStorage === 'undefined') {
      return null;
    }
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey(companyId)) || 'null') as ReceiptLetterheadSettings | null;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  write(company: Pick<CompanyProfile, '_id' | 'receiptLetterhead'> | null | undefined): void {
    const companyId = String(company?._id || '').trim();
    const letterhead = company?.receiptLetterhead;
    if (!companyId || !letterhead || typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
    localStorage.setItem(this.storageKey(companyId), JSON.stringify(letterhead));
  }

  /** Fetch immediately, then once per hour. A failed hour keeps the previous cache. */
  watchHourly(): Observable<CompanyProfile> {
    return timer(0, HOUR_MS).pipe(
      switchMap(() =>
        this.backend.getMyCompany().pipe(
          tap((company) => this.write(company)),
          catchError(() => EMPTY),
        ),
      ),
    );
  }
}

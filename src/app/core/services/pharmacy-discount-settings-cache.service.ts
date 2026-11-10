import { Injectable } from '@angular/core';
import {
  CompanyProfile,
  PharmacyDiscountSettings,
} from '../../shared/models/company.model';

const STORAGE_PREFIX = 'hisaar360.pharmacyDiscountSettings.';
const ACTIVE_COMPANY_KEY = 'hisaar360.pharmacyDiscountSettings.companyId';

const DEFAULT_SETTINGS: PharmacyDiscountSettings = {
  allowDiscountAnyMedicine: false,
};

@Injectable({ providedIn: 'root' })
export class PharmacyDiscountSettingsCacheService {
  storageKey(companyId: string): string {
    return `${STORAGE_PREFIX}${companyId}`;
  }

  currentCompanyId(): string {
    if (typeof localStorage === 'undefined') {
      return '';
    }
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null') as {
        companyId?: string | null;
      } | null;
      return String(
        user?.companyId || localStorage.getItem(ACTIVE_COMPANY_KEY) || '',
      ).trim();
    } catch {
      return '';
    }
  }

  read(companyId = this.currentCompanyId()): PharmacyDiscountSettings {
    if (!companyId || typeof localStorage === 'undefined') {
      return { ...DEFAULT_SETTINGS };
    }
    try {
      const parsed = JSON.parse(
        localStorage.getItem(this.storageKey(companyId)) || 'null',
      ) as PharmacyDiscountSettings | null;
      if (!parsed || typeof parsed !== 'object') {
        return { ...DEFAULT_SETTINGS };
      }
      return {
        allowDiscountAnyMedicine: Boolean(parsed.allowDiscountAnyMedicine),
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  write(
    company:
      | Pick<CompanyProfile, '_id' | 'pharmacyDiscountSettings'>
      | null
      | undefined,
  ): void {
    const companyId = String(company?._id || '').trim();
    if (!companyId || typeof localStorage === 'undefined') {
      return;
    }
    const settings: PharmacyDiscountSettings = {
      allowDiscountAnyMedicine: Boolean(
        company?.pharmacyDiscountSettings?.allowDiscountAnyMedicine,
      ),
    };
    localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
    localStorage.setItem(this.storageKey(companyId), JSON.stringify(settings));
  }

  allowDiscountAnyMedicine(companyId = this.currentCompanyId()): boolean {
    return this.read(companyId).allowDiscountAnyMedicine;
  }
}

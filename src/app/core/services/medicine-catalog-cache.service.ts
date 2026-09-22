import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  hasPermission,
  readStoredPermissions,
} from '../../modules/auth/access-control';
import { ProductCatalogItem } from '../../shared/models/hospital.model';
import { BackendService } from './backend.service';
import { MooliOfflineService } from './mooli-offline.service';

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const SESSION_FRESH_PREFIX = 'medicine-catalog-fresh:';

/**
 * Hospital-wide pharmacy medicine catalog kept in memory + IndexedDB so OPD
 * suggestions and Pharmacy search avoid per-keystroke API calls.
 *
 * Fresh network load: once per login session, or after pharmacy upload/invalidate.
 */
@Injectable({ providedIn: 'root' })
export class MedicineCatalogCacheService {
  private readonly backend = inject(BackendService);
  private readonly offline = inject(MooliOfflineService);

  private readonly itemsSignal = signal<ProductCatalogItem[]>([]);
  private readonly loadingSignal = signal(false);
  private memoryScope = '';
  private inflight: Promise<ProductCatalogItem[]> | null = null;

  readonly items = this.itemsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly count = computed(() => this.itemsSignal().length);

  /** Local typeahead — starts matching from the first character. */
  search(query: string, limit = 20): ProductCatalogItem[] {
    const normalized = String(query || '')
      .trim()
      .toLowerCase();
    if (!normalized) {
      return [];
    }

    const ranked: Array<{ score: number; item: ProductCatalogItem }> = [];
    for (const item of this.itemsSignal()) {
      const haystack = this.searchText(item);
      if (!haystack.includes(normalized)) {
        continue;
      }
      const name = String(item.name || '')
        .trim()
        .toLowerCase();
      let score = 50;
      if (name === normalized) score = 0;
      else if (name.startsWith(normalized)) score = 10;
      else if (haystack.startsWith(normalized)) score = 20;
      ranked.push({ score, item });
    }

    return ranked
      .sort((a, b) => a.score - b.score || String(a.item.name).localeCompare(String(b.item.name)))
      .slice(0, limit)
      .map((entry) => entry.item);
  }

  snapshot(): ProductCatalogItem[] {
    return this.itemsSignal().slice();
  }

  /**
   * Load catalog if missing / stale for this session.
   * `force` always hits the API (new medicine upload, manual refresh).
   */
  ensureLoaded(options?: { force?: boolean }): Promise<ProductCatalogItem[]> {
    const force = Boolean(options?.force);
    const scope = this.scopeKey();
    if (!scope || scope.startsWith('anon:')) {
      this.itemsSignal.set([]);
      this.memoryScope = '';
      return Promise.resolve([]);
    }

    if (!this.canLoadCatalog()) {
      return Promise.resolve(this.itemsSignal());
    }

    const sessionFresh = this.isSessionFresh(scope);
    if (
      !force &&
      sessionFresh &&
      this.memoryScope === scope &&
      this.itemsSignal().length > 0
    ) {
      return Promise.resolve(this.itemsSignal());
    }

    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = this.loadCatalog(scope, force)
      .catch(() => this.itemsSignal())
      .finally(() => {
        this.inflight = null;
      });

    return this.inflight;
  }

  /** Force re-fetch after pharmacy create / update / delete / bulk import. */
  refresh(): Promise<ProductCatalogItem[]> {
    const scope = this.scopeKey();
    this.clearSessionFresh(scope);
    return this.ensureLoaded({ force: true });
  }

  clear(): void {
    this.itemsSignal.set([]);
    this.memoryScope = '';
    this.inflight = null;
    this.clearAllSessionFreshFlags();
  }

  private async loadCatalog(
    scope: string,
    force: boolean
  ): Promise<ProductCatalogItem[]> {
    this.loadingSignal.set(true);
    try {
      if (!force) {
        const cached = await this.offline.readCachedValue<ProductCatalogItem[]>(
          this.cacheKey(scope),
          []
        );
        if (cached.length) {
          this.itemsSignal.set(cached);
          this.memoryScope = scope;
          // Same browser session: reuse IndexedDB without another full API pull.
          if (this.isSessionFresh(scope)) {
            return cached;
          }
        }
      }

      const items = await this.fetchAllPages();
      const merged = this.mergePreservingZeroStock(this.itemsSignal(), items);
      this.itemsSignal.set(merged);
      this.memoryScope = scope;
      this.markSessionFresh(scope);
      void this.offline.cacheValue(this.cacheKey(scope), merged);
      return merged;
    } catch (err) {
      const cached = await this.offline.readCachedValue<ProductCatalogItem[]>(
        this.cacheKey(scope),
        this.itemsSignal()
      );
      if (cached.length) {
        this.itemsSignal.set(cached);
        this.memoryScope = scope;
      }
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  private async fetchAllPages(): Promise<ProductCatalogItem[]> {
    const collected: ProductCatalogItem[] = [];
    const seen = new Set<string>();

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const result = await firstValueFrom(
        this.backend.getPrescriptionProductSuggestions({
          page,
          limit: PAGE_SIZE,
          isActive: true,
        })
      );

      const batch = Array.isArray(result?.items) ? result.items : [];
      for (const item of batch) {
        const id = String(item?._id || '');
        if (!id || seen.has(id)) {
          continue;
        }
        seen.add(id);
        collected.push(item);
      }

      const totalPages = Number(result?.pagination?.totalPages || 0);
      if (!batch.length || (totalPages > 0 && page >= totalPages) || batch.length < PAGE_SIZE) {
        break;
      }
    }

    return collected;
  }

  /**
   * Keep previously cached medicines that the API omitted (e.g. stock hit 0)
   * so local typeahead still shows them as out of stock.
   */
  private mergePreservingZeroStock(
    previous: ProductCatalogItem[],
    fresh: ProductCatalogItem[]
  ): ProductCatalogItem[] {
    const merged = [...(fresh || [])];
    const freshIds = new Set(
      merged.map((item) => String(item?._id || '')).filter(Boolean)
    );

    for (const prev of previous || []) {
      const id = String(prev?._id || '');
      if (!id || freshIds.has(id)) {
        continue;
      }
      merged.push({
        ...prev,
        availableQuantity: '0',
        stockQuantity: '0',
      });
    }

    return merged;
  }

  private canLoadCatalog(): boolean {
    const permissions = readStoredPermissions();
    return (
      hasPermission('products.read', permissions) ||
      hasPermission('prescriptions.read', permissions) ||
      hasPermission('prescriptions.create', permissions) ||
      hasPermission('prescriptions.update', permissions) ||
      permissions.includes('*')
    );
  }

  private searchText(item: ProductCatalogItem): string {
    return [
      item.name,
      item.brand,
      item.sku,
      item.barcode,
      item.unit,
      item.strengthValue,
      item.strengthUnit,
      item.batchNumber,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  private scopeKey(): string {
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      const companyId = user?.companyId || user?.hospital?.companyId || 'company';
      const hospitalId = user?.hospitalId || user?.hospital?._id || 'hospital';
      const userId = user?._id || 'user';
      return `${companyId}:${hospitalId}:${userId}`;
    } catch {
      return 'anon:anon:anon';
    }
  }

  private cacheKey(scope: string): string {
    return this.offline.cacheKey('medicine-catalog', scope);
  }

  private sessionFreshKey(scope: string): string {
    return `${SESSION_FRESH_PREFIX}${scope}`;
  }

  private isSessionFresh(scope: string): boolean {
    if (typeof sessionStorage === 'undefined') {
      return false;
    }
    return sessionStorage.getItem(this.sessionFreshKey(scope)) === '1';
  }

  private markSessionFresh(scope: string): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.setItem(this.sessionFreshKey(scope), '1');
  }

  private clearSessionFresh(scope: string): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.removeItem(this.sessionFreshKey(scope));
  }

  private clearAllSessionFreshFlags(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(SESSION_FRESH_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  }
}

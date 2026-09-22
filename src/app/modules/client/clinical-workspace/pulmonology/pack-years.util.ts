/**
 * Cigarette pack-years helper (Phase I Pulmonology).
 * Pack-years = packs/day × years smoked.
 * Packs/day may be entered directly or derived as cigarettesPerDay / 20.
 * Vaping / shisha / biomass must NEVER produce pack-years.
 */

export interface PackYearInput {
  cigarettesPerDay?: number | string | null;
  packsPerDay?: number | string | null;
  yearsSmoked?: number | string | null;
  /** Explicit product type — only 'cigarette' (or omitted) may calculate. */
  productType?: 'cigarette' | 'vaping' | 'shisha' | 'other' | string | null;
}

export interface PackYearResult {
  packYears: number | null;
  packsPerDayUsed: number | null;
  complete: boolean;
  reason?: string;
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}

/**
 * Calculate pack-years only when cigarette inputs are complete.
 * Complete = yearsSmoked present AND (cigarettesPerDay OR packsPerDay) present.
 * Returns null packYears for vaping/shisha/other or incomplete inputs.
 */
export function calculatePackYears(input: PackYearInput | null | undefined): PackYearResult {
  const product = String(input?.productType || 'cigarette')
    .trim()
    .toLowerCase();

  if (product === 'vaping' || product === 'shisha' || product === 'other') {
    return {
      packYears: null,
      packsPerDayUsed: null,
      complete: false,
      reason: 'Pack-years apply to cigarettes only',
    };
  }

  const years = toFiniteNumber(input?.yearsSmoked);
  const cigs = toFiniteNumber(input?.cigarettesPerDay);
  const packs = toFiniteNumber(input?.packsPerDay);

  if (years === null || years < 0) {
    return {
      packYears: null,
      packsPerDayUsed: null,
      complete: false,
      reason: 'yearsSmoked required',
    };
  }

  let packsPerDayUsed: number | null = null;
  if (packs !== null && packs >= 0) {
    packsPerDayUsed = packs;
  } else if (cigs !== null && cigs >= 0) {
    packsPerDayUsed = cigs / 20;
  } else {
    return {
      packYears: null,
      packsPerDayUsed: null,
      complete: false,
      reason: 'cigarettesPerDay or packsPerDay required',
    };
  }

  const packYears = Math.round(packsPerDayUsed * years * 100) / 100;
  return {
    packYears,
    packsPerDayUsed: Math.round(packsPerDayUsed * 1000) / 1000,
    complete: true,
  };
}

/** True only for complete cigarette inputs that yield a finite pack-year value. */
export function hasCompleteCigarettePackYearInputs(
  input: PackYearInput | null | undefined
): boolean {
  return calculatePackYears(input).complete === true;
}

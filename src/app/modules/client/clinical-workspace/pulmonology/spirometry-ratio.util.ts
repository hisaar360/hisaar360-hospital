/**
 * Transparent FEV1/FVC ratio helper — display arithmetic only.
 * Does NOT diagnose obstruction, COPD, asthma, or restriction.
 */

export interface SpirometryRatioInput {
  fev1?: number | string | null;
  fvc?: number | string | null;
  /** Unit labels — ratio only when both present and compatible. */
  fev1Unit?: string | null;
  fvcUnit?: string | null;
}

export interface SpirometryRatioResult {
  ratio: number | null;
  compatible: boolean;
  reason?: string;
}

function toPositiveFinite(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

function normalizeUnit(unit: string | null | undefined): string {
  return String(unit || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

/**
 * Units are compatible when both blank, both identical after normalize,
 * or both are litre-like (l / liter / litre).
 */
export function unitsCompatible(
  fev1Unit?: string | null,
  fvcUnit?: string | null
): boolean {
  const a = normalizeUnit(fev1Unit);
  const b = normalizeUnit(fvcUnit);
  if (!a && !b) {
    return true;
  }
  if (a && b && a === b) {
    return true;
  }
  const litreLike = new Set(['l', 'liter', 'litre', 'liters', 'litres']);
  if (litreLike.has(a) && litreLike.has(b)) {
    return true;
  }
  // One blank + one set → treat as compatible for visit refs (same assumed unit)
  if ((a && !b) || (!a && b)) {
    return true;
  }
  return false;
}

/**
 * Returns FEV1/FVC when both values are positive finite and units are compatible.
 * Never interprets clinical significance.
 */
export function calculateFev1FvcRatio(
  input: SpirometryRatioInput | null | undefined
): SpirometryRatioResult {
  const fev1 = toPositiveFinite(input?.fev1);
  const fvc = toPositiveFinite(input?.fvc);

  if (fev1 === null || fvc === null) {
    return {
      ratio: null,
      compatible: false,
      reason: 'Both FEV1 and FVC required',
    };
  }

  if (!unitsCompatible(input?.fev1Unit, input?.fvcUnit)) {
    return {
      ratio: null,
      compatible: false,
      reason: 'Units not compatible',
    };
  }

  const ratio = Math.round((fev1 / fvc) * 1000) / 1000;
  return {
    ratio,
    compatible: true,
  };
}

/**
 * GrowthReferenceService — LMS-based pediatric growth references (H.1 hardened).
 *
 * PRODUCTION uses GROWTH_PRODUCTION_DATA (monthly complete for declared indicators).
 * TEST_FIXTURES are sparse and must be selected explicitly — never default production.
 *
 * Runtime lookup:
 * - exact completed-month match, OR
 * - linear LMS interpolation only between adjacent table points with Δmonths === 1
 * - never interpolate across sparse gaps; never fabricate LMS
 *
 * Z-score / percentile are DERIVED. Raw measurement remains canonical.
 * Never auto-diagnose FTT / stunting / wasting / obesity.
 */

import {
  findIndicatorRange,
  GROWTH_REFERENCE_MANIFEST,
} from './growth-reference.manifest';
import { GROWTH_TEST_FIXTURES } from './growth-reference.fixtures';
import { GROWTH_PRODUCTION_DATA } from './growth-reference.production-data';
import {
  GrowthDatasetKind,
  GrowthIndicator,
  GrowthLmsTables,
  GrowthMeasurementType,
  GrowthReferenceProfileId,
  GrowthReferenceResult,
  GrowthSex,
  LengthOrHeightMode,
  LmsPoint,
  LmsTableKey,
} from './growth-reference.types';

export type {
  GrowthDatasetKind,
  GrowthIndicator,
  GrowthMeasurementType,
  GrowthReferenceProfileId,
  GrowthReferenceResult,
  GrowthSex,
  LengthOrHeightMode,
  LmsPoint,
} from './growth-reference.types';

export { GROWTH_REFERENCE_MANIFEST, findIndicatorRange } from './growth-reference.manifest';
export { GROWTH_TEST_FIXTURES } from './growth-reference.fixtures';
export { GROWTH_PRODUCTION_DATA } from './growth-reference.production-data';

function datasetFor(kind: GrowthDatasetKind): GrowthLmsTables {
  return kind === 'test_fixtures' ? GROWTH_TEST_FIXTURES : GROWTH_PRODUCTION_DATA;
}

function tableKey(indicator: GrowthIndicator, sex: GrowthSex): LmsTableKey | null {
  const boy = sex === 'male';
  switch (indicator) {
    case 'weight_for_age':
      return boy ? 'wfa_male' : 'wfa_female';
    case 'length_height_for_age':
      return boy ? 'lhfa_male' : 'lhfa_female';
    case 'bmi_for_age':
      return boy ? 'bmi_male' : 'bmi_female';
    case 'head_circumference_for_age':
      return boy ? 'hc_male' : 'hc_female';
    default:
      return null;
  }
}

/**
 * Exact month match, or interpolate only when adjacent points differ by exactly 1 month.
 * Sparse fixture gaps (e.g. 0 → 6) return null — Reference data not available.
 */
export function lookupLmsPoint(table: LmsPoint[] | undefined, ageMonths: number): LmsPoint | null {
  if (!table?.length || !Number.isFinite(ageMonths) || ageMonths < 0) {
    return null;
  }
  const exact = table.find((p) => p.ageMonths === ageMonths);
  if (exact) {
    return exact;
  }
  const sorted = [...table].sort((a, b) => a.ageMonths - b.ageMonths);
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (ageMonths > a.ageMonths && ageMonths < b.ageMonths) {
      if (b.ageMonths - a.ageMonths !== 1) {
        return null; // gap — do not fabricate
      }
      const t = ageMonths - a.ageMonths; // 0..1 when Δ=1
      return {
        ageMonths,
        L: a.L + t * (b.L - a.L),
        M: a.M + t * (b.M - a.M),
        S: a.S + t * (b.S - a.S),
      };
    }
  }
  return null;
}

export function lmsZScore(value: number, L: number, M: number, S: number): number {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(M) || M <= 0 || !Number.isFinite(S) || S <= 0) {
    return NaN;
  }
  if (Math.abs(L) < 1e-7) {
    return Math.log(value / M) / S;
  }
  return (Math.pow(value / M, L) - 1) / (L * S);
}

export function zToPercentile(z: number): number {
  if (!Number.isFinite(z)) {
    return NaN;
  }
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const cdf = z >= 0 ? 1 - p : p;
  return Math.round(cdf * 1000) / 10;
}

export function ageInCompletedMonths(dob: string | Date, measurementDate: string | Date): number | null {
  const birth = new Date(typeof dob === 'string' ? `${String(dob).slice(0, 10)}T00:00:00` : dob);
  const meas = new Date(
    typeof measurementDate === 'string' ? `${String(measurementDate).slice(0, 10)}T00:00:00` : measurementDate
  );
  if (Number.isNaN(birth.getTime()) || Number.isNaN(meas.getTime()) || meas < birth) {
    return null;
  }
  let months = (meas.getFullYear() - birth.getFullYear()) * 12 + (meas.getMonth() - birth.getMonth());
  if (meas.getDate() < birth.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

export function resolveProfileForAge(ageMonths: number): GrowthReferenceProfileId | null {
  if (ageMonths >= 0 && ageMonths < 61) {
    return 'WHO_CGS_2006';
  }
  if (ageMonths >= 61 && ageMonths < 229) {
    return 'WHO_GR_2007';
  }
  return null;
}

function normalizeSex(sex?: string | null): GrowthSex | null {
  const s = String(sex || '')
    .trim()
    .toLowerCase();
  if (s === 'male' || s === 'm' || s === 'boy') {
    return 'male';
  }
  if (s === 'female' || s === 'f' || s === 'girl') {
    return 'female';
  }
  return null;
}

function normalizeMode(mode?: string | null): LengthOrHeightMode {
  const m = String(mode || '').trim();
  if (m === 'recumbent_length' || m === 'standing_height' || m === 'not_specified') {
    return m;
  }
  return '';
}

function measurementTypeToIndicator(
  measurementType: GrowthMeasurementType
): GrowthIndicator | null {
  if (measurementType === 'weight_kg') {
    return 'weight_for_age';
  }
  if (measurementType === 'length_cm' || measurementType === 'height_cm') {
    return 'length_height_for_age';
  }
  if (measurementType === 'bmi') {
    return 'bmi_for_age';
  }
  if (measurementType === 'head_circumference_cm') {
    return 'head_circumference_for_age';
  }
  return null;
}

function formatIso(d?: string | Date | null): string | null {
  if (!d) {
    return null;
  }
  if (typeof d === 'string') {
    return d.slice(0, 10);
  }
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function listGrowthReferenceProfiles() {
  return Object.values(GROWTH_REFERENCE_MANIFEST);
}

export function isProductionDatasetComplete(): boolean {
  return Object.values(GROWTH_REFERENCE_MANIFEST).every(
    (m) => m.datasetCompleteness === 'complete_monthly_for_declared_indicators'
  );
}

/** Assert test fixtures are not advertised as production-complete. */
export function assertFixturesAreNotProduction(): boolean {
  const sparseGaps = (GROWTH_TEST_FIXTURES.wfa_male || []).some((p, i, arr) => {
    if (i === 0) {
      return false;
    }
    return p.ageMonths - arr[i - 1].ageMonths > 1;
  });
  const prodDense = (GROWTH_PRODUCTION_DATA.wfa_male || []).length >= 61;
  return sparseGaps && prodDense;
}

export function evaluateGrowthReference(input: {
  sex?: string | null;
  dateOfBirth?: string | Date | null;
  measurementDate?: string | Date | null;
  measurementType: GrowthMeasurementType;
  value: number;
  lengthOrHeightMode?: string | null;
  preferredProfile?: GrowthReferenceProfileId | null;
  /** Default: production. Tests may pass 'test_fixtures'. */
  datasetKind?: GrowthDatasetKind;
}): GrowthReferenceResult {
  const datasetKind: GrowthDatasetKind = input.datasetKind || 'production';
  const empty = (
    reason: string,
    extras?: Partial<GrowthReferenceResult>
  ): GrowthReferenceResult => ({
    eligible: false,
    indicator: null,
    zScore: null,
    percentile: null,
    referenceName: '',
    referenceVersion: '',
    referenceProfile: null,
    profileId: null,
    reasonUnavailable: reason,
    ageMonths: null,
    measurementDate: formatIso(input.measurementDate),
    sex: normalizeSex(input.sex),
    measurementType: input.measurementType,
    rawMeasurement: Number.isFinite(input.value) ? input.value : null,
    lengthOrHeightMode: normalizeMode(input.lengthOrHeightMode) || null,
    datasetKind,
    datasetCompleteness:
      datasetKind === 'test_fixtures'
        ? 'partial_sparse_test_fixture'
        : 'complete_monthly_for_declared_indicators',
    ...extras,
  });

  const sex = normalizeSex(input.sex);
  if (!sex) {
    return empty('Reference data not available — sex required');
  }
  if (!input.dateOfBirth) {
    return empty('Reference data not available — date of birth required');
  }
  if (!Number.isFinite(input.value) || input.value <= 0) {
    return empty('Reference data not available — invalid measurement');
  }

  const ageMonths = ageInCompletedMonths(input.dateOfBirth, input.measurementDate || new Date());
  if (ageMonths === null) {
    return empty('Reference data not available — invalid dates');
  }

  const profileId = input.preferredProfile || resolveProfileForAge(ageMonths);
  if (!profileId) {
    return empty('Reference data not available — age outside supported range', { ageMonths });
  }

  const manifest = GROWTH_REFERENCE_MANIFEST[profileId];
  const indicator = measurementTypeToIndicator(input.measurementType);
  if (!indicator || !manifest.supportedIndicators.includes(indicator)) {
    return empty('Reference data not available — indicator not supported', {
      ageMonths,
      profileId,
      referenceProfile: profileId,
      referenceName: manifest.name,
      referenceVersion: manifest.version,
    });
  }

  const range = findIndicatorRange(profileId, indicator, ageMonths);
  if (!range) {
    return empty('Reference data not available — age outside indicator range', {
      ageMonths,
      profileId,
      referenceProfile: profileId,
      referenceName: manifest.name,
      referenceVersion: manifest.version,
      indicator,
    });
  }

  // Length vs height: do not guess mode
  if (indicator === 'length_height_for_age') {
    const mode = normalizeMode(input.lengthOrHeightMode);
    const required = range.requiredLengthHeightModes || [];
    if (!mode || mode === 'not_specified') {
      // Also reject mismatched measurementType vs required mode when mode missing
      return empty('Reference data not available — length/height mode required', {
        ageMonths,
        profileId,
        referenceProfile: profileId,
        referenceName: manifest.name,
        referenceVersion: manifest.version,
        indicator,
      });
    }
    if (required.length && !required.includes(mode as 'recumbent_length' | 'standing_height')) {
      return empty('Reference data not available — length/height mode mismatch for age', {
        ageMonths,
        profileId,
        referenceProfile: profileId,
        referenceName: manifest.name,
        referenceVersion: manifest.version,
        indicator,
      });
    }
    if (input.measurementType === 'length_cm' && mode !== 'recumbent_length') {
      return empty('Reference data not available — length measurement requires recumbent_length mode', {
        ageMonths,
        profileId,
        referenceProfile: profileId,
        indicator,
      });
    }
    if (input.measurementType === 'height_cm' && mode !== 'standing_height') {
      return empty('Reference data not available — height measurement requires standing_height mode', {
        ageMonths,
        profileId,
        referenceProfile: profileId,
        indicator,
      });
    }
  }

  const key = tableKey(indicator, sex);
  const tables = datasetFor(datasetKind);
  const table = key ? tables[key] : undefined;
  const lms = lookupLmsPoint(table, ageMonths);
  if (!lms) {
    return empty('Reference data not available', {
      ageMonths,
      profileId,
      referenceProfile: profileId,
      referenceName: manifest.name,
      referenceVersion: manifest.version,
      indicator,
    });
  }

  // Never label WHO percentile from incomplete fixture as production complete
  if (
    datasetKind === 'production' &&
    manifest.datasetCompleteness !== 'complete_monthly_for_declared_indicators'
  ) {
    return empty('Reference data not available — production dataset incomplete', {
      ageMonths,
      profileId,
      referenceProfile: profileId,
    });
  }

  const z = lmsZScore(input.value, lms.L, lms.M, lms.S);
  if (!Number.isFinite(z)) {
    return empty('Reference data not available — calculation failed', {
      ageMonths,
      profileId,
      referenceProfile: profileId,
      indicator,
    });
  }

  return {
    eligible: true,
    indicator,
    zScore: Math.round(z * 100) / 100,
    percentile: zToPercentile(z),
    referenceName: manifest.name,
    referenceVersion: manifest.version,
    referenceProfile: profileId,
    profileId,
    reasonUnavailable: null,
    ageMonths,
    measurementDate: formatIso(input.measurementDate),
    sex,
    measurementType: input.measurementType,
    rawMeasurement: input.value,
    lengthOrHeightMode: normalizeMode(input.lengthOrHeightMode) || null,
    datasetKind,
    datasetCompleteness: manifest.datasetCompleteness,
  };
}

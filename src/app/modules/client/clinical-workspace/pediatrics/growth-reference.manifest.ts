/**
 * H.1 Growth reference manifest — single source of age/indicator support.
 * Runtime must consult this; do not scatter age limits in UI components.
 */

import { GrowthIndicator, GrowthReferenceProfileId, GrowthSex } from './growth-reference.types';

export type DatasetCompleteness =
  | 'complete_monthly_for_declared_indicators'
  | 'partial_sparse_test_fixture';

export interface IndicatorAgeRange {
  indicator: GrowthIndicator;
  /** Inclusive completed months */
  minAgeMonths: number;
  /** Exclusive completed months */
  maxAgeMonthsExclusive: number;
  /** Measurement modes required for length/height indicators */
  requiredLengthHeightModes?: Array<'recumbent_length' | 'standing_height'>;
  notes?: string;
}

export interface GrowthReferenceManifestEntry {
  id: GrowthReferenceProfileId;
  name: string;
  version: string;
  dataSource: string;
  datasetCompleteness: DatasetCompleteness;
  supportedSexes: GrowthSex[];
  supportedIndicators: GrowthIndicator[];
  ageRanges: IndicatorAgeRange[];
  measurementModes: Array<'recumbent_length' | 'standing_height' | 'not_specified'>;
}

/**
 * Production manifests declare what Hisaar360 claims to support.
 * Partial sparse fixtures must NEVER be labeled as this production completeness.
 */
export const GROWTH_REFERENCE_MANIFEST: Record<GrowthReferenceProfileId, GrowthReferenceManifestEntry> = {
  WHO_CGS_2006: {
    id: 'WHO_CGS_2006',
    name: 'WHO Child Growth Standards',
    version: '2006',
    dataSource: 'WHO Child Growth Standards LMS parameters (bundled production monthly tables)',
    datasetCompleteness: 'complete_monthly_for_declared_indicators',
    supportedSexes: ['male', 'female'],
    supportedIndicators: [
      'weight_for_age',
      'length_height_for_age',
      'bmi_for_age',
      'head_circumference_for_age',
    ],
    ageRanges: [
      { indicator: 'weight_for_age', minAgeMonths: 0, maxAgeMonthsExclusive: 61 },
      {
        indicator: 'length_height_for_age',
        minAgeMonths: 0,
        maxAgeMonthsExclusive: 24,
        requiredLengthHeightModes: ['recumbent_length'],
        notes: '0–<24 mo: recumbent length required',
      },
      {
        indicator: 'length_height_for_age',
        minAgeMonths: 24,
        maxAgeMonthsExclusive: 61,
        requiredLengthHeightModes: ['standing_height'],
        notes: '24–60 mo: standing height required',
      },
      { indicator: 'bmi_for_age', minAgeMonths: 0, maxAgeMonthsExclusive: 61 },
      {
        indicator: 'head_circumference_for_age',
        minAgeMonths: 0,
        maxAgeMonthsExclusive: 61,
        notes: 'WHO HC standards 0–60 months',
      },
    ],
    measurementModes: ['recumbent_length', 'standing_height', 'not_specified'],
  },
  WHO_GR_2007: {
    id: 'WHO_GR_2007',
    name: 'WHO Growth Reference',
    version: '2007',
    dataSource: 'WHO Growth Reference 2007 LMS parameters (bundled production monthly tables)',
    datasetCompleteness: 'complete_monthly_for_declared_indicators',
    supportedSexes: ['male', 'female'],
    supportedIndicators: ['length_height_for_age', 'bmi_for_age', 'weight_for_age'],
    ageRanges: [
      {
        indicator: 'length_height_for_age',
        minAgeMonths: 61,
        maxAgeMonthsExclusive: 229,
        requiredLengthHeightModes: ['standing_height'],
      },
      { indicator: 'bmi_for_age', minAgeMonths: 61, maxAgeMonthsExclusive: 229 },
      {
        indicator: 'weight_for_age',
        minAgeMonths: 61,
        maxAgeMonthsExclusive: 121,
        notes: 'WHO 5–19 weight-for-age only through 10 years (120 completed months)',
      },
    ],
    measurementModes: ['standing_height', 'not_specified'],
  },
};

export const TEST_FIXTURE_MANIFEST_NOTE =
  'TEST_FIXTURES are sparse and must never be advertised as production WHO coverage.';

export function findIndicatorRange(
  profileId: GrowthReferenceProfileId,
  indicator: GrowthIndicator,
  ageMonths: number
): IndicatorAgeRange | null {
  const entry = GROWTH_REFERENCE_MANIFEST[profileId];
  if (!entry) {
    return null;
  }
  return (
    entry.ageRanges.find(
      (r) =>
        r.indicator === indicator &&
        ageMonths >= r.minAgeMonths &&
        ageMonths < r.maxAgeMonthsExclusive
    ) || null
  );
}

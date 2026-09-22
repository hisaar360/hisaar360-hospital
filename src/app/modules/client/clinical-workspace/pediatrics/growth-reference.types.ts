export type GrowthSex = 'male' | 'female';

export type GrowthMeasurementType =
  | 'weight_kg'
  | 'length_cm'
  | 'height_cm'
  | 'bmi'
  | 'head_circumference_cm';

export type GrowthIndicator =
  | 'weight_for_age'
  | 'length_height_for_age'
  | 'bmi_for_age'
  | 'head_circumference_for_age'
  | 'weight_for_length_height';

export type GrowthReferenceProfileId = 'WHO_CGS_2006' | 'WHO_GR_2007';

export type LengthOrHeightMode = 'recumbent_length' | 'standing_height' | 'not_specified' | '';

export interface LmsPoint {
  ageMonths: number;
  L: number;
  M: number;
  S: number;
}

export interface GrowthReferenceResult {
  eligible: boolean;
  indicator: GrowthIndicator | null;
  zScore: number | null;
  percentile: number | null;
  referenceName: string;
  referenceVersion: string;
  referenceProfile: GrowthReferenceProfileId | null;
  profileId: GrowthReferenceProfileId | null;
  reasonUnavailable: string | null;
  ageMonths: number | null;
  /** Audit / debug metadata — derived only */
  measurementDate: string | null;
  sex: GrowthSex | null;
  measurementType: GrowthMeasurementType | null;
  rawMeasurement: number | null;
  lengthOrHeightMode: LengthOrHeightMode | null;
  datasetKind: 'production' | 'test_fixtures' | null;
  datasetCompleteness: string | null;
}

export type GrowthDatasetKind = 'production' | 'test_fixtures';

export type LmsTableKey =
  | 'wfa_male'
  | 'wfa_female'
  | 'lhfa_male'
  | 'lhfa_female'
  | 'bmi_male'
  | 'bmi_female'
  | 'hc_male'
  | 'hc_female';

export type GrowthLmsTables = Partial<Record<LmsTableKey, LmsPoint[]>>;

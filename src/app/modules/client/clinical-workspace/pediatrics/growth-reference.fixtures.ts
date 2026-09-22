/**
 * TEST_FIXTURES ONLY — sparse LMS points for unit tests.
 * Must NEVER be used as production runtime tables.
 * Completeness: partial_sparse_test_fixture
 */
import { GrowthLmsTables, LmsPoint } from './growth-reference.types';

const WFA_BOYS: LmsPoint[] = [
  { ageMonths: 0, L: 0.3487, M: 3.3464, S: 0.14602 },
  { ageMonths: 6, L: 0.1296, M: 7.934, S: 0.10958 },
  { ageMonths: 12, L: -0.0102, M: 9.6479, S: 0.10923 },
  { ageMonths: 24, L: -0.1644, M: 12.1515, S: 0.11296 },
  { ageMonths: 36, L: -0.1812, M: 14.3429, S: 0.11768 },
  { ageMonths: 48, L: -0.2014, M: 16.3489, S: 0.12182 },
  { ageMonths: 60, L: -0.2155, M: 18.3366, S: 0.12525 },
];

const WFA_GIRLS: LmsPoint[] = [
  { ageMonths: 0, L: 0.3809, M: 3.2322, S: 0.14171 },
  { ageMonths: 6, L: -0.0976, M: 7.297, S: 0.12044 },
  { ageMonths: 12, L: -0.1961, M: 8.948, S: 0.12048 },
  { ageMonths: 24, L: -0.217, M: 11.547, S: 0.12729 },
  { ageMonths: 36, L: -0.2102, M: 13.85, S: 0.13324 },
  { ageMonths: 48, L: -0.2176, M: 15.998, S: 0.13798 },
  { ageMonths: 60, L: -0.2228, M: 18.217, S: 0.14179 },
];

const HFA_BOYS: LmsPoint[] = [
  { ageMonths: 0, L: 1, M: 49.8842, S: 0.03795 },
  { ageMonths: 6, L: 1, M: 67.6236, S: 0.03165 },
  { ageMonths: 12, L: 1, M: 75.7488, S: 0.03165 },
  { ageMonths: 24, L: 1, M: 87.1161, S: 0.03274 },
  { ageMonths: 36, L: 1, M: 96.0534, S: 0.03347 },
  { ageMonths: 48, L: 1, M: 103.334, S: 0.03407 },
  { ageMonths: 60, L: 1, M: 110.0, S: 0.0345 },
  { ageMonths: 96, L: 1, M: 127.0, S: 0.04 },
  { ageMonths: 144, L: 1, M: 149.0, S: 0.042 },
];

const HFA_GIRLS: LmsPoint[] = [
  { ageMonths: 0, L: 1, M: 49.1477, S: 0.0379 },
  { ageMonths: 6, L: 1, M: 65.7311, S: 0.03305 },
  { ageMonths: 12, L: 1, M: 74.015, S: 0.03348 },
  { ageMonths: 24, L: 1, M: 85.7188, S: 0.03557 },
  { ageMonths: 36, L: 1, M: 95.0726, S: 0.0364 },
  { ageMonths: 48, L: 1, M: 102.731, S: 0.037 },
  { ageMonths: 60, L: 1, M: 109.4, S: 0.0374 },
  { ageMonths: 96, L: 1, M: 126.0, S: 0.041 },
  { ageMonths: 144, L: 1, M: 152.0, S: 0.043 },
];

const BMI_BOYS: LmsPoint[] = [
  { ageMonths: 0, L: -0.0631, M: 13.4, S: 0.09 },
  { ageMonths: 24, L: -0.3042, M: 16.0, S: 0.081 },
  { ageMonths: 36, L: -0.381, M: 15.6, S: 0.082 },
  { ageMonths: 48, L: -0.42, M: 15.3, S: 0.084 },
  { ageMonths: 60, L: -0.45, M: 15.2, S: 0.086 },
  { ageMonths: 96, L: -0.8, M: 15.5, S: 0.1 },
  { ageMonths: 144, L: -1.0, M: 17.5, S: 0.12 },
];

const BMI_GIRLS: LmsPoint[] = [
  { ageMonths: 0, L: -0.05, M: 13.2, S: 0.092 },
  { ageMonths: 24, L: -0.25, M: 15.7, S: 0.084 },
  { ageMonths: 36, L: -0.35, M: 15.4, S: 0.086 },
  { ageMonths: 48, L: -0.4, M: 15.2, S: 0.088 },
  { ageMonths: 60, L: -0.42, M: 15.1, S: 0.09 },
  { ageMonths: 96, L: -0.7, M: 15.4, S: 0.105 },
  { ageMonths: 144, L: -0.9, M: 17.8, S: 0.125 },
];

const HC_BOYS: LmsPoint[] = [
  { ageMonths: 0, L: 1, M: 34.46, S: 0.03686 },
  { ageMonths: 6, L: 1, M: 43.33, S: 0.0296 },
  { ageMonths: 12, L: 1, M: 46.1, S: 0.0285 },
  { ageMonths: 24, L: 1, M: 48.4, S: 0.028 },
  { ageMonths: 36, L: 1, M: 49.5, S: 0.0275 },
  { ageMonths: 48, L: 1, M: 50.2, S: 0.027 },
  { ageMonths: 60, L: 1, M: 50.8, S: 0.0268 },
];

const HC_GIRLS: LmsPoint[] = [
  { ageMonths: 0, L: 1, M: 33.88, S: 0.03496 },
  { ageMonths: 6, L: 1, M: 42.04, S: 0.0299 },
  { ageMonths: 12, L: 1, M: 44.9, S: 0.029 },
  { ageMonths: 24, L: 1, M: 47.2, S: 0.0285 },
  { ageMonths: 36, L: 1, M: 48.3, S: 0.028 },
  { ageMonths: 48, L: 1, M: 49.0, S: 0.0275 },
  { ageMonths: 60, L: 1, M: 49.6, S: 0.0272 },
];

export const GROWTH_TEST_FIXTURES: GrowthLmsTables = {
  wfa_male: WFA_BOYS,
  wfa_female: WFA_GIRLS,
  lhfa_male: HFA_BOYS,
  lhfa_female: HFA_GIRLS,
  bmi_male: BMI_BOYS,
  bmi_female: BMI_GIRLS,
  hc_male: HC_BOYS,
  hc_female: HC_GIRLS,
};

export const TEST_FIXTURE_DATASET_KIND = 'test_fixtures' as const;

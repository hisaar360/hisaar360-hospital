import { ageAtVisitLabel, agePartsAtDate, correctedAgeParts } from './pediatric-age.util';
import {
  assertFixturesAreNotProduction,
  evaluateGrowthReference,
  GROWTH_REFERENCE_MANIFEST,
  isProductionDatasetComplete,
  lmsZScore,
  lookupLmsPoint,
  zToPercentile,
} from './growth-reference.service';
import { GROWTH_TEST_FIXTURES } from './growth-reference.fixtures';
import { GROWTH_PRODUCTION_DATA } from './growth-reference.production-data';

describe('pediatric age util', () => {
  it('formats days / weeks / months / years+months', () => {
    expect(ageAtVisitLabel('2026-09-07', '2026-09-19')).toBe('12 days');
    expect(ageAtVisitLabel('2026-08-01', '2026-09-19')).toMatch(/weeks/);
    expect(ageAtVisitLabel('2025-09-19', '2026-09-19')).toMatch(/1y/);
    expect(ageAtVisitLabel('2023-05-19', '2026-09-19')).toMatch(/3y/);
  });

  it('historical visit age differs from later age', () => {
    const early = ageAtVisitLabel('2024-01-15', '2024-06-15');
    const late = ageAtVisitLabel('2024-01-15', '2026-09-19');
    expect(early).not.toBe(late);
  });

  it('corrected age does not overwrite chronological when not confirmed', () => {
    const result = correctedAgeParts({
      dateOfBirth: '2026-01-01',
      referenceDate: '2026-09-01',
      gestationalAgeWeeksAtBirth: 32,
      applyCorrectedAge: false,
    });
    expect(result.chronological).toBeTruthy();
    expect(result.corrected).toBeNull();
  });

  it('age group helper uses centralized bands', () => {
    expect(agePartsAtDate('2026-09-10', '2026-09-19')?.ageGroup).toBe('NEWBORN');
    expect(agePartsAtDate('2026-03-19', '2026-09-19')?.ageGroup).toBe('INFANT');
    expect(agePartsAtDate('2024-09-19', '2026-09-19')?.ageGroup).toBe('TODDLER');
  });
});

describe('H.1 growth reference hardening', () => {
  it('computes LMS z and percentile', () => {
    const z = lmsZScore(7.934, 0.1296, 7.934, 0.10958);
    expect(Math.abs(z)).toBeLessThan(0.05);
    expect(zToPercentile(0)).toBe(50);
  });

  it('exact supported production point eligible with audit metadata', () => {
    const result = evaluateGrowthReference({
      sex: 'male',
      dateOfBirth: '2026-03-19',
      measurementDate: '2026-09-19',
      measurementType: 'weight_kg',
      value: 7.9,
      datasetKind: 'production',
    });
    expect(result.eligible).toBe(true);
    expect(result.referenceProfile).toBe('WHO_CGS_2006');
    expect(result.referenceVersion).toBe('2006');
    expect(result.rawMeasurement).toBe(7.9);
    expect(result.sex).toBe('male');
    expect(result.datasetKind).toBe('production');
    expect(result.zScore).not.toBeNull();
  });

  it('interpolates only across adjacent production months (Δ=1)', () => {
    const table = GROWTH_PRODUCTION_DATA.wfa_male || [];
    const mid = lookupLmsPoint(table, 7);
    expect(mid).toBeTruthy();
    expect(mid!.ageMonths).toBe(7);
  });

  it('sparse test fixture does not interpolate across gaps', () => {
    const table = GROWTH_TEST_FIXTURES.wfa_male || [];
    expect(lookupLmsPoint(table, 0)).toBeTruthy();
    expect(lookupLmsPoint(table, 3)).toBeNull(); // gap 0→6
    const result = evaluateGrowthReference({
      sex: 'male',
      dateOfBirth: '2026-06-19',
      measurementDate: '2026-09-19',
      measurementType: 'weight_kg',
      value: 6.5,
      datasetKind: 'test_fixtures',
    });
    // age ~3 months — no fixture point
    expect(result.eligible).toBe(false);
    expect(result.reasonUnavailable).toMatch(/Reference data not available/i);
  });

  it('unsupported age returns unavailable', () => {
    const result = evaluateGrowthReference({
      sex: 'male',
      dateOfBirth: '1990-01-01',
      measurementDate: '2026-09-19',
      measurementType: 'weight_kg',
      value: 70,
    });
    expect(result.eligible).toBe(false);
  });

  it('missing sex returns unavailable without inventing percentile', () => {
    const result = evaluateGrowthReference({
      sex: null,
      dateOfBirth: '2024-01-01',
      measurementDate: '2026-09-19',
      measurementType: 'weight_kg',
      value: 12,
    });
    expect(result.eligible).toBe(false);
    expect(result.percentile).toBeNull();
  });

  it('length/height mode required — does not guess', () => {
    const missing = evaluateGrowthReference({
      sex: 'male',
      dateOfBirth: '2024-09-19',
      measurementDate: '2026-09-19',
      measurementType: 'height_cm',
      value: 86,
    });
    expect(missing.eligible).toBe(false);
    expect(missing.reasonUnavailable).toMatch(/length\/height mode/i);

    const wrong = evaluateGrowthReference({
      sex: 'male',
      dateOfBirth: '2026-03-19',
      measurementDate: '2026-09-19',
      measurementType: 'height_cm',
      value: 68,
      lengthOrHeightMode: 'standing_height',
    });
    // 6 months requires recumbent_length
    expect(wrong.eligible).toBe(false);

    const ok = evaluateGrowthReference({
      sex: 'male',
      dateOfBirth: '2026-03-19',
      measurementDate: '2026-09-19',
      measurementType: 'length_cm',
      value: 68,
      lengthOrHeightMode: 'recumbent_length',
    });
    expect(ok.eligible).toBe(true);
  });

  it('head circumference outside supported range unavailable but raw still displayable', () => {
    const older = evaluateGrowthReference({
      sex: 'male',
      dateOfBirth: '2018-01-01',
      measurementDate: '2026-09-19',
      measurementType: 'head_circumference_cm',
      value: 52,
    });
    expect(older.eligible).toBe(false);
    expect(older.rawMeasurement).toBe(52);
  });

  it('WHO 5–19 weight-for-age unavailable after 10y', () => {
    const result = evaluateGrowthReference({
      sex: 'female',
      dateOfBirth: '2012-09-19',
      measurementDate: '2026-09-19',
      measurementType: 'weight_kg',
      value: 50,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasonUnavailable).toMatch(/age outside indicator range|not supported/i);
  });

  it('WHO 5–19 height eligible with standing_height mode', () => {
    const result = evaluateGrowthReference({
      sex: 'female',
      dateOfBirth: '2018-09-19',
      measurementDate: '2026-09-19',
      measurementType: 'height_cm',
      value: 125,
      lengthOrHeightMode: 'standing_height',
    });
    expect(result.eligible).toBe(true);
    expect(result.profileId).toBe('WHO_GR_2007');
  });

  it('manifest versions and production completeness', () => {
    expect(GROWTH_REFERENCE_MANIFEST.WHO_CGS_2006.version).toBe('2006');
    expect(GROWTH_REFERENCE_MANIFEST.WHO_GR_2007.version).toBe('2007');
    expect(isProductionDatasetComplete()).toBe(true);
    expect(assertFixturesAreNotProduction()).toBe(true);
  });

  it('BMI uses pediatric reference not adult thresholds', () => {
    const result = evaluateGrowthReference({
      sex: 'male',
      dateOfBirth: '2022-09-19',
      measurementDate: '2026-09-19',
      measurementType: 'bmi',
      value: 15.5,
    });
    expect(result.eligible).toBe(true);
    expect(result.indicator).toBe('bmi_for_age');
  });
});

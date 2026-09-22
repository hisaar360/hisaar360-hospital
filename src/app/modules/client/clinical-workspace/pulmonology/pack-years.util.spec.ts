import {
  calculatePackYears,
  hasCompleteCigarettePackYearInputs,
} from './pack-years.util';

describe('pack-years util', () => {
  it('calculates from packsPerDay × yearsSmoked', () => {
    const result = calculatePackYears({ packsPerDay: 1, yearsSmoked: 20 });
    expect(result.complete).toBe(true);
    expect(result.packYears).toBe(20);
  });

  it('calculates from cigarettesPerDay / 20 × years', () => {
    const result = calculatePackYears({ cigarettesPerDay: 40, yearsSmoked: 10 });
    expect(result.complete).toBe(true);
    expect(result.packYears).toBe(20);
    expect(result.packsPerDayUsed).toBe(2);
  });

  it('prefers packsPerDay when both cigarette inputs present', () => {
    const result = calculatePackYears({
      cigarettesPerDay: 40,
      packsPerDay: 1.5,
      yearsSmoked: 10,
    });
    expect(result.packYears).toBe(15);
  });

  it('requires complete cigarette inputs', () => {
    expect(calculatePackYears({ cigarettesPerDay: 20 }).complete).toBe(false);
    expect(calculatePackYears({ yearsSmoked: 10 }).complete).toBe(false);
    expect(calculatePackYears({}).complete).toBe(false);
    expect(hasCompleteCigarettePackYearInputs({ packsPerDay: 1, yearsSmoked: 5 })).toBe(true);
  });

  it('never produces pack-years for vaping', () => {
    const result = calculatePackYears({
      productType: 'vaping',
      cigarettesPerDay: 20,
      yearsSmoked: 10,
    });
    expect(result.packYears).toBeNull();
    expect(result.complete).toBe(false);
  });

  it('never produces pack-years for shisha', () => {
    const result = calculatePackYears({
      productType: 'shisha',
      packsPerDay: 2,
      yearsSmoked: 15,
    });
    expect(result.packYears).toBeNull();
    expect(result.complete).toBe(false);
  });
});

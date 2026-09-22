import { calculateFev1FvcRatio, unitsCompatible } from './spirometry-ratio.util';

describe('spirometry-ratio util', () => {
  it('computes transparent FEV1/FVC when both present', () => {
    const result = calculateFev1FvcRatio({ fev1: 2.4, fvc: 3.2 });
    expect(result.compatible).toBe(true);
    expect(result.ratio).toBe(0.75);
  });

  it('accepts matching litre units', () => {
    expect(unitsCompatible('L', 'L')).toBe(true);
    expect(unitsCompatible('liter', 'litre')).toBe(true);
    const result = calculateFev1FvcRatio({
      fev1: 1.5,
      fvc: 3,
      fev1Unit: 'L',
      fvcUnit: 'litre',
    });
    expect(result.ratio).toBe(0.5);
  });

  it('rejects incompatible units without diagnosing', () => {
    const result = calculateFev1FvcRatio({
      fev1: 2400,
      fvc: 3.2,
      fev1Unit: 'mL',
      fvcUnit: 'L',
    });
    expect(result.compatible).toBe(false);
    expect(result.ratio).toBeNull();
  });

  it('returns null when either value missing', () => {
    expect(calculateFev1FvcRatio({ fev1: 2.4 }).ratio).toBeNull();
    expect(calculateFev1FvcRatio({ fvc: 3.2 }).ratio).toBeNull();
  });
});

import {
  calculateEddFromLmp,
  gestationalAgeFromAnchor,
  resolveDatingAnchor,
  visitGestationalAgeLabel,
} from './pregnancy-dating.util';

describe('pregnancy-dating.util', () => {
  it('calculates EDD from LMP (+280d)', () => {
    expect(calculateEddFromLmp('2026-04-12')).toBe('2027-01-17');
  });

  it('returns empty EDD when LMP missing', () => {
    expect(calculateEddFromLmp('')).toBe('');
    expect(calculateEddFromLmp(null)).toBe('');
  });

  it('prefers confirmed EDD as dating anchor', () => {
    expect(
      resolveDatingAnchor({
        lmp: '2026-04-12',
        confirmedEdd: '2027-01-15',
      }).source
    ).toBe('confirmed_edd');
  });

  it('skips LMP anchor when certainty unknown', () => {
    expect(
      resolveDatingAnchor({
        lmp: '2026-04-12',
        lmpCertainty: 'unknown',
      }).source
    ).toBe('none');
  });

  it('keeps historic visit GA fixed to visit date', () => {
    const dating = { lmp: '2026-04-12', lmpCertainty: 'certain' };
    const early = visitGestationalAgeLabel(dating, '2026-06-01');
    const later = visitGestationalAgeLabel(dating, '2026-09-01');
    expect(early).not.toBe(later);
    expect(early).toMatch(/\dw \dd/);
  });

  it('computes gestational age label', () => {
    const ga = gestationalAgeFromAnchor('2026-04-12', '2026-09-18');
    expect(ga?.label).toMatch(/\dw \dd/);
  });
});

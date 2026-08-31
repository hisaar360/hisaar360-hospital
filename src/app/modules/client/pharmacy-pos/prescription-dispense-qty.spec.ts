import {
  durationToDays,
  prescriptionDispenseQty,
} from './prescription-dispense-qty';

describe('prescription-dispense-qty', () => {
  it('converts duration labels to days', () => {
    expect(durationToDays('1 Day')).toBe(1);
    expect(durationToDays('7 Days')).toBe(7);
    expect(durationToDays('2 Weeks')).toBe(14);
    expect(durationToDays('1 Month')).toBe(30);
    expect(durationToDays('Continue')).toBe(30);
    expect(durationToDays('10d')).toBe(10);
  });

  it('multiplies morning + night doses by one month', () => {
    const result = prescriptionDispenseQty({
      name: 'Axymrax',
      duration: '1 Month',
      morning: true,
      morningDose: '1',
      night: true,
      nightDose: '1',
    });

    expect(result.dailyUnits).toBe(2);
    expect(result.days).toBe(30);
    expect(result.quantity).toBe(60);
  });

  it('uses frequency when dose slots are empty', () => {
    const result = prescriptionDispenseQty({
      name: 'Paracetamol',
      frequency: 'twice daily',
      duration: '7 Days',
    });

    expect(result.dailyUnits).toBe(2);
    expect(result.quantity).toBe(14);
  });
});

import { calculateCoverage, expandBulkDates, rankEligibleStaff, staffAlreadyAssigned } from './duty-roster.util';

describe('duty-roster.util', () => {
  it('calculates required assigned and open counts', () => {
    const rows = calculateCoverage(
      [
        { staffRole: 'Nurse', shift: 'morning', status: 'scheduled' },
        { staffRole: 'Nurse', shift: 'morning', status: 'scheduled' },
        { staffRole: 'Doctor', shift: 'morning', status: 'scheduled' },
      ],
      [
        { role: 'Nurse', requiredCount: 5, shift: 'morning' },
        { role: 'Doctor', requiredCount: 2, shift: 'morning' },
      ],
      'morning'
    );
    expect(rows.find((row) => row.role === 'Nurse')).toEqual({
      role: 'Nurse',
      required: 5,
      assigned: 2,
      open: 3,
    });
    expect(rows.find((row) => row.role === 'Doctor')?.open).toBe(1);
  });

  it('detects a staff member already assigned to the same slot', () => {
    expect(
      staffAlreadyAssigned(
        [{ staffUserId: 'u1', rosterDate: '2026-09-03', startTime: '07:00', endTime: '15:00', status: 'scheduled' }],
        'u1',
        '2026-09-03',
        '07:00',
        '15:00'
      )
    ).toBeTrue();
  });

  it('expands selected weekdays from a Monday start', () => {
    expect(expandBulkDates({ weekFrom: '2026-08-31', days: [0, 1, 2, 3, 4] })).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
    ]);
  });

  it('ranks available matching staff first', () => {
    const ranked = rankEligibleStaff(
      [
        { _id: 'n2', name: 'Busy Nurse', role: 'Nurse' },
        { _id: 'n1', name: 'Maria', role: 'Nurse' },
        { _id: 'd1', name: 'Dr Aoun', role: 'Doctor' },
      ],
      [{ staffUserId: 'n2', rosterDate: '2026-09-04', startTime: '07:00', endTime: '15:00', status: 'scheduled' }],
      { role: 'Nurse', date: '2026-09-04', startTime: '07:00', endTime: '15:00' }
    );
    expect(ranked[0]['_id']).toBe('n1');
    expect(ranked[0].availability).toBe('Available');
    expect(ranked.find((row) => row['_id'] === 'n2')?.availability).toBe('Already Assigned');
  });
});

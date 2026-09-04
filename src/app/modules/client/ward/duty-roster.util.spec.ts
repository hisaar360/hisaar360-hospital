import {
  buildStaffAssignmentIndex,
  buildRosterWeekMatrix,
  calculateCoverage,
  coverageTotals,
  expandBulkDates,
  filterRankedStaff,
  rankEligibleStaff,
  shouldReloadRosterBootstrap,
  shouldRunBulkPreview,
  staffAlreadyAssigned,
  staffIdOf,
} from './duty-roster.util';

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

  it('detects a staff member already assigned to an overlapping slot', () => {
    expect(
      staffAlreadyAssigned(
        [{ staffUserId: 'u1', rosterDate: '2026-09-03', startTime: '07:00', endTime: '15:00', status: 'scheduled' }],
        'u1',
        '2026-09-03',
        '10:00',
        '18:00'
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

  it('ranks available matching staff first using an assignment index', () => {
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

  it('indexes assignments once per staff id instead of nested scans', () => {
    const index = buildStaffAssignmentIndex([
      { staffUserId: { _id: 'n1' }, rosterDate: '2026-09-04', startTime: '07:00', endTime: '15:00' },
      { staffUserId: 'n1', rosterDate: '2026-09-05', startTime: '23:00', endTime: '07:00' },
      { staffUserId: 'n2', rosterDate: '2026-09-04', startTime: '07:00', endTime: '15:00', status: 'cancelled' },
    ]);
    expect(index.get('n1')?.length).toBe(2);
    expect(index.has('n2')).toBeFalse();
    expect(staffIdOf({ _id: 'abc' })).toBe('abc');
  });

  it('does not call bulk preview on checkbox toggles', () => {
    expect(shouldRunBulkPreview('staff-toggle')).toBeFalse();
    expect(shouldRunBulkPreview('open')).toBeFalse();
    expect(shouldRunBulkPreview('review')).toBeTrue();
  });

  it('filters incompatible staff out of the first-choice list', () => {
    const ranked = rankEligibleStaff(
      [
        { _id: 'n1', name: 'Maria', role: 'Nurse' },
        { _id: 'd1', name: 'Dr Aoun', role: 'Doctor' },
        { _id: 'n2', name: 'Inactive', role: 'Nurse', status: 'inactive' },
      ],
      [],
      { role: 'Nurse', date: '2026-09-04', startTime: '07:00', endTime: '15:00' }
    );
    const visible = filterRankedStaff(ranked, { hideIncompatible: true, search: 'mar' });
    expect(visible.map((row) => row['_id'])).toEqual(['n1']);
  });

  it('does not refetch bootstrap on tree, shift, staff toggle, or assign open', () => {
    expect(shouldReloadRosterBootstrap('tree')).toBeFalse();
    expect(shouldReloadRosterBootstrap('shift')).toBeFalse();
    expect(shouldReloadRosterBootstrap('staff-toggle')).toBeFalse();
    expect(shouldReloadRosterBootstrap('open-assign')).toBeFalse();
    expect(shouldReloadRosterBootstrap('date')).toBeTrue();
  });

  it('summarizes coverage without fabricating required counts', () => {
    expect(coverageTotals([])).toEqual({ required: 0, assigned: 0, open: 0, overstaffed: 0, percent: 0 });
    expect(coverageTotals([{ role: 'Nurse', required: 2, assigned: 1, open: 1 }]).percent).toBe(50);
  });

  it('builds a week matrix grouped by ward with M/A/N counts', () => {
    const matrix = buildRosterWeekMatrix({
      from: '2026-08-31',
      to: '2026-09-01',
      groupBy: 'ward',
      wards: [{ _id: 'w1', name: 'Medical Ward' }],
      coverage: [{ areaId: 'w1', areaType: 'WARD', dayOfWeek: 1, role: 'Nurse', requiredCount: 2 }],
      assignments: [
        {
          wardId: 'w1',
          wardLabel: 'Medical Ward',
          areaType: 'WARD',
          staffUserId: 'n1',
          staffRole: 'Nurse',
          rosterDate: '2026-08-31',
          shift: 'morning',
          status: 'scheduled',
        },
        {
          wardId: 'w1',
          staffUserId: 'n2',
          staffRole: 'Nurse',
          rosterDate: '2026-08-31',
          shift: 'night',
          status: 'scheduled',
        },
      ],
    });
    expect(matrix.groupBy).toBe('ward');
    expect(matrix.rows[0].label).toBe('Medical Ward');
    expect(matrix.rows[0].days['2026-08-31'].morning).toBe(1);
    expect(matrix.rows[0].days['2026-08-31'].night).toBe(1);
    expect(matrix.rows[0].days['2026-08-31'].assigned).toBe(2);
    expect(matrix.rows[0].days['2026-08-31'].short).toBeFalse();
  });
});

import {
  buildWardBedCards,
  buildWardHomeSummaryTiles,
  filterWardBedCards,
  formatLengthOfStay,
  groupWardBedCards,
  mapBedStatusToSummaryKey,
  normalizeWardAttendantTask,
  normalizeWardHomeSummary,
  normalizeWardMyWork,
  uniquePatientsFromWork,
  UNASSIGNED_WARD_LABEL,
  WardWorkItem,
  workItemChartTab,
} from './ward-home.util';

const NOW = new Date('2026-09-19T10:00:00.000Z');

const workItem = (overrides: Partial<WardWorkItem>): WardWorkItem => ({
  id: 'w1',
  activityType: 'nursing_task',
  title: 'Task',
  description: '',
  priority: 'normal',
  status: 'pending',
  scheduledAt: '',
  patientName: '',
  bedLabel: '',
  admissionId: '',
  ...overrides,
});

describe('ward-home.util bed status mapping', () => {
  it('maps backend bed statuses onto summary buckets', () => {
    expect(mapBedStatusToSummaryKey('available')).toBe('available');
    expect(mapBedStatusToSummaryKey('occupied')).toBe('occupied');
    expect(mapBedStatusToSummaryKey('on_hold')).toBe('reserved');
    expect(mapBedStatusToSummaryKey('cleaning')).toBe('cleaning');
    expect(mapBedStatusToSummaryKey('maintenance')).toBe('unavailable');
    expect(mapBedStatusToSummaryKey('blocked')).toBe('unavailable');
    expect(mapBedStatusToSummaryKey('mystery')).toBeNull();
  });

  it('normalizes a partial summary payload without throwing', () => {
    const summary = normalizeWardHomeSummary({ beds: { occupied: '4' }, work: { overdue: 2 } });
    expect(summary.beds.occupied).toBe(4);
    expect(summary.beds.available).toBe(0);
    expect(summary.work.overdue).toBe(2);
    expect(summary.admissions.pendingRecommendations).toBe(0);
  });

  it('builds the six summary tiles and merges cleaning with unavailable', () => {
    const tiles = buildWardHomeSummaryTiles(
      normalizeWardHomeSummary({
        beds: { total: 20, occupied: 10, available: 6, reserved: 1, cleaning: 2, unavailable: 1 },
        admissions: { pendingRecommendations: 3, activeAdmissions: 10, dischargeReady: 2 },
        work: { overdue: 1, dueNow: 2, upcoming: 5 },
      })
    );

    expect(tiles.map((tile) => tile.key)).toEqual([
      'occupied',
      'available',
      'reserved',
      'unavailable',
      'pendingAdmissions',
      'dischargeReady',
    ]);
    expect(tiles[3].value).toBe(3);
    expect(tiles[4].value).toBe(3);
    expect(tiles[5].value).toBe(2);
  });
});

describe('ward-home.util bed cards', () => {
  const bedInput = {
    beds: [
      {
        id: 'bed-1',
        roomId: 'room-1',
        bedLabel: 'A-1',
        status: 'occupied',
        admissionId: 'adm-1',
        patientName: 'Ayesha Khan',
        age: 34,
        sex: 'f',
        occupiedSince: '2026-09-17T09:00:00.000Z',
      },
      { id: 'bed-2', roomId: 'room-1', bedLabel: 'A-2', status: 'available' },
      { id: 'bed-3', roomId: 'room-2', bedLabel: 'B-1', status: 'cleaning' },
      { id: 'bed-4', roomId: 'room-9', bedLabel: 'Z-9', status: 'maintenance' },
    ],
    roomWardNames: { 'room-1': 'Medical Ward', 'room-2': 'Surgical Ward' },
    admissions: [
      {
        admissionId: 'adm-1',
        patientName: 'Ayesha Khan',
        mrn: 'MR-1001',
        consultant: 'Dr Imran',
        wardName: 'Medical Ward',
        admittedAt: '2026-09-17T09:00:00.000Z',
      },
      {
        admissionId: 'adm-legacy',
        patientName: 'Legacy Patient',
        mrn: 'MR-2002',
        consultant: 'Dr Sara',
        wardName: 'Surgical Ward',
        bedLabel: 'B-7',
        admittedAt: '2026-09-19T08:00:00.000Z',
      },
    ],
    workItems: [
      workItem({ id: 'w1', admissionId: 'adm-1', title: 'Dose: Augmentin', scheduledAt: '2026-09-19T09:00:00.000Z' }),
      workItem({ id: 'w2', admissionId: 'adm-1', title: 'Record Vitals', scheduledAt: '2026-09-19T14:00:00.000Z' }),
    ],
    now: NOW,
  };

  it('enriches occupied beds and flags overdue work as the alert badge', () => {
    const cards = buildWardBedCards(bedInput);
    const occupied = cards.find((card) => card.id === 'bed-1');

    expect(occupied?.mrn).toBe('MR-1001');
    expect(occupied?.consultant).toBe('Dr Imran');
    expect(occupied?.ageSexLabel).toBe('34y · F');
    expect(occupied?.lengthOfStayLabel).toBe('Day 3');
    expect(occupied?.alertLabel).toBe('1 overdue task');
    expect(occupied?.nextDueBucket).toBe('overdue');
    expect(occupied?.nextDueLabel).toBe('Overdue: Dose: Augmentin');
    expect(occupied?.needsAttention).toBe(true);
  });

  it('labels housekeeping states with text, not colour alone', () => {
    const cards = buildWardBedCards(bedInput);
    const cleaning = cards.find((card) => card.id === 'bed-3');
    const unavailable = cards.find((card) => card.id === 'bed-4');
    const available = cards.find((card) => card.id === 'bed-2');

    expect(cleaning?.statusLabel).toBe('Cleaning');
    expect(cleaning?.statusIcon).toBe('fa-refresh');
    expect(cleaning?.alertLabel).toBe('Needs cleaning');
    expect(unavailable?.statusLabel).toBe('Unavailable');
    expect(unavailable?.alertLabel).toBe('Out of service');
    expect(unavailable?.wardName).toBe(UNASSIGNED_WARD_LABEL);
    expect(available?.needsAttention).toBe(false);
    expect(available?.alertLabel).toBe('');
  });

  it('keeps admissions that have no ward bed row on the board', () => {
    const cards = buildWardBedCards(bedInput);
    const legacy = cards.find((card) => card.admissionId === 'adm-legacy');

    expect(legacy).toBeTruthy();
    expect(legacy?.statusKey).toBe('occupied');
    expect(legacy?.bedLabel).toBe('B-7');
    expect(legacy?.wardName).toBe('Surgical Ward');
  });

  it('groups by ward and sorts beds naturally', () => {
    const groups = groupWardBedCards(buildWardBedCards(bedInput));

    expect(groups.map((group) => group.wardName)).toEqual([
      'Medical Ward',
      'Surgical Ward',
      UNASSIGNED_WARD_LABEL,
    ]);
    expect(groups[0].cards.map((card) => card.bedLabel)).toEqual(['A-1', 'A-2']);
  });

  it('applies the chip filters', () => {
    const cards = buildWardBedCards(bedInput);

    expect(filterWardBedCards(cards, 'all').length).toBe(cards.length);
    expect(filterWardBedCards(cards, 'occupied').map((card) => card.bedLabel)).toEqual(['A-1', 'B-7']);
    expect(filterWardBedCards(cards, 'available').map((card) => card.bedLabel)).toEqual(['A-2']);
    expect(filterWardBedCards(cards, 'attention').map((card) => card.bedLabel)).toEqual(['A-1', 'B-1', 'Z-9']);
    expect(filterWardBedCards(cards, 'my-ward', 'Medical Ward').map((card) => card.bedLabel)).toEqual(['A-1', 'A-2']);
    expect(filterWardBedCards(cards, 'my-ward', '').length).toBe(cards.length);
  });

  it('formats length of stay in whole ward days', () => {
    expect(formatLengthOfStay('2026-09-19T09:30:00.000Z', NOW)).toBe('Day 1 (<1h)');
    expect(formatLengthOfStay('2026-09-19T04:00:00.000Z', NOW)).toBe('Day 1 (6h)');
    expect(formatLengthOfStay('2026-09-18T09:00:00.000Z', NOW)).toBe('Day 2');
    expect(formatLengthOfStay('', NOW)).toBe('');
    expect(formatLengthOfStay('not-a-date', NOW)).toBe('');
  });
});

describe('ward-home.util work list', () => {
  it('normalizes the my-work payload with zeroed counts as fallback', () => {
    const work = normalizeWardMyWork({
      overdue: [{ id: 'a', title: 'Dose', activityType: 'mar_dose' }],
      dueNow: null,
      counts: { medicationsDue: 2 },
    });

    expect(work.overdue.length).toBe(1);
    expect(work.overdue[0].priority).toBe('normal');
    expect(work.dueNow).toEqual([]);
    expect(work.upcoming).toEqual([]);
    expect(work.counts.medicationsDue).toBe(2);
    expect(work.counts.handoverItems).toBe(0);
  });

  it('routes each work item to the matching chart tab', () => {
    expect(workItemChartTab(workItem({ activityType: 'mar_dose' }))).toBe('medicines');
    expect(workItemChartTab(workItem({ activityType: 'io_entry' }))).toBe('vitals');
    expect(workItemChartTab(workItem({ activityType: 'handover' }))).toBe('overview');
    expect(workItemChartTab(workItem({ title: 'Lab Order: CBC' }))).toBe('lab');
    expect(workItemChartTab(workItem({ title: 'Imaging: Chest X-Ray' }))).toBe('orders');
    expect(workItemChartTab(workItem({ title: 'Record Vitals' }))).toBe('vitals');
    expect(workItemChartTab(workItem({ title: 'Drip start: NS' }))).toBe('drips');
    expect(workItemChartTab(workItem({ title: 'Service Order: Dressing' }))).toBe('procedures');
    expect(workItemChartTab(workItem({ title: 'Something else' }))).toBe('orders');
  });

  it('builds compact My Patients cards from due work without a second query', () => {
    const work = normalizeWardMyWork({
      overdue: [
        workItem({ id: 'a', admissionId: 'adm-1', patientName: 'Ali Ahmed', bedLabel: '12' }),
        workItem({ id: 'b', admissionId: 'adm-1', patientName: 'Ali Ahmed', bedLabel: '12' }),
      ],
      dueNow: [workItem({ id: 'c', admissionId: 'adm-2', patientName: 'Sana', bedLabel: '4' })],
      upcoming: [workItem({ id: 'd', admissionId: '', patientName: 'Skip' })],
    });

    expect(uniquePatientsFromWork(work)).toEqual([
      { admissionId: 'adm-1', patientName: 'Ali Ahmed', bedLabel: '12', dueCount: 2 },
      { admissionId: 'adm-2', patientName: 'Sana', bedLabel: '4', dueCount: 1 },
    ]);
  });
});

describe('ward-home.util attendant task normalization', () => {
  it('keeps only attendant-safe fields even if the payload carries extras', () => {
    const task = normalizeWardAttendantTask({
      id: 't1',
      taskType: 'take_to_imaging',
      title: 'Take patient to X-Ray',
      instruction: 'Use wheelchair',
      status: 'pending',
      priority: 'high',
      dueAt: '2026-09-19T11:00:00.000Z',
      patientName: 'Bilal Ahmed',
      bedLabel: 'B-04',
      wardName: 'Surgical Ward',
      fromLocation: 'Ward B',
      toLocation: 'Radiology',
      requestedByName: 'Nurse Sana',
      diagnosis: 'Fracture',
      patientId: 'pat-1',
    });

    expect(Object.keys(task).sort()).toEqual([
      'bedLabel',
      'dueAt',
      'fromLocation',
      'id',
      'instruction',
      'patientName',
      'priority',
      'requestedByName',
      'status',
      'taskType',
      'taskTypeLabel',
      'title',
      'toLocation',
      'wardName',
    ]);
    expect(task.taskTypeLabel).toBe('Take to Imaging');
  });

  it('falls back to the OTHER label for unknown task types', () => {
    expect(normalizeWardAttendantTask({ taskType: 'SOMETHING' }).taskTypeLabel).toBe('Other Task');
    expect(normalizeWardAttendantTask({}).taskType).toBe('OTHER');
  });
});

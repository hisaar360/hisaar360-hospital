import { WardModuleRow } from './ward-module.models';
import {
  buildWardHandoverSnapshot,
  buildWardHistoryEntries,
  buildWardQuickActions,
  containsSensitiveClinicalDetail,
  countWardHistoryEntries,
  filterWardHistoryEntries,
  resolveWardIvSubTab,
  resolveWardWorkspaceTab,
  sanitizeWardSummaryText,
  WARD_HISTORY_FILTERS,
  WARD_MODULE_TO_WORKSPACE_TAB,
  WARD_WORKSPACE_PRIMARY_TABS,
  WARD_WORKSPACE_SECONDARY_TABS,
  wardModuleWorkspaceTab,
  wardWorkspaceRoute,
} from './ward-workspace.util';

const row = (id: string, cells: Record<string, string>): WardModuleRow => ({ id, cells });

describe('ward-workspace.util tab model', () => {
  it('keeps seven primary tabs in care order', () => {
    expect(WARD_WORKSPACE_PRIMARY_TABS.map((tab) => tab.key)).toEqual([
      'overview',
      'vitals',
      'medicines',
      'drips',
      'orders',
      'notes',
      'history',
    ]);
  });

  it('labels the consolidated medication and IV tabs', () => {
    expect(WARD_WORKSPACE_PRIMARY_TABS.find((tab) => tab.key === 'medicines')?.label).toBe('Medications');
    expect(WARD_WORKSPACE_PRIMARY_TABS.find((tab) => tab.key === 'drips')?.label).toBe('IV / I-O');
  });

  it('keeps every legacy tab reachable in the More group', () => {
    const secondary = WARD_WORKSPACE_SECONDARY_TABS.map((tab) => tab.key);
    (['admission-plan', 'procedures', 'billing', 'payments', 'lab', 'discharge'] as const).forEach((key) => {
      expect(secondary).toContain(key);
    });
  });

  it('resolves every legacy ?tab= deep link', () => {
    expect(resolveWardWorkspaceTab('overview')).toBe('overview');
    expect(resolveWardWorkspaceTab('vitals')).toBe('vitals');
    expect(resolveWardWorkspaceTab('medicines')).toBe('medicines');
    expect(resolveWardWorkspaceTab('mar')).toBe('medicines');
    expect(resolveWardWorkspaceTab('drips')).toBe('drips');
    expect(resolveWardWorkspaceTab('io')).toBe('drips');
    expect(resolveWardWorkspaceTab('nursing')).toBe('notes');
    expect(resolveWardWorkspaceTab('imaging')).toBe('orders');
    expect(resolveWardWorkspaceTab('admission-plan')).toBe('admission-plan');
    expect(resolveWardWorkspaceTab('procedures')).toBe('procedures');
    expect(resolveWardWorkspaceTab('billing')).toBe('billing');
    expect(resolveWardWorkspaceTab('payments')).toBe('payments');
    expect(resolveWardWorkspaceTab('lab')).toBe('lab');
    expect(resolveWardWorkspaceTab('discharge')).toBe('discharge');
    expect(resolveWardWorkspaceTab('documents')).toBe('documents');
  });

  it('falls back to Overview for blank or unknown tabs', () => {
    expect(resolveWardWorkspaceTab('')).toBe('overview');
    expect(resolveWardWorkspaceTab(null)).toBe('overview');
    expect(resolveWardWorkspaceTab('not-a-tab')).toBe('overview');
  });

  it('opens the Input / Output sub-tab only for I/O deep links', () => {
    expect(resolveWardIvSubTab('io')).toBe('io');
    expect(resolveWardIvSubTab('io-chart')).toBe('io');
    expect(resolveWardIvSubTab('drips')).toBe('iv');
    expect(resolveWardIvSubTab('')).toBe('iv');
  });
});

describe('ward-workspace.util legacy module map', () => {
  it('maps each legacy care module to its workspace tab', () => {
    expect(WARD_MODULE_TO_WORKSPACE_TAB).toEqual({
      vitals: 'vitals',
      mar: 'medicines',
      'drips-iv': 'drips',
      'io-chart': 'drips',
      'orders-services': 'orders',
      'nursing-care': 'notes',
    });
  });

  it('returns no tab for modules that keep their own page', () => {
    expect(wardModuleWorkspaceTab('shift-handover')).toBe('');
    expect(wardModuleWorkspaceTab('inventory')).toBe('');
    expect(wardModuleWorkspaceTab('admissions')).toBe('');
    expect(wardModuleWorkspaceTab('')).toBe('');
  });

  it('builds a workspace route with the matching tab', () => {
    expect(wardWorkspaceRoute('adm-1', wardModuleWorkspaceTab('nursing-care'))).toBe(
      '/ward/patient-detail/adm-1?tab=notes'
    );
    expect(wardWorkspaceRoute('adm-1', wardModuleWorkspaceTab('io-chart'))).toBe(
      '/ward/patient-detail/adm-1?tab=drips'
    );
    expect(wardWorkspaceRoute('adm-1', 'overview')).toBe('/ward/patient-detail/adm-1');
    expect(wardWorkspaceRoute('', 'vitals')).toBe('');
  });
});

describe('ward-workspace.util handover snapshot', () => {
  it('surfaces existing vitals, due meds, active IVs and pending orders without rewriting them', () => {
    const lines = buildWardHandoverSnapshot({
      vitals: [row('v1', { bp: '120/80', pulse: '88', temp: '37.2', spo2: '98' })],
      medications: [
        row('m1', { medicine: 'Ceftriaxone', status: 'Due' }),
        row('m2', { medicine: 'Paracetamol', status: 'Given' }),
      ],
      drips: [row('d1', { fluid: 'Normal Saline', status: 'Running' })],
      orders: [row('o1', { order: 'CBC', status: 'Pending' })],
    });
    expect(lines.map((line) => line.label)).toEqual([
      'Latest vitals',
      'Medications due',
      'Active IVs',
      'Pending orders',
    ]);
    expect(lines[0].value).toContain('BP 120/80');
    expect(lines[1].value).toBe('Ceftriaxone');
    expect(lines[2].value).toBe('Normal Saline');
    expect(lines[3].value).toBe('CBC');
  });

  it('returns nothing when there is no current care data to repeat', () => {
    expect(buildWardHandoverSnapshot({})).toEqual([]);
  });

  it('includes outstanding nursing tasks when they are still open', () => {
    const lines = buildWardHandoverSnapshot({
      nursing: [row('n1', { task: 'Wound dressing', status: 'Due' })],
    });
    expect(lines).toEqual([{ label: 'Outstanding tasks', value: 'Wound dressing' }]);
  });
});

describe('ward-workspace.util history aggregation', () => {
  const entries = buildWardHistoryEntries({
    vitals: [row('v1', { recordedAt: '18 Sep 2026', bp: '120/80', pulse: '88', status: 'Recorded' })],
    medications: [row('m1', { medicine: 'Ceftriaxone', dose: '1 g', route: 'IV', status: 'Given' })],
    drips: [row('d1', { fluid: 'Normal Saline', rate: '80 ml/hr', startedAt: '19 Sep 2026', status: 'Running' })],
    io: [row('io1', { intake: '1200', output: '900', balance: '+300', shift: 'day', status: 'Recorded' })],
    orders: [
      row('o1', { order: 'CBC', type: 'Lab', doctor: 'Dr Aoun', orderedOn: '17 Sep 2026', status: 'Pending' }),
      row('o2', { order: 'Wound debridement', type: 'Procedure', orderedOn: '16 Sep 2026', status: 'Completed' }),
    ],
    nursing: [row('n1', { task: 'Wound dressing', nurse: 'Ayesha', dueAt: '15 Sep 2026', status: 'Completed' })],
    handover: [row('h1', { shift: 'Night Shift', nurse: 'Fahim', condition: 'Stable', updatedAt: '14 Sep 2026' })],
    updates: [
      {
        id: 'u1',
        type: 'lab',
        title: 'Lab order verified',
        description: 'CBC verified',
        performedBy: 'Lab',
        timestamp: '2026-09-19T08:00:00.000Z',
        status: 'Completed',
        actionRoute: '',
        actionLabel: '',
      },
    ],
    admissions: [
      {
        admissionId: 'adm-old',
        admissionNo: 'ADM-9',
        admittedAt: '2025-01-02T00:00:00.000Z',
        status: 'Discharged',
        wardLabel: 'General',
        roomBed: '101 / A',
        consultant: 'Dr Sana',
        diagnosis: 'Pneumonia',
      },
    ],
    operations: [
      {
        id: 'op1',
        procedure: 'Appendectomy',
        status: 'completed',
        statusLabel: 'Completed',
        siteLabel: 'Abdomen · Right',
        scheduledAt: '2026-09-13T06:00:00.000Z',
        surgeon: 'Dr Irfan',
        route: '/operations?operationId=op1',
      },
    ],
  });

  it('groups each source into the right filter bucket', () => {
    expect(countWardHistoryEntries(entries, 'vitals')).toBe(2);
    expect(countWardHistoryEntries(entries, 'medication')).toBe(2);
    expect(countWardHistoryEntries(entries, 'orders')).toBe(2);
    expect(countWardHistoryEntries(entries, 'procedures')).toBe(2);
    expect(countWardHistoryEntries(entries, 'notes')).toBe(2);
    expect(countWardHistoryEntries(entries, 'clinical')).toBe(1);
    expect(countWardHistoryEntries(entries, 'all')).toBe(entries.length);
  });

  it('offers exactly the requested filters', () => {
    expect(WARD_HISTORY_FILTERS.map((filter) => filter.key)).toEqual([
      'all',
      'clinical',
      'medication',
      'vitals',
      'orders',
      'procedures',
      'notes',
    ]);
  });

  it('orders recent first and keeps undated rows last', () => {
    const dated = entries.filter((entry) => entry.sortValue > 0).map((entry) => entry.sortValue);
    const sortedDesc = [...dated].sort((left, right) => right - left);
    expect(dated).toEqual(sortedDesc);

    const lastEntry = entries[entries.length - 1];
    expect(lastEntry.sortValue).toBe(0);
  });

  it('pairs every status with an icon so colour is never the only signal', () => {
    entries.forEach((entry) => {
      expect(entry.statusIcon.startsWith('fa-')).toBe(true);
    });
  });

  it('filters down to a single category', () => {
    const vitals = filterWardHistoryEntries(entries, 'vitals');
    expect(vitals.map((entry) => entry.category)).toEqual(['vitals', 'vitals']);
    expect(vitals.map((entry) => entry.title)).toContain('Intake / Output');
  });

  it('returns an empty feed when nothing has been loaded', () => {
    expect(buildWardHistoryEntries({})).toEqual([]);
  });
});

describe('ward-workspace.util sensitive data rules', () => {
  it('flags psychiatry, oncology and pregnancy detail', () => {
    expect(containsSensitiveClinicalDetail('Psychiatry review pending')).toBe(true);
    expect(containsSensitiveClinicalDetail('Ca breast — chemotherapy cycle 2')).toBe(true);
    expect(containsSensitiveClinicalDetail('G2P1 pregnancy, 32 weeks gestation')).toBe(true);
    expect(containsSensitiveClinicalDetail('Suicidal ideation noted')).toBe(true);
  });

  it('leaves routine ward text alone', () => {
    expect(containsSensitiveClinicalDetail('Community acquired pneumonia')).toBe(false);
    expect(containsSensitiveClinicalDetail('')).toBe(false);
    expect(sanitizeWardSummaryText('Post-op day 2, wound clean')).toBe('Post-op day 2, wound clean');
  });

  it('replaces sensitive text on shared surfaces', () => {
    const safe = sanitizeWardSummaryText('Oncology — metastatic disease');
    expect(safe).not.toContain('metastatic');
    expect(safe).toBe('Sensitive diagnosis — open the patient chart');
    expect(sanitizeWardSummaryText('', 'x')).toBe('');
  });
});

describe('ward-workspace.util quick-action gating', () => {
  const idsFor = (permissions: string[]) =>
    buildWardQuickActions({ permissions }).map((action) => action.id);

  it('renders nothing without permissions', () => {
    expect(buildWardQuickActions({ permissions: [] })).toEqual([]);
  });

  it('gives a nurse the four charting actions', () => {
    expect(idsFor(['ward.read', 'ward.create'])).toEqual([
      'record-vitals',
      'record-dose',
      'update-io',
      'add-nursing-note',
    ]);
    expect(idsFor(['ward.update'])).toContain('record-vitals');
  });

  it('does not give a nurse doctor or bed-management actions', () => {
    const nurse = idsFor(['ward.create']);
    expect(nurse).not.toContain('round-note');
    expect(nurse).not.toContain('new-order');
    expect(nurse).not.toContain('discharge-recommendation');
    expect(nurse).not.toContain('transfer-bed');
  });

  it('gives a doctor round notes, orders and discharge recommendation', () => {
    const doctor = idsFor(['prescriptions.create', 'lab_orders.create', 'ward.admissions.recommend']);
    expect(doctor).toContain('round-note');
    expect(doctor).toContain('new-order');
    expect(doctor).toContain('medicine-lab');
    expect(doctor).toContain('discharge-recommendation');
    expect(doctor).not.toContain('record-vitals');
    expect(doctor).not.toContain('transfer-bed');
  });

  it('labels the medicine / lab action by what the doctor may actually order', () => {
    const labOnly = buildWardQuickActions({ permissions: ['lab_orders.create'] }).find(
      (action) => action.id === 'medicine-lab'
    );
    expect(labOnly?.label).toBe('Lab Order');

    const both = buildWardQuickActions({
      permissions: ['lab_orders.create', 'prescriptions.create'],
    }).find((action) => action.id === 'medicine-lab');
    expect(both?.label).toBe('Medicine / Lab');
  });

  it('gives ward admins bed management only', () => {
    const admin = idsFor(['room_allotments.update']);
    expect(admin).toEqual(['transfer-bed']);
    expect(idsFor(['ward.admissions.create'])).toEqual(['transfer-bed']);
  });

  it('confirms high-impact actions only', () => {
    const actions = buildWardQuickActions({ permissions: ['*'] });
    const confirming = actions.filter((action) => action.confirm).map((action) => action.id);
    expect(confirming).toEqual(['discharge-recommendation', 'transfer-bed']);
  });

  it('hides module actions when the module is off', () => {
    expect(
      buildWardQuickActions({ permissions: ['ward.create'], wardEnabled: false }).map((a) => a.id)
    ).toEqual([]);
    expect(
      buildWardQuickActions({ permissions: ['lab_orders.create'], laboratoryEnabled: false }).map(
        (a) => a.id
      )
    ).toEqual(['new-order']);
  });

  it('treats a wildcard permission as full access', () => {
    expect(idsFor(['*'])).toContain('record-vitals');
    expect(idsFor(['*'])).toContain('transfer-bed');
  });
});

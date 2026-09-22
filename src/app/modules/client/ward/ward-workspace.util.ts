/**
 * Pure helpers for the Patient Ward Workspace. Kept free of Angular so the tab
 * model, legacy deep-link resolution, history aggregation and quick-action
 * gating stay unit-testable without a browser.
 *
 * The history feed is composed here from data the workspace already loaded —
 * there is deliberately no ward timeline collection or endpoint behind it.
 */
import { WardModuleRow } from './ward-module.models';

export type WardWorkspaceTabKey =
  | 'overview'
  | 'vitals'
  | 'medicines'
  | 'drips'
  | 'orders'
  | 'notes'
  | 'history'
  | 'admission-plan'
  | 'procedures'
  | 'billing'
  | 'payments'
  | 'lab'
  | 'discharge'
  | 'documents';

export type WardWorkspaceTabGroup = 'primary' | 'secondary';

export interface WardWorkspaceTab {
  key: WardWorkspaceTabKey;
  label: string;
  icon: string;
  group: WardWorkspaceTabGroup;
}

/** Sub-tabs inside the consolidated "IV / I-O" tab. */
export type WardIvSubTab = 'iv' | 'io';

/**
 * Seven primary tabs carry routine inpatient care; everything else stays
 * reachable through the "More" group so older deep links keep resolving.
 */
export const WARD_WORKSPACE_TABS: readonly WardWorkspaceTab[] = [
  { key: 'overview', label: 'Overview', icon: 'fa-id-card-o', group: 'primary' },
  { key: 'vitals', label: 'Vitals', icon: 'fa-heartbeat', group: 'primary' },
  { key: 'medicines', label: 'Medications', icon: 'fa-medkit', group: 'primary' },
  { key: 'drips', label: 'IV / I-O', icon: 'fa-tint', group: 'primary' },
  { key: 'orders', label: 'Orders', icon: 'fa-list-ul', group: 'primary' },
  { key: 'notes', label: 'Notes', icon: 'fa-sticky-note-o', group: 'primary' },
  { key: 'history', label: 'History', icon: 'fa-history', group: 'primary' },
  { key: 'admission-plan', label: 'Admit / Plan', icon: 'fa-clipboard', group: 'secondary' },
  { key: 'procedures', label: 'Treatments', icon: 'fa-scissors', group: 'secondary' },
  { key: 'lab', label: 'Lab', icon: 'fa-flask', group: 'secondary' },
  { key: 'billing', label: 'Billing', icon: 'fa-file-text-o', group: 'secondary' },
  { key: 'payments', label: 'Payments', icon: 'fa-money', group: 'secondary' },
  { key: 'discharge', label: 'Discharge', icon: 'fa-sign-out', group: 'secondary' },
  { key: 'documents', label: 'Documents', icon: 'fa-print', group: 'secondary' },
];

export const WARD_WORKSPACE_PRIMARY_TABS: readonly WardWorkspaceTab[] = WARD_WORKSPACE_TABS.filter(
  (tab) => tab.group === 'primary'
);

export const WARD_WORKSPACE_SECONDARY_TABS: readonly WardWorkspaceTab[] = WARD_WORKSPACE_TABS.filter(
  (tab) => tab.group === 'secondary'
);

/**
 * Tab keys that existed before the workspace consolidation. `nursing` became the
 * Notes tab and `io` became a sub-tab of IV / I-O, so both must still resolve.
 */
const WARD_WORKSPACE_TAB_ALIASES: Record<string, WardWorkspaceTabKey> = {
  nursing: 'notes',
  'nursing-care': 'notes',
  'nursing-notes': 'notes',
  notes: 'notes',
  io: 'drips',
  'io-chart': 'drips',
  'drips-iv': 'drips',
  iv: 'drips',
  mar: 'medicines',
  medications: 'medicines',
  imaging: 'orders',
  'orders-services': 'orders',
  'admission-plan': 'admission-plan',
  admit: 'admission-plan',
  treatments: 'procedures',
};

const WARD_WORKSPACE_TAB_KEYS = new Set<string>(WARD_WORKSPACE_TABS.map((tab) => tab.key));

/** Legacy `?tab=` values resolve to a canonical workspace tab; unknown values fall back to Overview. */
export function resolveWardWorkspaceTab(raw: unknown): WardWorkspaceTabKey {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) {
    return 'overview';
  }
  if (WARD_WORKSPACE_TAB_KEYS.has(value)) {
    return value as WardWorkspaceTabKey;
  }
  return WARD_WORKSPACE_TAB_ALIASES[value] || 'overview';
}

/** `?tab=io` (and the legacy I/O chart module) opens IV / I-O on the Input / Output sub-tab. */
export function resolveWardIvSubTab(raw: unknown): WardIvSubTab {
  const value = String(raw ?? '').trim().toLowerCase();
  return value === 'io' || value === 'io-chart' ? 'io' : 'iv';
}

export function wardWorkspaceTabLabel(key: string): string {
  return WARD_WORKSPACE_TABS.find((tab) => tab.key === key)?.label || 'Overview';
}

export function isSecondaryWardWorkspaceTab(key: string): boolean {
  return WARD_WORKSPACE_SECONDARY_TABS.some((tab) => tab.key === key);
}

/**
 * Legacy ward module pages → the workspace tab that now owns that work, so a
 * patient row on an old list page lands on the right section of the chart.
 */
export const WARD_MODULE_TO_WORKSPACE_TAB: Readonly<Record<string, WardWorkspaceTabKey>> = {
  vitals: 'vitals',
  mar: 'medicines',
  'drips-iv': 'drips',
  'io-chart': 'drips',
  'orders-services': 'orders',
  'nursing-care': 'notes',
};

/** Returns the workspace tab for a ward module key, or '' for modules that own their own page. */
export function wardModuleWorkspaceTab(moduleKey: unknown): WardWorkspaceTabKey | '' {
  const key = String(moduleKey ?? '').trim().toLowerCase();
  return WARD_MODULE_TO_WORKSPACE_TAB[key] || '';
}

/** Builds `/ward/patient-detail/:admissionId?tab=…` for a legacy module row. */
export function wardWorkspaceRoute(admissionId: string, tab: WardWorkspaceTabKey | ''): string {
  const id = String(admissionId || '').trim();
  if (!id) {
    return '';
  }
  return tab && tab !== 'overview'
    ? `/ward/patient-detail/${id}?tab=${tab}`
    : `/ward/patient-detail/${id}`;
}

/* ------------------------------------------------------------------ history */

export type WardHistoryCategory =
  | 'clinical'
  | 'medication'
  | 'vitals'
  | 'orders'
  | 'procedures'
  | 'notes';

export type WardHistoryFilter = 'all' | WardHistoryCategory;

export interface WardHistoryFilterOption {
  key: WardHistoryFilter;
  label: string;
}

export const WARD_HISTORY_FILTERS: readonly WardHistoryFilterOption[] = [
  { key: 'all', label: 'All' },
  { key: 'clinical', label: 'Clinical' },
  { key: 'medication', label: 'Medication' },
  { key: 'vitals', label: 'Vitals' },
  { key: 'orders', label: 'Orders' },
  { key: 'procedures', label: 'Procedures' },
  { key: 'notes', label: 'Notes' },
];

export interface WardHistoryEntry {
  id: string;
  category: WardHistoryCategory;
  title: string;
  detail: string;
  status: string;
  /** Status is always icon + text, never colour alone. */
  statusIcon: string;
  author: string;
  /** Display timestamp exactly as the source rendered it. */
  timeLabel: string;
  /** Epoch ms for ordering; 0 when the source only carries a display string. */
  sortValue: number;
}

export interface WardPatientUpdateItem {
  id: string;
  type: string;
  title: string;
  description: string;
  performedBy: string;
  recommendedBy?: string | null;
  timestamp: string;
  status: string;
  actionRoute: string;
  actionLabel: string;
}

export interface WardAdmissionHistoryItem {
  admissionId: string;
  admissionNo: string;
  admittedAt: string;
  dischargedAt?: string | null;
  status: string;
  wardLabel: string;
  roomBed: string;
  consultant: string;
  diagnosis: string;
  lengthOfStayDays?: number | null;
}

export interface WardOperationSummary {
  id: string;
  procedure: string;
  status: string;
  statusLabel: string;
  siteLabel: string;
  scheduledAt: string;
  surgeon: string;
  route: string;
}

export interface WardHistorySources {
  vitals?: WardModuleRow[];
  medications?: WardModuleRow[];
  drips?: WardModuleRow[];
  io?: WardModuleRow[];
  orders?: WardModuleRow[];
  nursing?: WardModuleRow[];
  handover?: WardModuleRow[];
  updates?: WardPatientUpdateItem[];
  admissions?: WardAdmissionHistoryItem[];
  operations?: WardOperationSummary[];
  /** Current admission start — entries before it belong to a previous stay. */
  admittedAt?: string;
}

const STATUS_ICONS: Record<string, string> = {
  completed: 'fa-check-circle',
  given: 'fa-check-circle',
  recorded: 'fa-check-circle',
  running: 'fa-refresh',
  'in progress': 'fa-refresh',
  due: 'fa-clock-o',
  pending: 'fa-clock-o',
  planned: 'fa-clock-o',
  missed: 'fa-exclamation-triangle',
  overdue: 'fa-exclamation-triangle',
  critical: 'fa-exclamation-triangle',
  cancelled: 'fa-ban',
};

export function wardHistoryStatusIcon(status: unknown): string {
  const value = String(status ?? '').trim().toLowerCase();
  return STATUS_ICONS[value] || 'fa-circle-o';
}

/** Tolerant parse for ward display dates ("19 Sep 2026") and ISO strings. */
export function parseWardTimestamp(value: unknown): number {
  const text = String(value ?? '').trim();
  if (!text || text === '—') {
    return 0;
  }
  const parsed = new Date(text).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

const cell = (row: WardModuleRow, key: string): string => {
  const value = String(row.cells?.[key] ?? '').trim();
  return value && value !== '—' ? value : '';
};

const entryFromRow = (
  row: WardModuleRow,
  category: WardHistoryCategory,
  title: string,
  detail: string,
  timeKey: string[],
  author: string
): WardHistoryEntry => {
  const timeLabel = timeKey.map((key) => cell(row, key)).find(Boolean) || '';
  const status = cell(row, 'status') || 'Recorded';
  return {
    id: `${category}-${row.id}`,
    category,
    title,
    detail,
    status,
    statusIcon: wardHistoryStatusIcon(status),
    author,
    timeLabel,
    sortValue: parseWardTimestamp(timeLabel),
  };
};

/**
 * Client-side aggregation of the canonical sources the workspace already holds.
 * Nothing here is persisted and no new endpoint is involved.
 */
export function buildWardHistoryEntries(sources: WardHistorySources): WardHistoryEntry[] {
  const entries: WardHistoryEntry[] = [];

  (sources.vitals || []).forEach((row) => {
    const parts = [
      cell(row, 'bp') ? `BP ${cell(row, 'bp')}` : '',
      cell(row, 'pulse') ? `Pulse ${cell(row, 'pulse')}` : '',
      cell(row, 'temp') ? `Temp ${cell(row, 'temp')}` : '',
      cell(row, 'spo2') ? `SpO2 ${cell(row, 'spo2')}` : '',
    ].filter(Boolean);
    entries.push(
      entryFromRow(row, 'vitals', 'Vitals recorded', parts.join(' · '), ['recordedAt'], cell(row, 'nurse'))
    );
  });

  (sources.medications || []).forEach((row) => {
    const detail = [cell(row, 'dose'), cell(row, 'route')].filter(Boolean).join(' · ');
    entries.push(
      entryFromRow(
        row,
        'medication',
        cell(row, 'medicine') || 'Medication',
        detail,
        ['dueTime'],
        cell(row, 'nurse')
      )
    );
  });

  (sources.drips || []).forEach((row) => {
    entries.push(
      entryFromRow(
        row,
        'medication',
        `IV — ${cell(row, 'fluid') || 'Fluid'}`,
        cell(row, 'rate') ? `Rate ${cell(row, 'rate')}` : '',
        ['startedAt'],
        cell(row, 'nurse')
      )
    );
  });

  (sources.io || []).forEach((row) => {
    const detail = [
      cell(row, 'intake') ? `Intake ${cell(row, 'intake')} ml` : '',
      cell(row, 'output') ? `Output ${cell(row, 'output')} ml` : '',
      cell(row, 'balance') ? `Balance ${cell(row, 'balance')}` : '',
    ].filter(Boolean);
    entries.push(
      entryFromRow(row, 'vitals', 'Intake / Output', detail.join(' · '), ['recordedAt', 'shift'], '')
    );
  });

  (sources.orders || []).forEach((row) => {
    const type = cell(row, 'type');
    const category: WardHistoryCategory = /procedure|surg|oper/i.test(type) ? 'procedures' : 'orders';
    entries.push(
      entryFromRow(
        row,
        category,
        cell(row, 'order') || 'Order',
        [type, cell(row, 'priority')].filter(Boolean).join(' · '),
        ['orderedOn', 'time'],
        cell(row, 'doctor')
      )
    );
  });

  (sources.nursing || []).forEach((row) => {
    entries.push(
      entryFromRow(
        row,
        'notes',
        cell(row, 'task') || 'Nursing note',
        cell(row, 'priority') ? `Priority ${cell(row, 'priority')}` : '',
        ['dueAt'],
        cell(row, 'nurse')
      )
    );
  });

  (sources.handover || []).forEach((row) => {
    entries.push(
      entryFromRow(
        row,
        'notes',
        `Handover — ${cell(row, 'shift') || 'shift'}`,
        cell(row, 'condition'),
        ['updatedAt'],
        cell(row, 'nurse')
      )
    );
  });

  (sources.updates || []).forEach((update) => {
    entries.push({
      id: `update-${update.id}`,
      category: updateCategory(update.type, update.title),
      title: update.title || 'Update',
      detail: update.description || '',
      status: update.status || 'Recorded',
      statusIcon: wardHistoryStatusIcon(update.status),
      author: update.recommendedBy || update.performedBy || '',
      timeLabel: update.timestamp || '',
      sortValue: parseWardTimestamp(update.timestamp),
    });
  });

  (sources.operations || []).forEach((operation) => {
    entries.push({
      id: `operation-${operation.id}`,
      category: 'procedures',
      title: operation.procedure || 'Operation',
      detail: [operation.siteLabel, operation.surgeon].filter(Boolean).join(' · '),
      status: operation.statusLabel || operation.status,
      statusIcon: wardHistoryStatusIcon(operation.status),
      author: operation.surgeon || '',
      timeLabel: operation.scheduledAt || '',
      sortValue: parseWardTimestamp(operation.scheduledAt),
    });
  });

  (sources.admissions || []).forEach((admission) => {
    entries.push({
      id: `admission-${admission.admissionId}`,
      category: 'clinical',
      title: `Admission ${admission.admissionNo || ''}`.trim(),
      detail: [admission.wardLabel, admission.roomBed, admission.diagnosis].filter(Boolean).join(' · '),
      status: admission.status || 'Closed',
      statusIcon: wardHistoryStatusIcon(admission.status),
      author: admission.consultant || '',
      timeLabel: admission.admittedAt || '',
      sortValue: parseWardTimestamp(admission.admittedAt),
    });
  });

  return sortWardHistoryEntries(entries);
}

function updateCategory(type: unknown, title: unknown): WardHistoryCategory {
  const value = String(type ?? '').trim().toLowerCase();
  const text = String(title ?? '');
  if (value === 'mar' || value === 'pharmacy') {
    return 'medication';
  }
  if (value === 'lab' || value === 'imaging' || value === 'order') {
    return 'orders';
  }
  if (value === 'vitals' || /vital/i.test(text)) {
    return 'vitals';
  }
  if (value === 'procedure' || /procedure|operation/i.test(text)) {
    return 'procedures';
  }
  if (value === 'nursing' || /note/i.test(text)) {
    return 'notes';
  }
  return 'clinical';
}

/** Recent-first; entries whose source only carries a display string sort last. */
export function sortWardHistoryEntries(entries: WardHistoryEntry[]): WardHistoryEntry[] {
  return [...entries].sort((left, right) => {
    if (left.sortValue !== right.sortValue) {
      return right.sortValue - left.sortValue;
    }
    return left.title.localeCompare(right.title);
  });
}

export function filterWardHistoryEntries(
  entries: WardHistoryEntry[],
  filter: WardHistoryFilter
): WardHistoryEntry[] {
  return filter === 'all' ? entries : entries.filter((entry) => entry.category === filter);
}

export function countWardHistoryEntries(
  entries: WardHistoryEntry[],
  filter: WardHistoryFilter
): number {
  return filterWardHistoryEntries(entries, filter).length;
}

/* ------------------------------------------------------- sensitive data rules */

/**
 * Psychiatry, oncology and pregnancy detail never belongs on bed cards, generic
 * nurse summaries, attendant screens or the shared handover surface. These are
 * text guards for summaries we compose ourselves — the authoritative filtering
 * still has to happen server-side.
 */
const SENSITIVE_CLINICAL_PATTERNS: readonly RegExp[] = [
  /psychiatr/i,
  /mental health/i,
  /schizo/i,
  /bipolar/i,
  /suicid/i,
  /self[- ]harm/i,
  /depressi/i,
  /oncolog/i,
  /cancer/i,
  /carcinoma/i,
  /tumou?r/i,
  /metasta/i,
  /chemotherap/i,
  /palliative/i,
  /pregnan/i,
  /obstetric/i,
  /antenatal/i,
  /gravida/i,
  /gestation/i,
  /abortion/i,
  /miscarriage/i,
];

export const WARD_SENSITIVE_SUMMARY_FALLBACK = 'Sensitive diagnosis — open the patient chart';

export function containsSensitiveClinicalDetail(text: unknown): boolean {
  const value = String(text ?? '');
  if (!value.trim()) {
    return false;
  }
  return SENSITIVE_CLINICAL_PATTERNS.some((pattern) => pattern.test(value));
}

/** Returns the text when it is safe for a shared surface, else a neutral placeholder. */
export function sanitizeWardSummaryText(
  text: unknown,
  fallback: string = WARD_SENSITIVE_SUMMARY_FALLBACK
): string {
  const value = String(text ?? '').trim();
  if (!value) {
    return '';
  }
  return containsSensitiveClinicalDetail(value) ? fallback : value;
}

/* ------------------------------------------------------------ quick actions */

export type WardQuickActionRole = 'nurse' | 'doctor' | 'ward-admin';

export type WardQuickActionIntent =
  | 'record-vitals'
  | 'record-dose'
  | 'update-io'
  | 'add-nursing-note'
  | 'round-note'
  | 'new-order'
  | 'medicine-lab'
  | 'discharge-recommendation'
  | 'transfer-bed';

export interface WardQuickAction {
  id: WardQuickActionIntent;
  label: string;
  icon: string;
  role: WardQuickActionRole;
  /** Workspace tab to open, when the action is a navigation. */
  tab?: WardWorkspaceTabKey;
  /** IV / I-O sub-tab to preselect. */
  subTab?: WardIvSubTab;
  /** High-impact actions confirm before running. */
  confirm?: boolean;
}

export interface WardQuickActionContext {
  permissions: string[];
  /** Hospital module switches — an action for a disabled module is never shown. */
  wardEnabled?: boolean;
  pharmacyEnabled?: boolean;
  laboratoryEnabled?: boolean;
}

const grants = (permissions: string[], permission: string): boolean => {
  if (permissions.includes('*')) {
    return true;
  }
  const normalize = (value: string) => value.trim().replace(/[\s_-]/g, '').toLowerCase();
  const target = normalize(permission);
  return permissions.some((item) => normalize(item) === target);
};

const grantsAny = (permissions: string[], candidates: string[]): boolean =>
  candidates.some((permission) => grants(permissions, permission));

/**
 * Role-sensitive Overview actions. Nothing is rendered that the user lacks
 * permission for — the list itself is the gate, not a CSS class.
 */
export function buildWardQuickActions(context: WardQuickActionContext): WardQuickAction[] {
  const permissions = Array.isArray(context.permissions) ? context.permissions : [];
  const wardEnabled = context.wardEnabled !== false;
  const actions: WardQuickAction[] = [];

  const canNurseChart = wardEnabled && grantsAny(permissions, ['ward.create', 'ward.update']);
  if (canNurseChart) {
    actions.push(
      { id: 'record-vitals', label: 'Record Vitals', icon: 'fa-heartbeat', role: 'nurse', tab: 'vitals' },
      {
        id: 'record-dose',
        label: 'Medication Administration',
        icon: 'fa-medkit',
        role: 'nurse',
        tab: 'medicines',
      },
      {
        id: 'update-io',
        label: 'Update IV / I-O',
        icon: 'fa-tint',
        role: 'nurse',
        tab: 'drips',
        subTab: 'io',
      },
      {
        id: 'add-nursing-note',
        label: 'Add Nursing Note',
        icon: 'fa-sticky-note-o',
        role: 'nurse',
        tab: 'notes',
      }
    );
  }

  if (grants(permissions, 'prescriptions.create')) {
    actions.push({
      id: 'round-note',
      label: 'Round Note',
      icon: 'fa-stethoscope',
      role: 'doctor',
      tab: 'notes',
    });
  }

  if (grantsAny(permissions, ['prescriptions.create', 'lab_orders.create'])) {
    actions.push({ id: 'new-order', label: 'New Order', icon: 'fa-plus-square-o', role: 'doctor' });
  }

  const canMedicine = context.pharmacyEnabled !== false && grants(permissions, 'prescriptions.create');
  const canLab = context.laboratoryEnabled !== false && grants(permissions, 'lab_orders.create');
  if (canMedicine || canLab) {
    actions.push({
      id: 'medicine-lab',
      label: canLab && !canMedicine ? 'Lab Order' : canMedicine && !canLab ? 'Medicine Order' : 'Medicine / Lab',
      icon: 'fa-flask',
      role: 'doctor',
    });
  }

  if (grants(permissions, 'ward.admissions.recommend')) {
    actions.push({
      id: 'discharge-recommendation',
      label: 'Discharge Recommendation',
      icon: 'fa-sign-out',
      role: 'doctor',
      tab: 'discharge',
      confirm: true,
    });
  }

  if (
    grantsAny(permissions, [
      'room_allotments.update',
      'room_allotments.create',
      'ward.admissions.create',
    ])
  ) {
    actions.push({
      id: 'transfer-bed',
      label: 'Transfer / Bed Management',
      icon: 'fa-random',
      role: 'ward-admin',
      confirm: true,
    });
  }

  return actions;
}

/** Auto-display for handover — canonical facts only; the nurse still writes the narrative. */
export interface WardHandoverSnapshotLine {
  label: string;
  value: string;
}

export function buildWardHandoverSnapshot(sources: WardHistorySources): WardHandoverSnapshotLine[] {
  const lines: WardHandoverSnapshotLine[] = [];
  const latestVital = (sources.vitals || [])[0];
  if (latestVital) {
    const parts = [
      cell(latestVital, 'bp') ? `BP ${cell(latestVital, 'bp')}` : '',
      cell(latestVital, 'pulse') ? `Pulse ${cell(latestVital, 'pulse')}` : '',
      cell(latestVital, 'temp') ? `Temp ${cell(latestVital, 'temp')}` : '',
      cell(latestVital, 'spo2') ? `SpO2 ${cell(latestVital, 'spo2')}` : '',
    ].filter(Boolean);
    if (parts.length) {
      lines.push({ label: 'Latest vitals', value: parts.join(' · ') });
    }
  }

  const dueMeds = (sources.medications || []).filter((row) =>
    /due|pending|overdue/i.test(cell(row, 'status'))
  );
  if (dueMeds.length) {
    lines.push({
      label: 'Medications due',
      value: dueMeds
        .slice(0, 4)
        .map((row) => cell(row, 'medicine') || 'Medication')
        .join(', '),
    });
  }

  const activeDrips = (sources.drips || []).filter((row) =>
    /run|active|in progress/i.test(cell(row, 'status'))
  );
  if (activeDrips.length) {
    lines.push({
      label: 'Active IVs',
      value: activeDrips
        .slice(0, 4)
        .map((row) => cell(row, 'fluid') || 'Fluid')
        .join(', '),
    });
  }

  const pendingOrders = (sources.orders || []).filter((row) =>
    /pending|in progress|ordered/i.test(cell(row, 'status'))
  );
  if (pendingOrders.length) {
    lines.push({
      label: 'Pending orders',
      value: pendingOrders
        .slice(0, 4)
        .map((row) => cell(row, 'order') || 'Order')
        .join(', '),
    });
  }

  const outstandingTasks = (sources.nursing || []).filter((row) =>
    /pending|due|todo|open|overdue/i.test(cell(row, 'status'))
  );
  if (outstandingTasks.length) {
    lines.push({
      label: 'Outstanding tasks',
      value: outstandingTasks
        .slice(0, 4)
        .map((row) => cell(row, 'task') || 'Task')
        .join(', '),
    });
  }

  return lines;
}

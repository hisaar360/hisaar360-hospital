/**
 * Pure helpers for Ward Home / My Work. Kept free of Angular so the bed-status
 * mapping, filter rules and work bucketing stay unit-testable.
 */

export type WardBedSummaryKey = 'occupied' | 'available' | 'reserved' | 'cleaning' | 'unavailable';

export interface WardHomeSummary {
  beds: {
    total: number;
    occupied: number;
    available: number;
    reserved: number;
    cleaning: number;
    unavailable: number;
  };
  admissions: {
    pendingRecommendations: number;
    activeAdmissions: number;
    dischargeReady: number;
  };
  work: {
    overdue: number;
    dueNow: number;
    upcoming: number;
  };
}

export interface WardHomeSummaryTile {
  key: string;
  label: string;
  value: number;
  icon: string;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal';
  route?: string;
}

export type WardWorkBucket = 'overdue' | 'dueNow' | 'upcoming';

export interface WardWorkItem {
  id: string;
  activityType: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  scheduledAt: string;
  patientName: string;
  bedLabel: string;
  admissionId: string;
}

export interface WardWorkCounts {
  medicationsDue: number;
  vitalsDue: number;
  activeDrips: number;
  pendingIo: number;
  newOrders: number;
  handoverItems: number;
}

export interface WardMyWork {
  overdue: WardWorkItem[];
  dueNow: WardWorkItem[];
  upcoming: WardWorkItem[];
  counts: WardWorkCounts;
}

export interface WardBedBoardBed {
  id: string;
  roomId: string;
  bedLabel: string;
  status: string;
  admissionId?: string;
  patientName?: string;
  age?: number;
  sex?: string;
  occupiedSince?: string;
}

export interface WardBedBoardAdmission {
  admissionId: string;
  patientName?: string;
  mrn?: string;
  consultant?: string;
  wardName?: string;
  bedLabel?: string;
  admittedAt?: string;
}

export interface WardBedCard {
  id: string;
  admissionId: string;
  bedLabel: string;
  wardName: string;
  statusKey: WardBedSummaryKey;
  statusLabel: string;
  statusIcon: string;
  patientName: string;
  ageSexLabel: string;
  mrn: string;
  consultant: string;
  lengthOfStayLabel: string;
  alertLabel: string;
  nextDueLabel: string;
  nextDueBucket: WardWorkBucket | '';
  needsAttention: boolean;
}

export interface WardBedGroup {
  wardName: string;
  cards: WardBedCard[];
}

export type WardHomeFilter = 'my-ward' | 'all' | 'occupied' | 'available' | 'attention';

/** Items scheduled within this forward window are "due now" — mirrors the backend window. */
export const WARD_DUE_NOW_WINDOW_MS = 30 * 60 * 1000;

export const UNASSIGNED_WARD_LABEL = 'Unassigned Ward';

const BED_STATUS_SUMMARY_KEYS: Record<string, WardBedSummaryKey> = {
  available: 'available',
  occupied: 'occupied',
  on_hold: 'reserved',
  cleaning: 'cleaning',
  maintenance: 'unavailable',
  blocked: 'unavailable',
};

const BED_STATUS_LABELS: Record<WardBedSummaryKey, string> = {
  occupied: 'Occupied',
  available: 'Available',
  reserved: 'Reserved',
  cleaning: 'Cleaning',
  unavailable: 'Unavailable',
};

const BED_STATUS_ICONS: Record<WardBedSummaryKey, string> = {
  occupied: 'fa-user',
  available: 'fa-check-circle',
  reserved: 'fa-clock-o',
  cleaning: 'fa-refresh',
  unavailable: 'fa-ban',
};

export const EMPTY_WARD_HOME_SUMMARY: WardHomeSummary = {
  beds: { total: 0, occupied: 0, available: 0, reserved: 0, cleaning: 0, unavailable: 0 },
  admissions: { pendingRecommendations: 0, activeAdmissions: 0, dischargeReady: 0 },
  work: { overdue: 0, dueNow: 0, upcoming: 0 },
};

export const EMPTY_WARD_WORK_COUNTS: WardWorkCounts = {
  medicationsDue: 0,
  vitalsDue: 0,
  activeDrips: 0,
  pendingIo: 0,
  newOrders: 0,
  handoverItems: 0,
};

const readRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const readNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readText = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

export function mapBedStatusToSummaryKey(status: unknown): WardBedSummaryKey | null {
  return BED_STATUS_SUMMARY_KEYS[readText(status).trim().toLowerCase()] || null;
}

export function bedStatusLabel(statusKey: WardBedSummaryKey): string {
  return BED_STATUS_LABELS[statusKey];
}

export function bedStatusIcon(statusKey: WardBedSummaryKey): string {
  return BED_STATUS_ICONS[statusKey];
}

export function normalizeWardHomeSummary(raw: unknown): WardHomeSummary {
  const source = readRecord(raw);
  const beds = readRecord(source['beds']);
  const admissions = readRecord(source['admissions']);
  const work = readRecord(source['work']);

  return {
    beds: {
      total: readNumber(beds['total']),
      occupied: readNumber(beds['occupied']),
      available: readNumber(beds['available']),
      reserved: readNumber(beds['reserved']),
      cleaning: readNumber(beds['cleaning']),
      unavailable: readNumber(beds['unavailable']),
    },
    admissions: {
      pendingRecommendations: readNumber(admissions['pendingRecommendations']),
      activeAdmissions: readNumber(admissions['activeAdmissions']),
      dischargeReady: readNumber(admissions['dischargeReady']),
    },
    work: {
      overdue: readNumber(work['overdue']),
      dueNow: readNumber(work['dueNow']),
      upcoming: readNumber(work['upcoming']),
    },
  };
}

export function buildWardHomeSummaryTiles(summary: WardHomeSummary): WardHomeSummaryTile[] {
  return [
    { key: 'occupied', label: 'Occupied', value: summary.beds.occupied, icon: 'fa-user', tone: 'blue' },
    { key: 'available', label: 'Available', value: summary.beds.available, icon: 'fa-check-circle', tone: 'green' },
    { key: 'reserved', label: 'Reserved', value: summary.beds.reserved, icon: 'fa-clock-o', tone: 'amber' },
    {
      key: 'unavailable',
      label: 'Cleaning / Unavailable',
      value: summary.beds.cleaning + summary.beds.unavailable,
      icon: 'fa-ban',
      tone: 'purple',
    },
    {
      key: 'pendingAdmissions',
      label: 'Pending Admissions',
      value: summary.admissions.pendingRecommendations,
      icon: 'fa-user-plus',
      tone: 'teal',
      route: '/ward/admissions',
    },
    {
      key: 'dischargeReady',
      label: 'Discharge Ready',
      value: summary.admissions.dischargeReady,
      icon: 'fa-sign-out',
      tone: 'red',
      route: '/ward/admissions',
    },
  ];
}

export function normalizeWardWorkItem(raw: unknown): WardWorkItem {
  const source = readRecord(raw);
  return {
    id: readText(source['id'] || source['_id']),
    activityType: readText(source['activityType']),
    title: readText(source['title']),
    description: readText(source['description']),
    priority: readText(source['priority'] || 'normal'),
    status: readText(source['status'] || 'pending'),
    scheduledAt: readText(source['scheduledAt']),
    patientName: readText(source['patientName']),
    bedLabel: readText(source['bedLabel']),
    admissionId: readText(source['admissionId']),
  };
}

export function normalizeWardMyWork(raw: unknown): WardMyWork {
  const source = readRecord(raw);
  const counts = readRecord(source['counts']);
  const list = (value: unknown): WardWorkItem[] =>
    (Array.isArray(value) ? value : []).map((item) => normalizeWardWorkItem(item));

  return {
    overdue: list(source['overdue']),
    dueNow: list(source['dueNow']),
    upcoming: list(source['upcoming']),
    counts: {
      medicationsDue: readNumber(counts['medicationsDue']),
      vitalsDue: readNumber(counts['vitalsDue']),
      activeDrips: readNumber(counts['activeDrips']),
      pendingIo: readNumber(counts['pendingIo']),
      newOrders: readNumber(counts['newOrders']),
      handoverItems: readNumber(counts['handoverItems']),
    },
  };
}

/** Patient-workspace tab that matches a work item, so nurses land on the right chart section. */
export function workItemChartTab(item: WardWorkItem): string {
  const title = item.title.toLowerCase();
  switch (item.activityType) {
    case 'mar_dose':
      return 'medicines';
    case 'io_entry':
      return 'vitals';
    case 'handover':
      return 'overview';
    default:
      break;
  }

  if (title.startsWith('lab order')) {
    return 'lab';
  }
  if (title.startsWith('imaging')) {
    return 'orders';
  }
  if (title.includes('vital')) {
    return 'vitals';
  }
  if (title.includes('drip') || title.includes('iv fluid')) {
    return 'drips';
  }
  if (title.startsWith('service order')) {
    return 'procedures';
  }
  return 'orders';
}

export function formatLengthOfStay(admittedAt: string | undefined, now: Date = new Date()): string {
  if (!admittedAt) {
    return '';
  }

  const admitted = new Date(admittedAt);
  if (Number.isNaN(admitted.getTime())) {
    return '';
  }

  const elapsedMs = Math.max(now.getTime() - admitted.getTime(), 0);
  const hours = Math.floor(elapsedMs / (60 * 60 * 1000));
  if (hours < 24) {
    return hours <= 1 ? 'Day 1 (<1h)' : `Day 1 (${hours}h)`;
  }

  const days = Math.floor(hours / 24);
  return `Day ${days + 1}`;
}

const workBucketOf = (item: WardWorkItem, now: Date): WardWorkBucket => {
  if (!item.scheduledAt) {
    return 'upcoming';
  }
  const scheduled = new Date(item.scheduledAt);
  if (Number.isNaN(scheduled.getTime())) {
    return 'upcoming';
  }
  if (scheduled.getTime() < now.getTime()) {
    return 'overdue';
  }
  if (scheduled.getTime() <= now.getTime() + WARD_DUE_NOW_WINDOW_MS) {
    return 'dueNow';
  }
  return 'upcoming';
};

const BUCKET_ORDER: Record<WardWorkBucket, number> = { overdue: 0, dueNow: 1, upcoming: 2 };

const BUCKET_LABELS: Record<WardWorkBucket, string> = {
  overdue: 'Overdue',
  dueNow: 'Due now',
  upcoming: 'Next',
};

export function buildWardBedCards(input: {
  beds: WardBedBoardBed[];
  roomWardNames?: Record<string, string>;
  admissions?: WardBedBoardAdmission[];
  workItems?: WardWorkItem[];
  now?: Date;
}): WardBedCard[] {
  const now = input.now || new Date();
  const roomWardNames = input.roomWardNames || {};
  const admissionById = new Map(
    (input.admissions || []).map((admission) => [String(admission.admissionId), admission])
  );
  const workByAdmission = new Map<string, WardWorkItem[]>();
  (input.workItems || []).forEach((item) => {
    if (!item.admissionId) {
      return;
    }
    const group = workByAdmission.get(item.admissionId) || [];
    group.push(item);
    workByAdmission.set(item.admissionId, group);
  });

  const cardForBed = (bed: WardBedBoardBed): WardBedCard => {
    const statusKey = mapBedStatusToSummaryKey(bed.status) || 'unavailable';
    const admissionId = String(bed.admissionId || '');
    const admission = admissionById.get(admissionId);
    const items = (workByAdmission.get(admissionId) || [])
      .map((item) => ({ item, bucket: workBucketOf(item, now) }))
      .sort((left, right) => BUCKET_ORDER[left.bucket] - BUCKET_ORDER[right.bucket]);
    const overdueCount = items.filter((entry) => entry.bucket === 'overdue').length;
    const next = items[0];

    const ageSexParts = [
      bed.age ? `${bed.age}y` : '',
      readText(bed.sex).toUpperCase(),
    ].filter(Boolean);

    let alertLabel = '';
    if (overdueCount > 0) {
      alertLabel = overdueCount === 1 ? '1 overdue task' : `${overdueCount} overdue tasks`;
    } else if (statusKey === 'cleaning') {
      alertLabel = 'Needs cleaning';
    } else if (statusKey === 'unavailable') {
      alertLabel = 'Out of service';
    }

    return {
      id: bed.id,
      admissionId,
      bedLabel: bed.bedLabel || '—',
      wardName: roomWardNames[String(bed.roomId)] || admission?.wardName || UNASSIGNED_WARD_LABEL,
      statusKey,
      statusLabel: BED_STATUS_LABELS[statusKey],
      statusIcon: BED_STATUS_ICONS[statusKey],
      patientName: bed.patientName || admission?.patientName || '',
      ageSexLabel: ageSexParts.join(' · '),
      mrn: admission?.mrn || '',
      consultant: admission?.consultant || '',
      lengthOfStayLabel: formatLengthOfStay(bed.occupiedSince || admission?.admittedAt, now),
      alertLabel,
      nextDueLabel: next ? `${BUCKET_LABELS[next.bucket]}: ${next.item.title}` : '',
      nextDueBucket: next ? next.bucket : '',
      needsAttention: Boolean(alertLabel),
    };
  };

  const cards = input.beds.map(cardForBed);
  const coveredAdmissions = new Set(cards.map((card) => card.admissionId).filter(Boolean));

  // Legacy admissions without a ward bed row must still appear on the board.
  (input.admissions || [])
    .filter((admission) => admission.admissionId && !coveredAdmissions.has(String(admission.admissionId)))
    .forEach((admission) => {
      cards.push(
        cardForBed({
          id: `admission-${admission.admissionId}`,
          roomId: '',
          bedLabel: admission.bedLabel || '—',
          status: 'occupied',
          admissionId: admission.admissionId,
          patientName: admission.patientName,
          occupiedSince: admission.admittedAt,
        })
      );
    });

  return cards;
}

export function groupWardBedCards(cards: WardBedCard[]): WardBedGroup[] {
  const groups = new Map<string, WardBedCard[]>();
  cards.forEach((card) => {
    const group = groups.get(card.wardName) || [];
    group.push(card);
    groups.set(card.wardName, group);
  });

  return [...groups.entries()]
    .map(([wardName, wardCards]) => ({
      wardName,
      cards: [...wardCards].sort((left, right) => left.bedLabel.localeCompare(right.bedLabel, undefined, { numeric: true })),
    }))
    .sort((left, right) => left.wardName.localeCompare(right.wardName));
}

export interface WardAttendantTask {
  id: string;
  taskType: string;
  taskTypeLabel: string;
  title: string;
  instruction: string;
  status: string;
  priority: string;
  dueAt: string;
  patientName: string;
  bedLabel: string;
  wardName: string;
  fromLocation: string;
  toLocation: string;
  requestedByName: string;
}

export const ATTENDANT_TASK_TYPE_LABELS: Record<string, string> = {
  PATIENT_TRANSPORT: 'Patient Transport',
  WHEELCHAIR: 'Wheelchair',
  TAKE_TO_LAB: 'Take to Lab',
  SAMPLE_PICKUP: 'Sample Pickup',
  TAKE_TO_IMAGING: 'Take to Imaging',
  BED_PREPARATION: 'Bed Preparation',
  BED_CLEANING: 'Bed Cleaning',
  MOVE_EQUIPMENT: 'Move Equipment',
  DOCUMENT_DELIVERY: 'Document Delivery',
  OTHER: 'Other Task',
};

/** Reads only the attendant-safe fields the backend sends — never spreads the payload. */
export function normalizeWardAttendantTask(raw: unknown): WardAttendantTask {
  const source = readRecord(raw);
  const taskType = readText(source['taskType'] || 'OTHER').toUpperCase();

  return {
    id: readText(source['id'] || source['_id']),
    taskType,
    taskTypeLabel: ATTENDANT_TASK_TYPE_LABELS[taskType] || ATTENDANT_TASK_TYPE_LABELS['OTHER'],
    title: readText(source['title']),
    instruction: readText(source['instruction']),
    status: readText(source['status'] || 'pending'),
    priority: readText(source['priority'] || 'normal'),
    dueAt: readText(source['dueAt']),
    patientName: readText(source['patientName']),
    bedLabel: readText(source['bedLabel']),
    wardName: readText(source['wardName']),
    fromLocation: readText(source['fromLocation']),
    toLocation: readText(source['toLocation']),
    requestedByName: readText(source['requestedByName']),
  };
}

export function filterWardBedCards(
  cards: WardBedCard[],
  filter: WardHomeFilter,
  myWard = ''
): WardBedCard[] {
  switch (filter) {
    case 'my-ward':
      return myWard ? cards.filter((card) => card.wardName === myWard) : cards;
    case 'occupied':
      return cards.filter((card) => card.statusKey === 'occupied');
    case 'available':
      return cards.filter((card) => card.statusKey === 'available');
    case 'attention':
      return cards.filter((card) => card.needsAttention);
    case 'all':
    default:
      return cards;
  }
}

export interface WardMyPatientCard {
  admissionId: string;
  patientName: string;
  bedLabel: string;
  dueCount: number;
}

/** Unique patients from the current due/overdue/upcoming work list — no extra fetch. */
export function uniquePatientsFromWork(work: WardMyWork): WardMyPatientCard[] {
  const cards = new Map<string, WardMyPatientCard>();

  [...work.overdue, ...work.dueNow, ...work.upcoming].forEach((item) => {
    if (!item.admissionId) {
      return;
    }
    const existing = cards.get(item.admissionId);
    if (existing) {
      existing.dueCount += 1;
      return;
    }
    cards.set(item.admissionId, {
      admissionId: item.admissionId,
      patientName: item.patientName || 'Patient',
      bedLabel: item.bedLabel,
      dueCount: 1,
    });
  });

  return [...cards.values()].sort((left, right) => right.dueCount - left.dueCount);
}

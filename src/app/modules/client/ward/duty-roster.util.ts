export type RosterShiftKey = 'morning' | 'afternoon' | 'evening' | 'night' | 'on_call' | 'custom';

export interface RosterCoverageRow {
  role: string;
  required: number;
  assigned: number;
  open: number;
}

export interface RosterAssignmentLike {
  staffUserId?: unknown;
  staffRole?: string;
  wardId?: unknown;
  roomId?: unknown;
  departmentId?: unknown;
  areaType?: string;
  areaId?: string;
  shift?: string;
  rosterDate?: string | Date;
  startTime?: string;
  endTime?: string;
  status?: string;
  wardLabel?: string;
}

export interface RankedStaff extends Record<string, unknown> {
  availability: string;
  rank: number;
  name?: string;
}

export const ROSTER_SHIFT_TIMES: Record<string, { startTime: string; endTime: string; label: string }> = {
  morning: { startTime: '07:00', endTime: '15:00', label: 'Morning' },
  afternoon: { startTime: '15:00', endTime: '23:00', label: 'Afternoon' },
  evening: { startTime: '15:00', endTime: '23:00', label: 'Afternoon' },
  night: { startTime: '23:00', endTime: '07:00', label: 'Night' },
  on_call: { startTime: '00:00', endTime: '23:59', label: 'On-call' },
  custom: { startTime: '08:00', endTime: '14:00', label: 'Custom' },
};

export const ELIGIBLE_STAFF_PAGE_SIZE = 80;

export const toYmd = (value: string | Date | undefined): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
};

export const staffIdOf = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'object') {
    const record = value as { _id?: unknown };
    return String(record._id || '');
  }
  return String(value);
};

export const assignmentInScope = (
  row: RosterAssignmentLike,
  scope: { areaType?: string; areaId?: string; wardId?: string; roomId?: string; departmentId?: string }
): boolean => {
  if (scope.roomId) return String(row.roomId || '') === String(scope.roomId);
  if (scope.departmentId) return String(row.departmentId || '') === String(scope.departmentId);
  if (scope.wardId) {
    return String(row.wardId || '') === String(scope.wardId) || String(row.areaId || '') === String(scope.wardId);
  }
  if (scope.areaId) return String(row.areaId || row.wardId || '') === String(scope.areaId);
  return true;
};

export const calculateCoverage = (
  assignments: RosterAssignmentLike[],
  requirements: Array<{ role: string; requiredCount: number; shift?: string }>,
  shift: string
): RosterCoverageRow[] => {
  const roles = new Map<string, RosterCoverageRow>();
  for (const req of requirements.filter((item) => !item.shift || item.shift === shift)) {
    roles.set(req.role, {
      role: req.role,
      required: Number(req.requiredCount || 0),
      assigned: 0,
      open: Number(req.requiredCount || 0),
    });
  }
  for (const row of assignments.filter((item) => String(item.shift || '') === shift && item.status !== 'cancelled')) {
    const role = String(row.staffRole || 'Staff');
    const current = roles.get(role) || { role, required: 0, assigned: 0, open: 0 };
    current.assigned += 1;
    current.open = Math.max(0, current.required - current.assigned);
    roles.set(role, current);
  }
  return [...roles.values()];
};

export const coverageTotals = (
  rows: RosterCoverageRow[]
): { required: number; assigned: number; open: number; overstaffed: number; percent: number } => {
  const required = rows.reduce((sum, row) => sum + row.required, 0);
  const assigned = rows.reduce((sum, row) => sum + row.assigned, 0);
  const open = rows.reduce((sum, row) => sum + row.open, 0);
  const overstaffed = Math.max(0, assigned - required);
  return {
    required,
    assigned,
    open,
    overstaffed,
    percent: required ? Math.round((Math.min(assigned, required) / required) * 100) : 0,
  };
};

export const coverageDonutStyle = (totals: { required: number; assigned: number; open: number; overstaffed: number }): string => {
  if (!totals.required && !totals.assigned) {
    return 'conic-gradient(#e2e8f0 0 360deg)';
  }
  const base = Math.max(totals.required, totals.assigned, 1);
  const assignedDeg = (totals.assigned / base) * 360;
  const openDeg = assignedDeg + (totals.open / base) * 360;
  return `conic-gradient(#0f9d9c 0 ${assignedDeg}deg, #f59e0b ${assignedDeg}deg ${openDeg}deg, #cbd5e1 ${openDeg}deg 360deg)`;
};

const parseYmd = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const formatYmd = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const expandBulkDates = (options: {
  from?: string;
  to?: string;
  weekFrom?: string;
  days?: number[];
}): string[] => {
  if (options.from && options.to) {
    const dates: string[] = [];
    const cursor = parseYmd(options.from);
    const end = parseYmd(options.to);
    while (cursor <= end) {
      dates.push(formatYmd(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  if (options.weekFrom && options.days?.length) {
    return options.days.map((offset) => {
      const date = parseYmd(options.weekFrom as string);
      date.setDate(date.getDate() + offset);
      return formatYmd(date);
    });
  }

  return [];
};

export const parseTimeToMinutes = (value: string): number => {
  const [hours, minutes] = String(value || '00:00').split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export const toShiftRange = (startTime: string, endTime: string): { start: number; end: number } => {
  const start = parseTimeToMinutes(startTime);
  let end = parseTimeToMinutes(endTime);
  if (end <= start) end += 24 * 60;
  return { start, end };
};

export const rangesOverlap = (leftStart: string, leftEnd: string, rightStart: string, rightEnd: string): boolean => {
  const left = toShiftRange(leftStart, leftEnd);
  const right = toShiftRange(rightStart, rightEnd);
  return left.start < right.end && right.start < left.end;
};

export const buildStaffAssignmentIndex = (
  assignments: RosterAssignmentLike[]
): Map<string, RosterAssignmentLike[]> => {
  const index = new Map<string, RosterAssignmentLike[]>();
  for (const row of assignments) {
    if (row.status === 'cancelled') continue;
    const id = staffIdOf(row.staffUserId);
    if (!id) continue;
    const current = index.get(id);
    if (current) current.push(row);
    else index.set(id, [row]);
  }
  return index;
};

export const staffAlreadyAssigned = (
  assignments: RosterAssignmentLike[],
  staffUserId: string,
  date: string,
  startTime: string,
  endTime: string
): boolean => {
  return assignments.some((row) => assignmentOverlapsSlot(row, staffUserId, date, startTime, endTime));
};

export const assignmentOverlapsSlot = (
  row: RosterAssignmentLike,
  staffUserId: string,
  date: string,
  startTime: string,
  endTime: string
): boolean => {
  if (staffIdOf(row.staffUserId) !== staffUserId) return false;
  if (toYmd(row.rosterDate) !== date) return false;
  if (row.status === 'cancelled') return false;
  return rangesOverlap(String(row.startTime || ''), String(row.endTime || ''), startTime, endTime);
};

export const rankEligibleStaff = (
  staff: Array<Record<string, unknown>>,
  assignments: RosterAssignmentLike[],
  context: { role: string; date: string; startTime: string; endTime: string; wardId?: string }
): RankedStaff[] => {
  const index = buildStaffAssignmentIndex(assignments);
  return staff
    .map((person) => rankOneStaff(person, index.get(String(person['_id'] || '')) || [], context))
    .sort((left, right) => right.rank - left.rank || (left.name || '').localeCompare(right.name || ''));
};

const rankOneStaff = (
  person: Record<string, unknown>,
  ownAssignments: RosterAssignmentLike[],
  context: { role: string; date: string; startTime: string; endTime: string; wardId?: string }
): RankedStaff => {
  const role = String(person['role'] || '');
  const inactive = ['inactive', 'disabled'].includes(String(person['status'] || '').toLowerCase());
  const busy = ownAssignments.some((row) =>
    assignmentOverlapsSlot(row, String(person['_id'] || ''), context.date, context.startTime, context.endTime)
  );
  const roleMatch = !context.role || role.toLowerCase().includes(context.role.toLowerCase());
  const sameArea = context.wardId
    ? ownAssignments.some((row) => String(row.wardId || row.areaId || '') === context.wardId)
    : false;

  let availability = 'Available';
  if (inactive) availability = 'Unavailable';
  else if (busy) availability = 'Already Assigned';
  else if (!roleMatch) availability = 'Other role';

  let rank = 0;
  if (roleMatch) rank += 100;
  if (availability === 'Available') rank += 50;
  if (sameArea) rank += 20;
  if (busy) rank -= 40;
  if (inactive) rank -= 100;
  rank -= ownAssignments.length;

  return { ...person, availability, rank, name: String(person['name'] || '') };
};

export const filterRankedStaff = (
  staff: RankedStaff[],
  options: { search?: string; role?: string; hideIncompatible?: boolean; limit?: number }
): RankedStaff[] => {
  const query = String(options.search || '').trim().toLowerCase();
  const role = String(options.role || '').trim().toLowerCase();
  const filtered = staff.filter((person) => {
    if (options.hideIncompatible && (person.availability === 'Unavailable' || person.availability === 'Other role')) {
      return false;
    }
    if (role && !String(person['role'] || '').toLowerCase().includes(role) && person.availability === 'Other role') {
      return false;
    }
    if (!query) return true;
    const haystack = [person['name'], person['role'], person['employeeNo'], person['department'], person.availability]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
  const limit = options.limit ?? ELIGIBLE_STAFF_PAGE_SIZE;
  return filtered.slice(0, limit);
};

export const shouldRunBulkPreview = (reason: 'staff-toggle' | 'review' | 'open'): boolean => reason === 'review';

export const initialExpandedTreeIds = (): string[] => ['hospital', 'wards'];

export const staffDisplayNo = (person: Record<string, unknown>): string => {
  return String(person['employeeNo'] || person['employeeCode'] || '').trim();
};

export const shouldReloadRosterBootstrap = (reason: 'date' | 'tree' | 'shift' | 'staff-toggle' | 'open-assign'): boolean =>
  reason === 'date';

export const weekDatesFrom = (weekFrom: string): string[] => {
  return Array.from({ length: 7 }, (_, index) => {
    const date = parseYmd(weekFrom);
    date.setDate(date.getDate() + index);
    return formatYmd(date);
  });
};

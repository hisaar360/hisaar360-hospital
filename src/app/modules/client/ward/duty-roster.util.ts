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
}

export const ROSTER_SHIFT_TIMES: Record<string, { startTime: string; endTime: string; label: string }> = {
  morning: { startTime: '07:00', endTime: '15:00', label: 'Morning' },
  afternoon: { startTime: '15:00', endTime: '23:00', label: 'Afternoon' },
  evening: { startTime: '15:00', endTime: '23:00', label: 'Afternoon' },
  night: { startTime: '23:00', endTime: '07:00', label: 'Night' },
  on_call: { startTime: '00:00', endTime: '23:59', label: 'On-call' },
  custom: { startTime: '08:00', endTime: '14:00', label: 'Custom' },
};

export const toYmd = (value: string | Date | undefined): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
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

export const rankEligibleStaff = (
  staff: Array<Record<string, unknown>>,
  assignments: RosterAssignmentLike[],
  context: { role: string; date: string; startTime: string; endTime: string; wardId?: string }
): Array<Record<string, unknown> & { availability: string; rank: number; name?: string }> => {
  return staff
    .map((person) => {
      const id = String(person['_id'] || '');
      const role = String(person['role'] || '');
      const inactive = ['inactive', 'disabled'].includes(String(person['status'] || '').toLowerCase());
      const busy = staffAlreadyAssigned(assignments, id, context.date, context.startTime, context.endTime);
      const roleMatch = !context.role || role.toLowerCase().includes(context.role.toLowerCase());
      const assignmentCount = assignments.filter((row) => {
        const staffId = String((row.staffUserId as { _id?: string } | undefined)?._id || row.staffUserId || '');
        return staffId === id && row.status !== 'cancelled';
      }).length;
      const sameArea = context.wardId
        ? assignments.some((row) => {
            const staffId = String((row.staffUserId as { _id?: string } | undefined)?._id || row.staffUserId || '');
            return staffId === id && String(row.wardId || row.areaId || '') === context.wardId;
          })
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
      rank -= assignmentCount;

      return { ...person, availability, rank, name: String(person['name'] || '') };
    })
    .sort((left, right) => right.rank - left.rank || (left.name || '').localeCompare(right.name || ''));
};

export const staffAlreadyAssigned = (
  assignments: RosterAssignmentLike[],
  staffUserId: string,
  date: string,
  startTime: string,
  endTime: string
): boolean => {
  return assignments.some((row) => {
    if (String((row.staffUserId as { _id?: string })?._id || row.staffUserId) !== staffUserId) return false;
    if (toYmd(row.rosterDate) !== date) return false;
    if (row.status === 'cancelled') return false;
    return String(row.startTime) === startTime && String(row.endTime) === endTime;
  });
};

/**
 * Role-based Ward & Nursing navigation model. Backend RBAC stays authoritative —
 * this only decides which links a role is shown, so it is a pure function we can test.
 */
import {
  isDoctorRole,
  isNurseRole,
  isWardAdminRole,
  isWardAttendantRole,
  isWardReceptionRole,
} from '../../auth/access-control';

export interface WardNavItem {
  label: string;
  route: string;
}

export interface WardNavSection {
  key: string;
  /** Rendered as a section header; empty for the primary (unlabelled) block. */
  label: string;
  collapsible: boolean;
  items: WardNavItem[];
}

export interface WardNavContext {
  role: string;
  permissions: string[];
  /** ward.read (or wildcard) — the menu itself is hidden without it. */
  canViewWard: boolean;
  canViewAllRoutes?: boolean;
  /** Full ward admin / operations surface. */
  showWardOpsMenu?: boolean;
  /** Management collapsible — ward.management.read / Ward Admin / *. */
  canViewManagement?: boolean;
  canViewAdmissions?: boolean;
  canViewRoster?: boolean;
  canViewOperations?: boolean;
  canViewMaternity?: boolean;
}

const WARD_HOME: WardNavItem = { label: 'Ward Home', route: '/ward/home' };
const MY_PATIENTS: WardNavItem = { label: 'My Patients', route: '/ward/patient-list' };
const PATIENTS: WardNavItem = { label: 'Patients', route: '/ward/patient-list' };
const ADMISSIONS: WardNavItem = { label: 'Admissions', route: '/ward/admissions' };
const BEDS: WardNavItem = { label: 'Beds', route: '/ward/bed-management' };
const MY_WORK: WardNavItem = { label: 'My Work', route: '/ward/my-work' };
const SHIFT_HANDOVER: WardNavItem = { label: 'Shift Handover', route: '/ward/shift-handover' };

const primary = (items: WardNavItem[]): WardNavSection => ({
  key: 'primary',
  label: '',
  collapsible: false,
  items,
});

const tasksAndHandover = (): WardNavSection => ({
  key: 'tasks',
  label: 'Tasks & Handover',
  collapsible: false,
  items: [MY_WORK, SHIFT_HANDOVER],
});

const maternity = (): WardNavSection => ({
  key: 'maternity',
  label: 'Maternity / Newborn',
  collapsible: false,
  items: [
    { label: 'Nursery / Newborn', route: '/ward/nursery' },
    { label: 'Birth Records', route: '/ward/nursery/birth-records' },
  ],
});

const management = (context: WardNavContext): WardNavSection => ({
  key: 'management',
  label: 'Management',
  collapsible: true,
  items: [
    { label: 'Dashboard', route: '/ward/dashboard' },
    BEDS,
    ...(context.canViewOperations ? [{ label: 'Operation Calendar', route: '/operations' }] : []),
    ...(context.canViewRoster ? [{ label: 'Duty Roster', route: '/ward/duty-roster' }] : []),
    { label: 'Ward Inventory', route: '/ward/inventory' },
    { label: 'Nurses & Staff', route: '/ward/nurses-staff' },
    { label: 'Reports', route: '/ward/reports' },
    { label: 'Ward Notes', route: '/ward-admin' },
  ],
});

/**
 * Builds the ward menu for the current role. Clinical charting pages (vitals, MAR,
 * drips, I/O, orders, nursing care) are intentionally absent — they stay reachable
 * from the patient workspace.
 */
export function buildWardNavSections(context: WardNavContext): WardNavSection[] {
  if (!context.canViewWard) {
    return [];
  }

  const { role, permissions } = context;
  const isWardAdmin = Boolean(context.canViewAllRoutes) || isWardAdminRole(role) || Boolean(context.showWardOpsMenu);

  if (isWardAttendantRole(role) && !isWardAdmin) {
    return [primary([{ label: 'My Tasks', route: '/ward/tasks' }])];
  }

  if (isDoctorRole(role) && !isWardAdmin) {
    return [primary([{ label: 'My Inpatients', route: '/ward/patient-list' }])];
  }

  const sections: WardNavSection[] = [];

  if (isNurseRole(role) && !isWardAdmin) {
    sections.push(primary([WARD_HOME, MY_PATIENTS]), tasksAndHandover());
  } else if (isWardAdmin) {
    sections.push(primary([WARD_HOME, ADMISSIONS, PATIENTS]), tasksAndHandover());
    if (context.canViewManagement) {
      sections.push(management(context));
    }
  } else if (isWardReceptionRole(role, permissions)) {
    sections.push(primary([ADMISSIONS, PATIENTS, BEDS]));
  } else {
    sections.push(
      primary([WARD_HOME, PATIENTS, ...(context.canViewAdmissions ? [ADMISSIONS] : [])]),
      tasksAndHandover()
    );
  }

  if (context.canViewMaternity) {
    sections.push(maternity());
  }

  return sections.filter((section) => section.items.length > 0);
}

/**
 * Role-based Ward navigation. Backend RBAC stays authoritative —
 * this only decides which links a role is shown (pure function, unit-tested).
 *
 * Product intent: simple IPD desk — Home, Admissions, Patients, Beds.
 * Nursery / Birth Records stay when maternity is enabled.
 * Clinical entry lives on the patient profile. Roster / management stay
 * reachable by URL but are not shown in the menu.
 */
import {
  isDoctorRole,
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
  /** Kept for callers; Management block is no longer shown in the slim menu. */
  canViewManagement?: boolean;
  canViewAdmissions?: boolean;
  canViewRoster?: boolean;
  canViewOperations?: boolean;
  /** When true, show Nursery / Birth Records under Ward. */
  canViewMaternity?: boolean;
}

const WARD_HOME: WardNavItem = { label: 'Ward Home', route: '/ward/home' };
const PATIENTS: WardNavItem = { label: 'Patients', route: '/ward/patient-list' };
const ADMISSIONS: WardNavItem = { label: 'Admissions', route: '/ward/admissions' };
const BEDS: WardNavItem = { label: 'Beds', route: '/ward/bed-management' };

const CORE_DESK: WardNavItem[] = [WARD_HOME, ADMISSIONS, PATIENTS, BEDS];

const primary = (items: WardNavItem[]): WardNavSection => ({
  key: 'primary',
  label: '',
  collapsible: false,
  items,
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

/**
 * Builds the slim ward menu for the current role. Clinical charting pages stay
 * reachable from the patient workspace, not the sidebar.
 */
export function buildWardNavSections(context: WardNavContext): WardNavSection[] {
  if (!context.canViewWard) {
    return [];
  }

  const { role, permissions } = context;
  const isWardAdmin =
    Boolean(context.canViewAllRoutes) || isWardAdminRole(role) || Boolean(context.showWardOpsMenu);

  if (isWardAttendantRole(role) && !isWardAdmin) {
    return [primary([{ label: 'My Tasks', route: '/ward/tasks' }])];
  }

  if (isDoctorRole(role) && !isWardAdmin) {
    return [primary([{ label: 'My Inpatients', route: '/ward/patient-list' }])];
  }

  const sections: WardNavSection[] = [];

  if (isWardReceptionRole(role, permissions)) {
    sections.push(primary([ADMISSIONS, PATIENTS, BEDS]));
  } else if (isWardAdmin) {
    sections.push(primary(CORE_DESK));
  } else {
    // Default / legacy Nurse & other ward.read users: same core desk.
    const defaultPrimary: WardNavItem[] = [
      WARD_HOME,
      ...(context.canViewAdmissions ? [ADMISSIONS] : []),
      PATIENTS,
      BEDS,
    ];
    sections.push(primary(defaultPrimary));
  }

  if (context.canViewMaternity) {
    sections.push(maternity());
  }

  return sections.filter((section) => section.items.length > 0);
}

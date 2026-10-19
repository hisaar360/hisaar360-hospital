/**
 * Role-based Ward navigation. Backend RBAC stays authoritative —
 * this only decides which links a role is shown (pure function, unit-tested).
 *
 * Product intent: Ward Admin–centric IPD desk. Nurses do not log in to chart;
 * clinical entry is done by Ward Admin (or custom roles with permissions).
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
  /** Management collapsible — ward.management.read / Ward Admin / *. */
  canViewManagement?: boolean;
  canViewAdmissions?: boolean;
  canViewRoster?: boolean;
  canViewOperations?: boolean;
  canViewMaternity?: boolean;
}

const WARD_HOME: WardNavItem = { label: 'Ward Home', route: '/ward/home' };
const PATIENTS: WardNavItem = { label: 'Patients', route: '/ward/patient-list' };
const ADMISSIONS: WardNavItem = { label: 'Admissions', route: '/ward/admissions' };
const BEDS: WardNavItem = { label: 'Beds', route: '/ward/bed-management' };
const DUTY_ROSTER: WardNavItem = { label: 'Duty Roster', route: '/ward/duty-roster' };

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

const management = (context: WardNavContext): WardNavSection => ({
  key: 'management',
  label: 'Management',
  collapsible: true,
  items: [
    { label: 'Dashboard', route: '/ward/dashboard' },
    BEDS,
    ...(context.canViewOperations ? [{ label: 'Operation Calendar', route: '/operations' }] : []),
    { label: 'Ward Inventory', route: '/ward/inventory' },
    { label: 'Staff Directory', route: '/ward/nurses-staff' },
    { label: 'Reports', route: '/ward/reports' },
    { label: 'Forms & Charts', route: '/hospital-forms' },
    { label: 'Ward Notes', route: '/ward-admin' },
  ],
});

/**
 * Builds the ward menu for the current role. Clinical charting pages (vitals, MAR,
 * drips, I/O, orders) stay reachable from the patient workspace, not the sidebar.
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

  if (isWardAdmin) {
    const adminPrimary: WardNavItem[] = [WARD_HOME, ADMISSIONS, PATIENTS];
    if (context.canViewRoster) {
      adminPrimary.push(DUTY_ROSTER);
    }
    sections.push(primary(adminPrimary));
    if (context.canViewManagement) {
      sections.push(management(context));
    }
  } else if (isWardReceptionRole(role, permissions)) {
    sections.push(primary([ADMISSIONS, PATIENTS, BEDS]));
  } else {
    // Default / legacy Nurse & other ward.read users: same admin-style desk, no My Work.
    const defaultPrimary: WardNavItem[] = [
      WARD_HOME,
      PATIENTS,
      ...(context.canViewAdmissions ? [ADMISSIONS] : []),
    ];
    if (context.canViewRoster) {
      defaultPrimary.push(DUTY_ROSTER);
    }
    sections.push(primary(defaultPrimary));
    if (context.canViewManagement) {
      sections.push(management(context));
    }
  }

  if (context.canViewMaternity) {
    sections.push(maternity());
  }

  return sections.filter((section) => section.items.length > 0);
}

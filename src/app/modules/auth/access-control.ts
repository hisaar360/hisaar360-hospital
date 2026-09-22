import { isCurrentLaboratoryEdition } from './product-edition';

export type AccessRequirement =
  | string[]
  | {
      any?: string[];
      all?: string[];
    };

type RouteAccess = {
  path: string;
  access: AccessRequirement;
};

const DEFAULT_ROUTE_ACCESS: RouteAccess[] = [
  { path: '/dashboard', access: ['hospital_dashboard.read'] },
  { path: '/accounts/dashboard', access: ['accounts.read', 'accounts.reports.read'] },
  { path: '/laboratory', access: ['lab_orders.read'] },
  { path: '/laboratory/catalog', access: ['lab_tests.read'] },
  { path: '/pharmacy', access: ['products.read'] },
  { path: '/appointments', access: ['appointments.read'] },
  { path: '/patients/all-patients', access: ['patients.read'] },
  {
    path: '/patients/add-patient',
    access: ['patients.create', 'patients.update'],
  },
  { path: '/payments/invoices', access: ['bills.read', 'encounters.read'] },
  { path: '/payments', access: ['bills.read', 'encounters.read'] },
  { path: '/payments/ledger', access: ['encounters.read', 'bills.read'] },
  {
    path: '/payments/addpayment',
    access: ['bills.create', 'bills.update_payment'],
  },
  { path: '/departments', access: ['departments.read'] },
  { path: '/all-doctors', access: ['doctors.read'] },
  {
    path: '/clinical-records',
    access: ['patients_history.read', 'patients_history.create'],
  },
  { path: '/pharmacy/purchases', access: ['purchases.read'] },
  {
    path: '/prescriptions',
    access: ['prescriptions.read', 'prescriptions.create'],
  },
  {
    path: '/pos-reports',
    access: ['reports.read'],
  },
  {
    path: '/room-allotment',
    access: ['rooms.read', 'rooms.create', 'rooms.update'],
  },
  {
    path: '/room-allotment/alloted-rooms',
    access: ['room_allotments.read'],
  },
  {
    path: '/room-allotment/add-alloted-rooms',
    access: {
      all: ['room_allotments.create', 'rooms.read', 'patients.read'],
    },
  },
  {
    path: '/laboratory/create-order',
    access: ['lab_orders.create'],
  },
  {
    path: '/laboratory/catalog',
    access: ['lab_tests.read'],
  },
  {
    path: '/laboratory/settings',
    access: ['lab_tests.update', 'lab_orders.update'],
  },
  {
    path: '/laboratory/created-reports',
    access: ['lab_orders.read'],
  },
  {
    path: '/laboratory/records',
    access: ['lab_orders.read'],
  },
  {
    path: '/ward/home',
    access: ['ward.read'],
  },
  {
    path: '/ward/my-work',
    access: ['ward.read'],
  },
  {
    path: '/ward/tasks',
    access: ['ward.read', 'ward.update'],
  },
  {
    path: '/ward/bed-management',
    access: ['ward.read'],
  },
  {
    path: '/ward/dashboard',
    access: ['ward.read'],
  },
  {
    path: '/ward-admin',
    access: ['ward.read'],
  },
  { path: '/users', access: ['users.read'] },
  { path: '/hospitals', access: ['hospitals.read'] },
  { path: '/roles', access: ['roles.read'] },
  { path: '/settings', access: [] },
];

export const normalizeAccessKey = (value: string) =>
  value.trim().replace(/[\s_-]/g, '').toLowerCase();

export const readStoredRole = (): string => {
  try {
    return String(localStorage.getItem('role') || '');
  } catch {
    return '';
  }
};

export const isDoctorRole = (role: string): boolean =>
  normalizeAccessKey(role) === 'doctor';

export const isWardAdminRole = (role: string): boolean => {
  const normalized = normalizeAccessKey(role);
  return (
    normalized === 'wardadmin' ||
    normalized === 'wardsupervisor' ||
    normalized === 'wardincharge' ||
    normalized === 'nurseincharge' ||
    normalized === 'wardmanager' ||
    /^ward.*(admin|supervisor|incharge|manager)$/.test(normalized) ||
    /^(admin|supervisor|incharge).*ward$/.test(normalized)
  );
};

export const isNurseRole = (role: string): boolean => {
  const normalized = normalizeAccessKey(role);
  return normalized === 'nurse' || normalized === 'staffnurse';
};

/** Frontline ward care roles (nurse / ward boy / attendant) — simplified care menu. */
export const isWardCareRole = (role: string): boolean => {
  const normalized = normalizeAccessKey(role);
  return (
    isNurseRole(role) ||
    normalized === 'wardboy' ||
    normalized === 'wardattendant' ||
    normalized === 'attendant' ||
    normalized === 'nursingassistant'
  );
};

/** Ward attendant / ward boy — transport & housekeeping tasks only, no clinical data. */
export const isWardAttendantRole = (role: string): boolean => {
  const normalized = normalizeAccessKey(role);
  return (
    normalized === 'wardboy' ||
    normalized === 'wardattendant' ||
    normalized === 'attendant' ||
    normalized === 'wardhelper' ||
    normalized === 'patientattendant'
  );
};

export const isReceptionRole = (role: string): boolean => {
  const normalized = normalizeAccessKey(role);
  return normalized === 'receptionist' || normalized === 'reception';
};

export const sanitizePermissions = (permissions: unknown): string[] => {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions
    .filter((permission): permission is string => typeof permission === 'string')
    .map((permission) => permission.trim())
    .filter(Boolean);
};

/** Mirror backend OPD/Lab leakage strip for ward operational role names. */
const WARD_OPD_LAB_FORBIDDEN_PERMISSIONS = new Set([
  'prescriptions.create',
  'prescriptions.update',
  'prescriptions.delete',
  'prescriptions.read',
  'lab_orders.read',
  'lab_orders.create',
  'lab_orders.update',
  'lab_tests.read',
  'lab_tests.create',
  'lab_tests.update',
  'lab_results.verify',
  'appointments.create',
  'appointments.read',
  'appointments.update',
  'appointments.delete',
  'appointments.status.update',
  'patients_history.read',
  'patients_history.create',
  'patients_history.update',
  'patients_history.delete',
]);

const NURSE_OPD_LAB_FORBIDDEN_PERMISSIONS = new Set(
  [...WARD_OPD_LAB_FORBIDDEN_PERMISSIONS].filter((p) => p !== 'prescriptions.read')
);

export const stripClientWardOpdLabPermissions = (
  role: string,
  permissions: string[]
): string[] => {
  if (!permissions.length || permissions.includes('*')) {
    return permissions;
  }

  if (isWardAdminRole(role) || isWardAttendantRole(role)) {
    return permissions.filter((p) => !WARD_OPD_LAB_FORBIDDEN_PERMISSIONS.has(p));
  }
  if (isNurseRole(role) || isWardCareRole(role)) {
    return permissions.filter((p) => !NURSE_OPD_LAB_FORBIDDEN_PERMISSIONS.has(p));
  }

  return permissions;
};

export const readStoredPermissions = (): string[] => {
  try {
    const permissions = sanitizePermissions(
      JSON.parse(localStorage.getItem('permissions') || '[]')
    );
    return stripClientWardOpdLabPermissions(readStoredRole(), permissions);
  } catch {
    localStorage.removeItem('permissions');
    return [];
  }
};

export const hasRouteAccess = (
  allowedAccess: AccessRequirement,
  permissions: string[]
): boolean => {
  const normalizedPermissions = new Set(
    permissions.map((permission) => normalizeAccessKey(permission))
  );

  if (permissions.includes('*') || normalizedPermissions.has('*')) {
    return true;
  }

  const anyAccess = Array.isArray(allowedAccess) ? allowedAccess : allowedAccess.any || [];
  const allAccess = Array.isArray(allowedAccess) ? [] : allowedAccess.all || [];
  const hasAccessItem = (allowedItem: string) => {
    const normalizedAllowedItem = normalizeAccessKey(allowedItem);
    return normalizedPermissions.has(normalizedAllowedItem);
  };

  const passesAny = anyAccess.length === 0 || anyAccess.some(hasAccessItem);
  const passesAll = allAccess.every(hasAccessItem);

  return passesAny && passesAll;
};

export const hasPermission = (
  permission: string,
  permissions: string[] = readStoredPermissions()
): boolean => hasRouteAccess([permission], permissions);

/** Full Ward Admin / Operations menu (roster, inventory, reports, nursery, dashboard). */
export const canViewWardAdminMenu = (
  role = readStoredRole(),
  permissions: string[] = readStoredPermissions()
): boolean => {
  if (permissions.includes('*')) {
    return true;
  }
  if (isWardAdminRole(role)) {
    return true;
  }
  if (isWardCareRole(role)) {
    return false;
  }
  return (
    hasPermission('ward.roster.read', permissions) ||
    hasPermission('ward.create', permissions) ||
    hasPermission('hospitals.update', permissions)
  );
};

/**
 * Ward sidebar "Management" collapsible (dashboard, beds, inventory, reports, etc.).
 * Menu visibility only — clinical/bed paths stay reachable via other nav when needed.
 */
export const canViewWardManagementMenu = (
  role = readStoredRole(),
  permissions: string[] = readStoredPermissions()
): boolean => {
  if (permissions.includes('*')) {
    return true;
  }
  if (isWardAdminRole(role)) {
    return true;
  }
  return hasPermission('ward.management.read', permissions);
};

/**
 * Reception / admission desk staff: they book admissions and beds but do not own
 * the ward management surface.
 */
export const isWardReceptionRole = (
  role = readStoredRole(),
  permissions: string[] = readStoredPermissions()
): boolean => {
  if (isWardAdminRole(role) || isWardCareRole(role) || isDoctorRole(role)) {
    return false;
  }
  if (canViewWardAdminMenu(role, permissions)) {
    return false;
  }
  return (
    hasPermission('ward.admissions.create', permissions) ||
    hasPermission('room_allotments.create', permissions)
  );
};

/** Ward Admin / Supervisor / Nurse / Attendant / Ward Reception — work inside Ward, not OPD/Lab shells. */
export const isWardOperationalRole = (
  role = readStoredRole(),
  permissions: string[] = readStoredPermissions()
): boolean =>
  isWardAdminRole(role) ||
  isNurseRole(role) ||
  isWardCareRole(role) ||
  isWardAttendantRole(role) ||
  isWardReceptionRole(role, permissions);

/** OPD / Laboratory SPA shells that ward operational roles must never open via URL. */
const WARD_DENIED_SHELL_PREFIXES = [
  '/laboratory',
  '/prescriptions',
  '/appointments',
  '/clinical-records',
  '/all-doctors',
  '/doctors',
] as const;

export const isWardDeniedShellPath = (urlPath: string): boolean => {
  const path = String(urlPath || '').split('?')[0].replace(/\/+$/, '') || '/';
  return WARD_DENIED_SHELL_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
};

/** Single source of truth for where a ward user lands after login. */
export const resolveWardLandingRoute = (
  role = readStoredRole(),
  permissions: string[] = readStoredPermissions()
): string => {
  if (isWardAttendantRole(role)) {
    return '/ward/tasks';
  }
  if (isNurseRole(role)) {
    return '/ward/my-work';
  }
  if (isDoctorRole(role)) {
    return '/ward/patient-list';
  }
  if (isWardAdminRole(role)) {
    return '/ward/home';
  }
  if (isWardReceptionRole(role, permissions)) {
    return '/ward/admissions';
  }
  return '/ward/home';
};

export const resolveDefaultRoute = (
  permissions: string[],
  role = readStoredRole()
): string => {
  if (isCurrentLaboratoryEdition()) {
    if (hasRouteAccess(['lab_orders.read'], permissions) || permissions.includes('*')) {
      return '/laboratory';
    }

    if (hasRouteAccess(['lab_tests.read'], permissions)) {
      return '/laboratory/catalog';
    }

    if (hasRouteAccess(['accounts.read', 'accounts.reports.read'], permissions)) {
      return '/accounts/dashboard';
    }

    if (hasRouteAccess(['patients.read'], permissions)) {
      return '/patients/all-patients';
    }

    return '/settings';
  }

  if (isDoctorRole(role)) {
    return '/prescriptions';
  }

  if (isWardAdminRole(role) || isWardCareRole(role) || isNurseRole(role)) {
    return resolveWardLandingRoute(role, permissions);
  }

  if (isReceptionRole(role)) {
    return '/appointments';
  }

  const matchedRoute = DEFAULT_ROUTE_ACCESS.find((routeAccess) =>
    hasRouteAccess(routeAccess.access, permissions)
  )?.path;

  if (matchedRoute) {
    return matchedRoute;
  }

  // Authenticated users with no matching landing route should stay in-app.
  if (permissions.length > 0) {
    return '/settings';
  }

  return '/login/access';
};

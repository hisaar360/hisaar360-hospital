import { isLaboratoryPlan, readStoredProductEdition, resolveProductEdition } from './product-edition';

export type HospitalModuleKey = 'pharmacy' | 'laboratory' | 'ward' | 'clinical';

export type HospitalEnabledModules = Record<HospitalModuleKey, boolean>;

export const DEFAULT_HOSPITAL_MODULES: HospitalEnabledModules = {
  pharmacy: true,
  laboratory: true,
  ward: true,
  clinical: true,
};

const PHARMACY_ROUTE_PREFIXES = ['/pharmacy', '/pos-reports'];
const LABORATORY_ROUTE_PREFIXES = ['/laboratory'];
const WARD_ROUTE_PREFIXES = ['/ward', '/room-allotment', '/ward-admin'];
const CLINICAL_ROUTE_PREFIXES = [
  '/doctor-dashboard',
  '/doctors',
  '/all-doctors',
  '/add-doctors',
  '/doctors-profile',
  '/doctors-schedule',
  '/doctorschedule',
  '/appointments',
  '/prescriptions',
  '/clinical-records',
  '/departments',
  '/dashboard',
];

const PHARMACY_API_PREFIXES = [
  '/products',
  '/customers',
  '/suppliers',
  '/categories',
  '/inventory',
  '/stock-movements',
  '/sales',
  '/returns',
  '/purchases',
  '/transfers',
  '/register-sessions',
  '/reports',
  '/expenses',
  '/payments',
];

const WARD_API_PREFIXES = ['/ward', '/rooms', '/room-allotments', '/hospital-wards'];

const CLINICAL_API_PREFIXES = [
  '/doctors',
  '/appointments',
  '/prescriptions',
  '/departments',
  '/patient-history',
  '/hospital-dashboard',
];

export const normalizeHospitalModules = (
  value?: Partial<HospitalEnabledModules> | null,
  editionSource?: { subscriptionPlan?: string | null; productEdition?: string | null } | null
): HospitalEnabledModules => {
  const edition =
    editionSource?.productEdition ||
    resolveProductEdition({
      subscriptionPlan: editionSource?.subscriptionPlan,
      productEdition: editionSource?.productEdition,
    });

  const defaults =
    edition === 'laboratory'
      ? { pharmacy: false, laboratory: true, ward: false, clinical: false }
      : { ...DEFAULT_HOSPITAL_MODULES };

  return {
    pharmacy: value?.pharmacy ?? defaults.pharmacy,
    laboratory: value?.laboratory ?? defaults.laboratory,
    ward: value?.ward ?? defaults.ward,
    clinical: value?.clinical ?? defaults.clinical,
  };
};

export const readStoredHospitalModuleEnforcement = (): boolean => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null') as {
      hospital?: { modulesEnforced?: boolean | null } | null;
    } | null;

    return Boolean(user?.hospital?.modulesEnforced);
  } catch {
    return false;
  }
};

export const readStoredHospitalModules = (): HospitalEnabledModules => {
  if (!readStoredHospitalModuleEnforcement()) {
    return { ...DEFAULT_HOSPITAL_MODULES };
  }

  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null') as {
      subscriptionPlan?: string | null;
      productEdition?: string | null;
      hospital?: {
        subscriptionPlan?: string | null;
        productEdition?: string | null;
        enabledModules?: Partial<HospitalEnabledModules> | null;
        modulesEnforced?: boolean | null;
      } | null;
    } | null;

    if (!user) {
      return { ...DEFAULT_HOSPITAL_MODULES };
    }

    return normalizeHospitalModules(user.hospital?.enabledModules, {
      subscriptionPlan: user.hospital?.subscriptionPlan || user.subscriptionPlan,
      productEdition: user.hospital?.productEdition || user.productEdition || readStoredProductEdition(),
    });
  } catch {
    return { ...DEFAULT_HOSPITAL_MODULES };
  }
};

export const isPharmacyModuleEnabled = (): boolean => readStoredHospitalModules().pharmacy;
export const isLaboratoryModuleEnabled = (): boolean => readStoredHospitalModules().laboratory;
export const isWardModuleEnabled = (): boolean => readStoredHospitalModules().ward;
export const isClinicalModuleEnabled = (): boolean => readStoredHospitalModules().clinical;

const normalizeRoleKey = (value: string | null | undefined): string =>
  String(value || '')
    .trim()
    .replace(/[\s_-]/g, '')
    .toLowerCase();

const EXPLICIT_ROLE_MODULE_KEYS: Partial<Record<string, HospitalModuleKey>> = {
  pharmacy: 'pharmacy',
  pathologist: 'laboratory',
  laboratoryadmin: 'laboratory',
  laboratory: 'laboratory',
  labreceptionist: 'laboratory',
  labtechnician: 'laboratory',
  wardadmin: 'ward',
  nurse: 'ward',
  doctor: 'clinical',
  receptionist: 'clinical',
};

export const resolveRoleModuleKey = (
  role: { code?: string | null; name?: string | null } | null | undefined,
): HospitalModuleKey | null => {
  if (!role) {
    return null;
  }

  const byCode = EXPLICIT_ROLE_MODULE_KEYS[normalizeRoleKey(role.code)];
  if (byCode) {
    return byCode;
  }

  return EXPLICIT_ROLE_MODULE_KEYS[normalizeRoleKey(role.name)] || null;
};

export const isRoleAllowedByHospitalModules = (
  role: { code?: string | null; name?: string | null },
  modules: HospitalEnabledModules = readStoredHospitalModules(),
  modulesEnforced = readStoredHospitalModuleEnforcement(),
): boolean => {
  if (!modulesEnforced) {
    return true;
  }

  const moduleKey = resolveRoleModuleKey(role);
  if (!moduleKey) {
    return true;
  }

  return Boolean(modules[moduleKey]);
};

const pathMatchesPrefix = (path: string, prefixes: string[]): boolean =>
  prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

const isRootDashboardPath = (path: string): boolean => path === '' || path === '/';

export const resolveBlockedModuleForRoute = (path: string): HospitalModuleKey | null => {
  if (!readStoredHospitalModuleEnforcement()) {
    return null;
  }

  const modules = readStoredHospitalModules();
  const normalized = String(path || '').split('?')[0] || '/';

  if (!modules.clinical && isRootDashboardPath(normalized)) {
    return 'clinical';
  }

  if (!modules.pharmacy && pathMatchesPrefix(normalized, PHARMACY_ROUTE_PREFIXES)) {
    return 'pharmacy';
  }

  if (!modules.laboratory && pathMatchesPrefix(normalized, LABORATORY_ROUTE_PREFIXES)) {
    return 'laboratory';
  }

  if (!modules.ward && pathMatchesPrefix(normalized, WARD_ROUTE_PREFIXES)) {
    return 'ward';
  }

  if (!modules.clinical && pathMatchesPrefix(normalized, CLINICAL_ROUTE_PREFIXES)) {
    return 'clinical';
  }

  return null;
};

export const resolveBlockedModuleForApiPath = (path: string): HospitalModuleKey | null => {
  if (!readStoredHospitalModuleEnforcement()) {
    return null;
  }

  const modules = readStoredHospitalModules();
  const normalized = String(path || '').split('?')[0] || '/';

  if (!modules.pharmacy && pathMatchesPrefix(normalized, PHARMACY_API_PREFIXES)) {
    return 'pharmacy';
  }

  if (!modules.laboratory && (normalized === '/laboratory' || normalized.startsWith('/laboratory/'))) {
    return 'laboratory';
  }

  if (!modules.ward && pathMatchesPrefix(normalized, WARD_API_PREFIXES)) {
    return 'ward';
  }

  if (!modules.clinical && pathMatchesPrefix(normalized, CLINICAL_API_PREFIXES)) {
    return 'clinical';
  }

  return null;
};

export const isHospitalModuleRouteAllowed = (path: string): boolean =>
  !resolveBlockedModuleForRoute(path);

const PHARMACY_ONLY_PLAN_ALIASES = new Set(['pharmacy-only', 'pharmacy_only', 'pharmacyonly']);

export const modulesForSubscriptionPlan = (plan: string): HospitalEnabledModules => {
  const key = normalizePlan(plan);

  if (isLaboratoryPlan(plan)) {
    return { pharmacy: false, laboratory: true, ward: false, clinical: false };
  }

  if (PHARMACY_ONLY_PLAN_ALIASES.has(key)) {
    return { pharmacy: true, laboratory: false, ward: false, clinical: false };
  }

  return { ...DEFAULT_HOSPITAL_MODULES };
};

const normalizePlan = (value: string): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

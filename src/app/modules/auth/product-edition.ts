export type ProductEdition = 'hospital' | 'laboratory';

const LABORATORY_PLAN_ALIASES = new Set([
  'laboratory',
  'lab',
  'lab-only',
  'lab_only',
  'labonly',
  'pathology',
]);

const LABORATORY_ROUTE_PREFIXES = [
  '/laboratory',
  '/patients',
  '/accounts',
  '/payments',
  '/users',
  '/roles',
  '/settings',
  '/hospitals',
  '/audit-logs',
  '/change-password',
  '/login',
];

export const normalizePlanKey = (value: unknown): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

export const isLaboratoryPlan = (plan: unknown): boolean =>
  LABORATORY_PLAN_ALIASES.has(normalizePlanKey(plan));

export type ProductEditionSource = {
  productEdition?: string | null;
  subscriptionPlan?: string | null;
  hospital?: { subscriptionPlan?: string | null; productEdition?: string | null } | null;
  company?: { subscriptionPlan?: string | null; productEdition?: string | null } | null;
} | null;

export const resolveProductEdition = (source?: ProductEditionSource): ProductEdition => {
  const explicit = normalizePlanKey(
    source?.productEdition ||
      source?.hospital?.productEdition ||
      source?.company?.productEdition
  );

  if (explicit === 'laboratory') {
    return 'laboratory';
  }

  const plan =
    source?.subscriptionPlan ||
    source?.hospital?.subscriptionPlan ||
    source?.company?.subscriptionPlan ||
    '';

  return isLaboratoryPlan(plan) ? 'laboratory' : 'hospital';
};

export const readStoredProductEdition = (): ProductEdition => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) {
      return 'hospital';
    }

    return resolveProductEdition(JSON.parse(raw));
  } catch {
    return 'hospital';
  }
};

export const isCurrentLaboratoryEdition = (): boolean =>
  readStoredProductEdition() === 'laboratory';

export const isLaboratoryEditionRouteAllowed = (path: string): boolean => {
  const normalized = String(path || '').split('?')[0] || '/';

  if (normalized === '/' || normalized === '') {
    return true;
  }

  return LABORATORY_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
};

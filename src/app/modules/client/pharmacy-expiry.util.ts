export type PharmacyExpiryTone = 'expired' | 'near' | 'valid' | 'none';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfDay(value = new Date()): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function parseExpiryDate(value?: string | Date | null): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : startOfDay(value);
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const dateOnly = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const parsed = new Date(`${dateOnly}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getPharmacyExpiryTone(
  value?: string | Date | null,
  nearMonths = 6,
): PharmacyExpiryTone {
  const expiry = parseExpiryDate(value);
  if (!expiry) {
    return 'none';
  }

  const today = startOfDay();
  if (expiry < today) {
    return 'expired';
  }

  const horizon = startOfDay();
  horizon.setMonth(horizon.getMonth() + nearMonths);
  if (expiry <= horizon) {
    return 'near';
  }

  return 'valid';
}

export function pharmacyExpiryLabel(tone: PharmacyExpiryTone): string {
  if (tone === 'expired') {
    return 'Expired';
  }
  if (tone === 'near') {
    return 'Near expiry';
  }
  if (tone === 'valid') {
    return 'Valid';
  }
  return 'No expiry';
}

export function pharmacyExpiryBadgeClass(tone: PharmacyExpiryTone): string {
  if (tone === 'expired') {
    return 'badge-danger is-expired';
  }
  if (tone === 'near') {
    return 'badge-danger is-near-expiry';
  }
  if (tone === 'valid') {
    return 'badge-success';
  }
  return 'badge-secondary';
}

export function daysUntilExpiry(value?: string | Date | null): number | null {
  const expiry = parseExpiryDate(value);
  if (!expiry) {
    return null;
  }
  return Math.round((expiry.getTime() - startOfDay().getTime()) / MS_PER_DAY);
}

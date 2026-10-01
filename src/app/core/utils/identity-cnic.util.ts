/** Pakistan CNIC helpers (frontend). */

export type IdentityType = 'CNIC' | 'PASSPORT' | 'OTHER' | '';

export const GUARDIAN_RELATIONSHIP_OPTIONS = [
  'Husband',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Son',
  'Daughter',
  'Other',
] as const;

export function digitsOnly(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '');
}

export function normalizeIdentityNumber(
  value: string | null | undefined,
  identityType: IdentityType | string = 'CNIC'
): string {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  if (String(identityType || 'CNIC').toUpperCase() === 'CNIC') {
    return digitsOnly(raw);
  }
  return raw.toUpperCase();
}

export function formatCnicDisplay(value: string | null | undefined): string {
  const digits = digitsOnly(value);
  if (digits.length !== 13) {
    return String(value || '').trim();
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function isValidCnic(value: string | null | undefined): boolean {
  return digitsOnly(value).length === 13;
}

export function formatCnicInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 13);
  if (digits.length <= 5) {
    return digits;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

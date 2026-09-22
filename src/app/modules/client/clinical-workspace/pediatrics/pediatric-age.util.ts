/**
 * Pediatric / clinical age helpers.
 * Age is always derived from DOB + reference date (visit date or today).
 * Corrected age is optional and never overwrites chronological age or DOB.
 */

export type PediatricAgeGroup =
  | 'NEWBORN'
  | 'INFANT'
  | 'TODDLER'
  | 'PRESCHOOL'
  | 'SCHOOL_AGE'
  | 'ADOLESCENT'
  | 'ADULT';

export interface PreciseAgeParts {
  totalDays: number;
  years: number;
  months: number;
  weeks: number;
  days: number;
  /** Compact clinical label e.g. "12 days", "6 weeks", "7 months", "4y 3m" */
  label: string;
  ageGroup: PediatricAgeGroup;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseIsoDateOnly(value?: string | Date | null): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const iso = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null;
  }
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function agePartsAtDate(
  dateOfBirth?: string | Date | null,
  referenceDate: string | Date = new Date()
): PreciseAgeParts | null {
  const birth = parseIsoDateOnly(dateOfBirth);
  const ref = parseIsoDateOnly(referenceDate) || parseIsoDateOnly(new Date());
  if (!birth || !ref || ref < birth) {
    return null;
  }

  const totalDays = Math.floor((ref.getTime() - birth.getTime()) / MS_PER_DAY);

  let years = ref.getFullYear() - birth.getFullYear();
  let months = ref.getMonth() - birth.getMonth();
  let days = ref.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(ref.getFullYear(), ref.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const weeks = Math.floor(totalDays / 7);
  const ageGroup = resolvePediatricAgeGroup(totalDays, years);
  const label = formatPreciseAgeLabel({ totalDays, years, months, weeks, days });

  return { totalDays, years, months, weeks, days, label, ageGroup };
}

export function formatPreciseAgeLabel(parts: {
  totalDays: number;
  years: number;
  months: number;
  weeks: number;
  days: number;
}): string {
  const { totalDays, years, months, weeks } = parts;
  if (totalDays < 0) {
    return '-';
  }
  if (totalDays < 14) {
    return `${totalDays} ${totalDays === 1 ? 'day' : 'days'}`;
  }
  if (totalDays < 60) {
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
  if (years < 1) {
    const m = Math.max(1, months || Math.floor(totalDays / 30.4375));
    return `${m} ${m === 1 ? 'month' : 'months'}`;
  }
  if (years < 5) {
    return months > 0 ? `${years}y ${months}m` : `${years}y`;
  }
  if (months > 0 && years < 18) {
    return `${years}y ${months}m`;
  }
  return `${years}y`;
}

export function resolvePediatricAgeGroup(totalDays: number, years: number): PediatricAgeGroup {
  if (totalDays < 28) {
    return 'NEWBORN';
  }
  if (years < 1) {
    return 'INFANT';
  }
  if (years < 3) {
    return 'TODDLER';
  }
  if (years < 6) {
    return 'PRESCHOOL';
  }
  if (years < 12) {
    return 'SCHOOL_AGE';
  }
  if (years < 18) {
    return 'ADOLESCENT';
  }
  return 'ADULT';
}

/** Age at a historical visit — never uses "today" unless visitDate omitted. */
export function ageAtVisitLabel(
  dateOfBirth?: string | Date | null,
  visitDate?: string | Date | null
): string {
  const parts = agePartsAtDate(dateOfBirth, visitDate || new Date());
  return parts?.label || '-';
}

/**
 * Corrected age for preterm infants when clinician confirms applicability.
 * gestationalAgeWeeksAtBirth e.g. 32; term reference 40 weeks.
 */
export function correctedAgeParts(options: {
  dateOfBirth?: string | Date | null;
  referenceDate?: string | Date | null;
  gestationalAgeWeeksAtBirth?: number | null;
  applyCorrectedAge?: boolean;
}): { chronological: PreciseAgeParts | null; corrected: PreciseAgeParts | null } {
  const chronological = agePartsAtDate(options.dateOfBirth, options.referenceDate || new Date());
  if (
    !options.applyCorrectedAge ||
    !chronological ||
    !options.gestationalAgeWeeksAtBirth ||
    options.gestationalAgeWeeksAtBirth >= 37
  ) {
    return { chronological, corrected: null };
  }
  const deficitDays = Math.round((40 - options.gestationalAgeWeeksAtBirth) * 7);
  const birth = parseIsoDateOnly(options.dateOfBirth);
  if (!birth) {
    return { chronological, corrected: null };
  }
  const correctedBirth = new Date(birth.getTime() + deficitDays * MS_PER_DAY);
  return {
    chronological,
    corrected: agePartsAtDate(correctedBirth, options.referenceDate || new Date()),
  };
}

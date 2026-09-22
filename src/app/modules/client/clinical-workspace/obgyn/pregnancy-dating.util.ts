const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateOnly(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function formatIsoDate(date: Date | null | undefined): string {
  if (!date) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

export function calculateEddFromLmp(lmp: string | Date | null | undefined): string {
  const start = toDateOnly(lmp);
  if (!start) {
    return '';
  }
  return formatIsoDate(new Date(start.getTime() + 280 * MS_PER_DAY));
}

export function gestationalAgeFromAnchor(
  anchor: string | Date | null | undefined,
  reference: string | Date | null | undefined = new Date()
): { weeks: number; days: number; label: string } | null {
  const a = toDateOnly(anchor);
  const r = toDateOnly(reference) || toDateOnly(new Date());
  if (!a || !r) {
    return null;
  }
  const diffDays = Math.floor((r.getTime() - a.getTime()) / MS_PER_DAY);
  if (diffDays < 0 || diffDays > 330) {
    return null;
  }
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;
  return { weeks, days, label: `${weeks}w ${days}d` };
}

export function resolveDatingAnchor(dating: {
  lmp?: string | Date | null;
  lmpCertainty?: string | null;
  confirmedEdd?: string | Date | null;
}): { anchor: Date | null; source: string } {
  const confirmed = toDateOnly(dating.confirmedEdd || null);
  if (confirmed) {
    return {
      anchor: new Date(confirmed.getTime() - 280 * MS_PER_DAY),
      source: 'confirmed_edd',
    };
  }
  if (String(dating.lmpCertainty || '').toLowerCase() === 'unknown') {
    return { anchor: null, source: 'none' };
  }
  const lmp = toDateOnly(dating.lmp || null);
  return lmp ? { anchor: lmp, source: 'lmp' } : { anchor: null, source: 'none' };
}

/** GA at a historic visit date — never use "today" for historic display. */
export function visitGestationalAgeLabel(
  dating: {
    lmp?: string | Date | null;
    lmpCertainty?: string | null;
    confirmedEdd?: string | Date | null;
  },
  visitDate: string | Date | null | undefined
): string {
  const { anchor } = resolveDatingAnchor(dating);
  const ga = gestationalAgeFromAnchor(anchor, visitDate || new Date());
  return ga?.label || '';
}

/**
 * Dental / OMFS hybrid adapter — Phase N.
 *
 * CUSTOM_LEGACY dental grid remains the write path. This module only:
 *   1) maps legacy flat keys → display enrichment (read-only)
 *   2) merges patches while preserving unknown/legacy keys
 *
 * NEVER rewrite specialtyData merely by opening a record.
 *
 * ---------------------------------------------------------------------------
 * LEGACY → NEW / DISPLAY / PRESERVE mapping
 * ---------------------------------------------------------------------------
 * LEGACY KEY              | NEW / DISPLAY ROLE                         | RULE
 * ----------------------- | ------------------------------------------ | ----
 * toothNumber             | tooth chart — keep write                   | PRESERVE
 * dentalComplaint         | complaint — keep write                     | PRESERVE
 * procedure               | procedure — keep write                     | PRESERVE
 * treatmentPlan           | plan — keep write                          | PRESERVE
 * nextVisit               | next visit — keep write                    | PRESERVE
 * dentalNotes             | notes — keep write                         | PRESERVE
 * toothNumberingSystem    | NEW additive (FDI/Universal/…)             | NEW
 * omfsTrauma              | NEW additive                               | NEW
 * jawPain                 | NEW additive                               | NEW
 * mouthOpening            | NEW additive                               | NEW
 * tmjNote                 | NEW additive                               | NEW
 * oralLesion              | NEW additive                               | NEW
 * procedureRecommended    | NEW additive                               | NEW
 * operationScheduleId     | NEW optional OperationSchedule ref         | NEW
 * (any other key)         | unknown historical                         | PRESERVE
 * ---------------------------------------------------------------------------
 */

export const LEGACY_DENTAL_KEYS = [
  'toothNumber',
  'dentalComplaint',
  'procedure',
  'treatmentPlan',
  'nextVisit',
  'dentalNotes',
] as const;

export type LegacyDentalKey = (typeof LEGACY_DENTAL_KEYS)[number];

export type DentalDisplayRow = {
  key: string;
  label: string;
  value: string;
  source: 'legacy' | 'new';
};

const LEGACY_DISPLAY_LABELS: Record<LegacyDentalKey, string> = {
  toothNumber: 'Tooth Number',
  dentalComplaint: 'Dental Complaint',
  procedure: 'Procedure',
  treatmentPlan: 'Treatment Plan',
  nextVisit: 'Next Visit',
  dentalNotes: 'Dental Notes',
};

/**
 * Read-only enrichment for UI/print helpers.
 * Does not mutate specialtyData and does not invent missing values.
 */
export function mapLegacyDentalToDisplay(
  specialtyData: Record<string, unknown> | null | undefined
): DentalDisplayRow[] {
  const data = specialtyData && typeof specialtyData === 'object' ? specialtyData : {};
  const rows: DentalDisplayRow[] = [];

  for (const key of LEGACY_DENTAL_KEYS) {
    const raw = data[key];
    if (raw === null || raw === undefined) {
      continue;
    }
    const value = String(raw).trim();
    if (!value) {
      continue;
    }
    rows.push({
      key,
      label: LEGACY_DISPLAY_LABELS[key],
      value,
      source: 'legacy',
    });
  }

  return rows;
}

/**
 * Merge a patch onto existing specialtyData without dropping unknown keys.
 * Empty-string patch values clear only that key; absent patch keys are left alone.
 * Does not rewrite the record on open — call only when the user saves a real edit.
 */
export function mergePreserveLegacyDental(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...(existing || {}) };

  Object.entries(patch || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        result[key] = trimmed;
      } else {
        delete result[key];
      }
      return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
      return;
    }
    if (!(key in result)) {
      result[key] = value;
    }
  });

  return result;
}

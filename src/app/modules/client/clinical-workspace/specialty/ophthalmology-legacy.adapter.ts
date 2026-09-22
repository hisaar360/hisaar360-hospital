/**
 * Ophthalmology hybrid adapter — Phase M.
 *
 * CUSTOM_LEGACY eye grid remains the write path. This module only:
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
 * visualAcuityRight       | display as Right Eye (OD) VA; keep write   | PRESERVE
 * visualAcuityLeft        | display as Left Eye (OS) VA; keep write    | PRESERVE
 * iopRight                | display as Right Eye (OD) IOP; keep write  | PRESERVE
 * iopLeft                 | display as Left Eye (OS) IOP; keep write   | PRESERVE
 * refractionRightSph      | RE SPH — keep write                        | PRESERVE
 * refractionRightCyl      | RE CYL — keep write                        | PRESERVE
 * refractionRightAxis     | RE Axis (0–180 if numeric) — keep write    | PRESERVE
 * refractionLeftSph       | LE SPH — keep write                        | PRESERVE
 * refractionLeftCyl       | LE CYL — keep write                        | PRESERVE
 * refractionLeftAxis      | LE Axis (0–180 if numeric) — keep write    | PRESERVE
 * slitLampFindings        | anterior overview; keep write              | PRESERVE
 * fundusFindings          | fundus overview; keep write                | PRESERVE
 * glassesPrescription     | glasses Rx — keep write                    | PRESERVE
 * eyeDiagnosis            | diagnosis text — keep write                | PRESERVE
 * vaNotationOd / Os       | NEW additive (default snellen_metric)      | NEW
 * iopMethodOd / Os        | NEW additive                               | NEW
 * pupilOd / Os            | NEW additive                               | NEW
 * eomSummary              | NEW additive                               | NEW
 * anteriorSegmentOd / Os  | NEW additive (may display beside slitLamp) | NEW
 * fundusOd / Os           | NEW additive (may display beside fundus)   | NEW
 * cupDiscOd / Os          | NEW additive                               | NEW
 * cataractOd / Os         | NEW additive                               | NEW
 * glaucomaKnown / Note    | NEW additive (no auto glaucoma logic)      | NEW
 * octRefOd / Os           | NEW report refs                            | NEW
 * visualFieldRef          | NEW report ref                             | NEW
 * fundusPhotoRef          | NEW report ref                             | NEW
 * traumaNote              | NEW additive                               | NEW
 * suddenVisionLossNote    | NEW additive                               | NEW
 * surgicalPlanStatus      | NEW (recommendation ≠ OT completed)        | NEW
 * operationScheduleId     | NEW optional OperationSchedule ref         | NEW
 * (any other key)         | unknown historical                         | PRESERVE
 * ---------------------------------------------------------------------------
 */

export const LEGACY_EYE_KEYS = [
  'visualAcuityRight',
  'visualAcuityLeft',
  'iopRight',
  'iopLeft',
  'refractionRightSph',
  'refractionRightCyl',
  'refractionRightAxis',
  'refractionLeftSph',
  'refractionLeftCyl',
  'refractionLeftAxis',
  'slitLampFindings',
  'fundusFindings',
  'glassesPrescription',
  'eyeDiagnosis',
] as const;

export type LegacyEyeKey = (typeof LEGACY_EYE_KEYS)[number];

export type EyeDisplayRow = {
  key: string;
  label: string;
  value: string;
  source: 'legacy' | 'new';
};

const LEGACY_DISPLAY_LABELS: Record<LegacyEyeKey, string> = {
  visualAcuityRight: 'Right Eye (OD) Vision',
  visualAcuityLeft: 'Left Eye (OS) Vision',
  iopRight: 'Right Eye (OD) IOP',
  iopLeft: 'Left Eye (OS) IOP',
  refractionRightSph: 'Right Eye (OD) SPH',
  refractionRightCyl: 'Right Eye (OD) CYL',
  refractionRightAxis: 'Right Eye (OD) Axis',
  refractionLeftSph: 'Left Eye (OS) SPH',
  refractionLeftCyl: 'Left Eye (OS) CYL',
  refractionLeftAxis: 'Left Eye (OS) Axis',
  slitLampFindings: 'Slit Lamp Findings',
  fundusFindings: 'Fundus Findings',
  glassesPrescription: 'Glasses Prescription',
  eyeDiagnosis: 'Eye Diagnosis',
};

/**
 * Read-only enrichment for UI/print helpers.
 * Does not mutate specialtyData and does not invent missing values.
 */
export function mapLegacyEyeToDisplay(
  specialtyData: Record<string, unknown> | null | undefined
): EyeDisplayRow[] {
  const data = specialtyData && typeof specialtyData === 'object' ? specialtyData : {};
  const rows: EyeDisplayRow[] = [];

  for (const key of LEGACY_EYE_KEYS) {
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
export function mergePreserveLegacy(
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
    // Nested objects/arrays for unknown keys: preserve if already present; do not overwrite known scalars with objects
    if (!(key in result)) {
      result[key] = value;
    }
  });

  return result;
}

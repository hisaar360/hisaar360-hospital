import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyFieldSchema,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { LEGACY_EYE_KEYS } from './ophthalmology-legacy.adapter';

/**
 * OPHTHALMOLOGY v1 — registered for documentation / summary / print helpers.
 *
 * UI PATH: CUSTOM_LEGACY (legacy eye grid). Do NOT switch to generic renderer.
 * usesGenericSpecialtyEngine('OPHTHALMOLOGY') === false.
 *
 * Field set includes BOTH preserved legacy flat keys AND Phase M additive keys.
 */

const VA_OPTIONS = ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'CF', 'HM', 'PL'];
const VA_NOTATION_OPTIONS = ['snellen_metric', 'snellen_imperial', 'logMAR', 'other'];
const SURGICAL_PLAN_OPTIONS = [
  'Observe',
  'Further investigation',
  'Procedure recommended',
  'Surgery planned',
  'Post-op follow-up',
];

function text(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    placeholder?: string;
    helpText?: string;
    defaultValue?: unknown;
  }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'text',
    group,
    displayOrder,
    section: options?.section,
    placeholder: options?.placeholder,
    helpText: options?.helpText,
    defaultValue: options?.defaultValue,
  };
}

function textArea(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; placeholder?: string; helpText?: string }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'textarea',
    group,
    displayOrder,
    section: options?.section,
    placeholder: options?.placeholder,
    helpText: options?.helpText,
  };
}

function select(
  key: string,
  label: string,
  optionsList: string[],
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    helpText?: string;
    defaultValue?: unknown;
    summaryLabel?: string;
  }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'single_select',
    options: optionsList,
    group,
    displayOrder,
    section: options?.section,
    helpText: options?.helpText,
    defaultValue: options?.defaultValue,
    summaryLabel: options?.summaryLabel,
  };
}

function tri(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; summaryLabel?: string; helpText?: string }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'tri_state',
    group,
    displayOrder,
    section: options?.section,
    summaryLabel: options?.summaryLabel,
    helpText: options?.helpText,
  };
}

/** Documentation schema — not used by generic engine renderer (CUSTOM_LEGACY gate). */
export const OPHTHALMOLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'OPHTHALMOLOGY',
  name: 'Ophthalmology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description:
    'Hybrid ophthalmology specialtyData: legacy eye flat keys preserved + Phase M additive OD/OS fields. CUSTOM_LEGACY UI only.',
  fields: [
    // --- Legacy VA / IOP / refraction (PRESERVE write keys) ---
    select('visualAcuityRight', 'Right Eye (OD) Vision', VA_OPTIONS, 'quick', 1, {
      section: 'Visual acuity / IOP (legacy)',
      summaryLabel: 'VA OD',
    }),
    select('visualAcuityLeft', 'Left Eye (OS) Vision', VA_OPTIONS, 'quick', 2, {
      section: 'Visual acuity / IOP (legacy)',
      summaryLabel: 'VA OS',
    }),
    select('vaNotationOd', 'Right Eye (OD) VA notation', VA_NOTATION_OPTIONS, 'quick', 3, {
      section: 'Visual acuity / IOP (legacy)',
      defaultValue: 'snellen_metric',
      helpText: 'Default snellen_metric. Additive — does not rewrite legacy VA values.',
    }),
    select('vaNotationOs', 'Left Eye (OS) VA notation', VA_NOTATION_OPTIONS, 'quick', 4, {
      section: 'Visual acuity / IOP (legacy)',
      defaultValue: 'snellen_metric',
    }),
    text('iopRight', 'Right Eye (OD) IOP', 'quick', 5, {
      section: 'Visual acuity / IOP (legacy)',
      placeholder: '16 mmHg',
    }),
    text('iopLeft', 'Left Eye (OS) IOP', 'quick', 6, {
      section: 'Visual acuity / IOP (legacy)',
      placeholder: '17 mmHg',
    }),
    text('iopMethodOd', 'Right Eye (OD) IOP method', 'quick', 7, {
      section: 'Visual acuity / IOP (legacy)',
      placeholder: 'e.g. Goldmann, NCT',
    }),
    text('iopMethodOs', 'Left Eye (OS) IOP method', 'quick', 8, {
      section: 'Visual acuity / IOP (legacy)',
      placeholder: 'e.g. Goldmann, NCT',
    }),
    text('refractionRightSph', 'Right Eye (OD) SPH', 'quick', 9, {
      section: 'Refraction (legacy)',
      placeholder: '+0.50',
    }),
    text('refractionRightCyl', 'Right Eye (OD) CYL', 'quick', 10, {
      section: 'Refraction (legacy)',
      placeholder: '-0.75',
    }),
    text('refractionRightAxis', 'Right Eye (OD) Axis', 'quick', 11, {
      section: 'Refraction (legacy)',
      placeholder: '0–180',
      helpText: 'If numeric, expect 0–180.',
    }),
    text('refractionLeftSph', 'Left Eye (OS) SPH', 'quick', 12, {
      section: 'Refraction (legacy)',
      placeholder: '+0.25',
    }),
    text('refractionLeftCyl', 'Left Eye (OS) CYL', 'quick', 13, {
      section: 'Refraction (legacy)',
      placeholder: '-0.50',
    }),
    text('refractionLeftAxis', 'Left Eye (OS) Axis', 'quick', 14, {
      section: 'Refraction (legacy)',
      placeholder: '0–180',
      helpText: 'If numeric, expect 0–180.',
    }),

    // --- Exam ---
    text('pupilOd', 'Right Eye (OD) pupil', 'quick', 20, {
      section: 'Exam',
      placeholder: 'e.g. round reactive',
    }),
    text('pupilOs', 'Left Eye (OS) pupil', 'quick', 21, {
      section: 'Exam',
      placeholder: 'e.g. round reactive',
    }),
    textArea('eomSummary', 'EOM summary', 'quick', 22, {
      section: 'Exam',
      placeholder: 'Extraocular movements',
    }),
    textArea('slitLampFindings', 'Slit Lamp Findings', 'quick', 23, {
      section: 'Exam',
    }),
    textArea('anteriorSegmentOd', 'Right Eye (OD) anterior segment', 'quick', 24, {
      section: 'Exam',
    }),
    textArea('anteriorSegmentOs', 'Left Eye (OS) anterior segment', 'quick', 25, {
      section: 'Exam',
    }),
    textArea('fundusFindings', 'Fundus Findings', 'quick', 26, {
      section: 'Exam',
    }),
    textArea('fundusOd', 'Right Eye (OD) fundus', 'quick', 27, {
      section: 'Exam',
    }),
    textArea('fundusOs', 'Left Eye (OS) fundus', 'quick', 28, {
      section: 'Exam',
    }),
    text('cupDiscOd', 'Right Eye (OD) cup-disc', 'quick', 29, {
      section: 'Exam',
      placeholder: 'e.g. 0.3',
    }),
    text('cupDiscOs', 'Left Eye (OS) cup-disc', 'quick', 30, {
      section: 'Exam',
      placeholder: 'e.g. 0.3',
    }),
    text('cataractOd', 'Right Eye (OD) cataract', 'quick', 31, {
      section: 'Exam',
      placeholder: 'Clinician note — no auto grading',
      helpText: 'Clinician-documented only — no autonomous cataract grading.',
    }),
    text('cataractOs', 'Left Eye (OS) cataract', 'quick', 32, {
      section: 'Exam',
      placeholder: 'Clinician note — no auto grading',
    }),
    tri('glaucomaKnown', 'Known glaucoma', 'quick', 33, {
      section: 'Exam',
      summaryLabel: 'Glaucoma',
      helpText: 'Flag only — IOP values do not auto-diagnose glaucoma.',
    }),
    textArea('glaucomaNote', 'Glaucoma note', 'quick', 34, {
      section: 'Exam',
    }),
    textArea('glassesPrescription', 'Glasses Prescription', 'quick', 35, {
      section: 'Plan',
    }),
    textArea('eyeDiagnosis', 'Eye Diagnosis', 'quick', 36, {
      section: 'Plan',
    }),

    // --- More: refs / red flags / plan ---
    text('octRefOd', 'Right Eye (OD) OCT reference', 'more', 40, {
      section: 'Investigations',
      placeholder: 'OCT report / document ID',
      helpText: 'Reference only — report stays in documents / imaging.',
    }),
    text('octRefOs', 'Left Eye (OS) OCT reference', 'more', 41, {
      section: 'Investigations',
      placeholder: 'OCT report / document ID',
    }),
    text('visualFieldRef', 'Visual field reference', 'more', 42, {
      section: 'Investigations',
      placeholder: 'VF report / document ID',
    }),
    text('fundusPhotoRef', 'Fundus photo reference', 'more', 43, {
      section: 'Investigations',
      placeholder: 'Photo / document ID',
    }),
    textArea('traumaNote', 'Trauma note', 'more', 50, {
      section: 'Red flags / trauma',
    }),
    textArea('suddenVisionLossNote', 'Sudden vision loss note', 'more', 51, {
      section: 'Red flags / trauma',
      helpText: 'Clinician note only — no automated triage.',
    }),
    select('surgicalPlanStatus', 'Surgical / plan status', SURGICAL_PLAN_OPTIONS, 'more', 60, {
      section: 'Surgical plan',
      helpText:
        'Recommendation only — does not mean OT completed and does not create OperationSchedule.',
    }),
    text('operationScheduleId', 'Operation schedule ID (optional)', 'more', 61, {
      section: 'Surgical plan',
      placeholder: 'Existing OperationSchedule id if already scheduled',
      helpText: 'Optional reference only — specialty save does not create OT.',
    }),
  ],
};

/** Convenience: all keys this template documents (legacy ∪ new). */
export function ophthalmologyTemplateFieldKeys(): string[] {
  const keys = new Set<string>([...LEGACY_EYE_KEYS]);
  OPHTHALMOLOGY_TEMPLATE.fields.forEach((field) => keys.add(field.key));
  return [...keys];
}

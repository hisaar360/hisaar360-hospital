import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import {
  CRANIAL_NERVE_SUMMARY_OPTIONS,
  GAIT_SUMMARY_OPTIONS,
  HEMORRHAGE_TYPE_OPTIONS,
  LATERALITY_OPTIONS,
  MOTOR_SUMMARY_OPTIONS,
  PROBLEM_DOMAIN_OPTIONS,
  SENSORY_SUMMARY_OPTIONS,
  SURGICAL_PLAN_STATUS_OPTIONS,
  dateField,
  equals,
  select,
  text,
  textArea,
  tri,
  yes,
} from './neuro-shared';

/**
 * NEUROSURGERY v1 — OPD consultation specialtyData only (Phase L).
 * Reuses OperationSchedule via optional operationScheduleId — does NOT create NeurosurgeryOperation.
 * No auto cauda equina / hemorrhage classification. Recommendation ≠ completed OT.
 */
export const NEUROSURGERY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'NEUROSURGERY',
  name: 'Neurosurgery',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description:
    'OPD neurosurgery consultation notes. Surgical plan status records intent only — does not create a completed operation.',
  fields: [
    // --- QUICK: Problem domain ---
    select('problemDomain', 'Problem domain', PROBLEM_DOMAIN_OPTIONS, 'quick', 1, {
      section: 'Presentation',
      summaryLabel: 'Domain',
    }),
    tri('symptomHeadache', 'Headache', 'quick', 2, {
      section: 'Presentation',
      summaryLabel: 'Headache',
    }),
    tri('symptomWeakness', 'Weakness', 'quick', 3, {
      section: 'Presentation',
      summaryLabel: 'Weakness',
    }),
    tri('symptomNumbness', 'Numbness / paresthesia', 'quick', 4, {
      section: 'Presentation',
      summaryLabel: 'Numbness',
    }),
    tri('symptomBackPain', 'Back / neck pain', 'quick', 5, {
      section: 'Presentation',
      summaryLabel: 'Pain',
    }),
    tri('symptomSeizure', 'Seizure', 'quick', 6, {
      section: 'Presentation',
      summaryLabel: 'Seizure',
    }),
    tri('symptomLoc', 'Loss of consciousness', 'quick', 7, {
      section: 'Presentation',
      summaryLabel: 'LOC',
    }),
    tri('symptomGait', 'Gait difficulty', 'quick', 8, {
      section: 'Presentation',
      summaryLabel: 'Gait sx',
    }),
    tri('symptomBladderBowel', 'Bladder / bowel symptom', 'quick', 9, {
      section: 'Presentation',
      helpText: 'Clinician-documented only — does not auto-diagnose cauda equina.',
    }),

    // --- QUICK: Neuro status ---
    text('gcsScoreEventRef', 'GCS ClinicalScoreEvent ref', 'quick', 20, {
      section: 'Neuro status',
      placeholder: 'ClinicalScoreEvent id / label',
      helpText: 'String reference to ClinicalScoreEvent — do not embed GCS values.',
      summaryLabel: 'GCS ref',
    }),
    select('examMotor', 'Motor deficit summary', MOTOR_SUMMARY_OPTIONS, 'quick', 21, {
      section: 'Neuro status',
      summaryLabel: 'Motor',
    }),
    select('examSensory', 'Sensory deficit summary', SENSORY_SUMMARY_OPTIONS, 'quick', 22, {
      section: 'Neuro status',
      summaryLabel: 'Sensory',
    }),
    select('examCranialNerves', 'Cranial nerves', CRANIAL_NERVE_SUMMARY_OPTIONS, 'quick', 23, {
      section: 'Neuro status',
      summaryLabel: 'CN',
    }),
    select('examGait', 'Gait', GAIT_SUMMARY_OPTIONS, 'quick', 24, {
      section: 'Neuro status',
      summaryLabel: 'Gait',
    }),

    // --- QUICK: Structural diagnosis (clinician tris) ---
    tri('dxBrainLesion', 'Brain lesion (clinician)', 'quick', 30, {
      section: 'Structural diagnosis',
      summaryLabel: 'Brain lesion',
    }),
    tri('dxIntracranialBleed', 'Intracranial hemorrhage (clinician)', 'quick', 31, {
      section: 'Structural diagnosis',
      summaryLabel: 'ICH/bleed',
    }),
    tri('dxHydrocephalus', 'Hydrocephalus', 'quick', 32, {
      section: 'Structural diagnosis',
      summaryLabel: 'HCP',
    }),
    tri('dxSpinePathology', 'Spine pathology', 'quick', 33, {
      section: 'Structural diagnosis',
      summaryLabel: 'Spine',
    }),
    tri('dxPeripheralNerve', 'Peripheral nerve lesion', 'quick', 34, {
      section: 'Structural diagnosis',
      summaryLabel: 'PNS',
    }),
    tri('dxTrauma', 'Trauma-related', 'quick', 35, {
      section: 'Structural diagnosis',
      summaryLabel: 'Trauma',
    }),

    // --- QUICK: Surgical plan ---
    select(
      'surgicalPlanStatus',
      'Surgical plan status',
      SURGICAL_PLAN_STATUS_OPTIONS,
      'quick',
      40,
      {
        section: 'Plan',
        summaryLabel: 'Plan',
        helpText:
          'Recommendation or “Operation planned” records OPD intent only — it does not create a completed OperationSchedule / OT record.',
      }
    ),
    text('operationScheduleId', 'OperationSchedule reference (optional)', 'quick', 41, {
      section: 'Plan',
      placeholder: 'Existing OperationSchedule id if linked',
      helpText: 'Optional link to an existing OperationSchedule — does not create OT.',
    }),
    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 42, {
      section: 'Plan',
      placeholder: 'Clinician assessment — not auto-diagnosed',
    }),
    textArea('planNote', 'Plan note', 'quick', 43, {
      section: 'Plan',
      placeholder: 'Imaging, admission, or procedure intent',
    }),

    // --- MORE: Brain lesion ---
    text('brainLesionLocation', 'Brain lesion location', 'more', 50, {
      section: 'Brain lesion',
      showIf: yes('dxBrainLesion'),
      placeholder: 'e.g. right frontal',
    }),
    select('brainLesionLaterality', 'Laterality', LATERALITY_OPTIONS, 'more', 51, {
      section: 'Brain lesion',
      showIf: yes('dxBrainLesion'),
    }),
    textArea('brainLesionNote', 'Brain lesion note', 'more', 52, {
      section: 'Brain lesion',
      showIf: yes('dxBrainLesion'),
      placeholder: 'Clinician description — no auto histology',
    }),

    // --- MORE: ICH / SDH / EDH / SAH (clinician select) ---
    select('hemorrhageType', 'Hemorrhage type (clinician)', HEMORRHAGE_TYPE_OPTIONS, 'more', 60, {
      section: 'Intracranial hemorrhage',
      showIf: yes('dxIntracranialBleed'),
      summaryLabel: 'Bleed type',
      helpText: 'Clinician-selected only — no automated bleed classification.',
    }),
    textArea('hemorrhageNote', 'Hemorrhage note', 'more', 61, {
      section: 'Intracranial hemorrhage',
      showIf: yes('dxIntracranialBleed'),
    }),

    // --- MORE: TBI ---
    select(
      'tbiMechanism',
      'TBI mechanism',
      [
        'Road traffic accident',
        'Fall',
        'Assault',
        'Sports',
        'Other',
        'Not documented',
      ],
      'more',
      70,
      { section: 'TBI', showIf: yes('dxTrauma') }
    ),
    tri('tbiLoc', 'LOC with injury', 'more', 71, {
      section: 'TBI',
      showIf: yes('dxTrauma'),
    }),
    textArea('tbiAnticoagulantReviewedNote', 'Anticoagulant reviewed note', 'more', 72, {
      section: 'TBI',
      showIf: yes('dxTrauma'),
      placeholder: 'Clinician note that anticoagulants were reviewed — not auto-flagged',
    }),
    text('tbiPupils', 'Pupils', 'more', 73, {
      section: 'TBI',
      showIf: yes('dxTrauma'),
      placeholder: 'e.g. equal reactive / anisocoria clinician-noted',
    }),
    textArea('tbiNote', 'TBI note', 'more', 74, {
      section: 'TBI',
      showIf: yes('dxTrauma'),
    }),

    // --- MORE: Hydrocephalus / shunt ---
    tri('shuntHistory', 'Shunt history', 'more', 80, {
      section: 'Hydrocephalus / shunt',
      showIf: yes('dxHydrocephalus'),
      summaryLabel: 'Shunt Hx',
    }),
    text('shuntType', 'Shunt type / site', 'more', 81, {
      section: 'Hydrocephalus / shunt',
      showIf: yes('dxHydrocephalus'),
      placeholder: 'e.g. VP shunt',
    }),
    textArea('hydrocephalusNote', 'Hydrocephalus / shunt note', 'more', 82, {
      section: 'Hydrocephalus / shunt',
      showIf: yes('dxHydrocephalus'),
    }),

    // --- MORE: Spine ---
    text('spineLevels', 'Spine levels', 'more', 90, {
      section: 'Spine',
      showIf: yes('dxSpinePathology'),
      placeholder: 'e.g. L4-L5, C5-C6',
      summaryLabel: 'Levels',
    }),
    textArea('spineRedFlagNote', 'Spine red-flag clinician notes', 'more', 91, {
      section: 'Spine',
      showIf: yes('dxSpinePathology'),
      placeholder: 'Clinician red-flag notes only',
      helpText: 'Does not auto-diagnose cauda equina or other emergencies.',
    }),
    tri('radiculopathyPresent', 'Radiculopathy', 'more', 92, {
      section: 'Spine',
      showIf: yes('dxSpinePathology'),
      summaryLabel: 'Radiculopathy',
    }),
    select('radiculopathyLaterality', 'Radiculopathy laterality', LATERALITY_OPTIONS, 'more', 93, {
      section: 'Spine',
      showIf: yes('radiculopathyPresent'),
    }),
    textArea('radiculopathyNote', 'Radiculopathy note', 'more', 94, {
      section: 'Spine',
      showIf: yes('radiculopathyPresent'),
    }),
    tri('myelopathyPresent', 'Myelopathy', 'more', 95, {
      section: 'Spine',
      showIf: yes('dxSpinePathology'),
      summaryLabel: 'Myelopathy',
    }),
    textArea('myelopathyNote', 'Myelopathy note', 'more', 96, {
      section: 'Spine',
      showIf: yes('myelopathyPresent'),
    }),

    // --- MORE: Implant history ---
    tri('implantHistory', 'Implant / hardware history', 'more', 100, {
      section: 'Implant history',
      summaryLabel: 'Implant',
    }),
    text('implantType', 'Implant type', 'more', 101, {
      section: 'Implant history',
      showIf: yes('implantHistory'),
      placeholder: 'e.g. cervical cage, VP shunt valve',
    }),
    text('implantYear', 'Implant year', 'more', 102, {
      section: 'Implant history',
      showIf: yes('implantHistory'),
    }),
    textArea('implantNote', 'Implant note', 'more', 103, {
      section: 'Implant history',
      showIf: yes('implantHistory'),
    }),

    // --- MORE: Pre-op baseline ---
    textArea('preOpBaselineNote', 'Pre-op neurological baseline', 'more', 110, {
      section: 'Pre-op baseline',
      placeholder: 'Baseline neuro status before planned procedure — clinician only',
    }),
    dateField('preOpBaselineDate', 'Baseline documented date', 'more', 111, {
      section: 'Pre-op baseline',
    }),

    // --- MORE: Post-op follow-up ---
    text('postOpOperationReference', 'Post-op operation reference', 'more', 120, {
      section: 'Post-op follow-up',
      showIf: equals('surgicalPlanStatus', 'Post-op follow-up'),
      placeholder: 'Text / OperationSchedule ref — no OT write from specialtyData',
    }),
    text('daysPostOp', 'Days post-op', 'more', 121, {
      section: 'Post-op follow-up',
      showIf: equals('surgicalPlanStatus', 'Post-op follow-up'),
    }),
    textArea('postOpNeuroStatus', 'Post-op neuro status', 'more', 122, {
      section: 'Post-op follow-up',
      showIf: equals('surgicalPlanStatus', 'Post-op follow-up'),
    }),
    textArea('postOpWoundNote', 'Wound / incision note (OPD)', 'more', 123, {
      section: 'Post-op follow-up',
      showIf: equals('surgicalPlanStatus', 'Post-op follow-up'),
      helpText: 'OPD follow-up only — not Ward nursing documentation.',
    }),

    // --- MORE: Imaging refs ---
    text('imagingType', 'Imaging type', 'more', 130, {
      section: 'Imaging',
      placeholder: 'CT / MRI / X-ray',
    }),
    dateField('imagingDate', 'Imaging date', 'more', 131, {
      section: 'Imaging',
    }),
    textArea('imagingSummary', 'Imaging summary (clinician)', 'more', 132, {
      section: 'Imaging',
      placeholder: 'Brief clinician summary — report remains in imaging/docs',
    }),
    text('imagingDocumentRef', 'Imaging document reference', 'more', 133, {
      section: 'Imaging',
      placeholder: 'Document / study id',
    }),
  ],
};

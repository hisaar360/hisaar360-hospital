import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import {
  COORDINATION_SUMMARY_OPTIONS,
  CRANIAL_NERVE_SUMMARY_OPTIONS,
  GAIT_SUMMARY_OPTIONS,
  LATERALITY_OPTIONS,
  MENTAL_STATUS_OPTIONS,
  MOTOR_SUMMARY_OPTIONS,
  REFLEX_SUMMARY_OPTIONS,
  SEIZURE_CLASS_OPTIONS,
  SENSORY_SUMMARY_OPTIONS,
  STROKE_TYPE_OPTIONS,
  dateField,
  select,
  text,
  textArea,
  tri,
  yes,
} from './neuro-shared';

/**
 * NEUROLOGY v1 — OPD consultation specialtyData only (Phase L).
 * No auto migraine/SAH/seizure classification or thrombolysis eligibility.
 * Score refs point to ClinicalScoreEvent — scores are not embedded.
 * SpO2/vitals/labs/meds remain canonical elsewhere.
 */
export const NEUROLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'NEUROLOGY',
  name: 'Neurology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description:
    'OPD neurology consultation notes. Clinician-documented findings only — no automated diagnosis or score calculation.',
  fields: [
    // --- QUICK: Symptoms ---
    tri('symptomHeadache', 'Headache', 'quick', 1, {
      section: 'Symptoms',
      summaryLabel: 'Headache',
    }),
    tri('symptomSeizure', 'Seizure', 'quick', 2, {
      section: 'Symptoms',
      summaryLabel: 'Seizure',
    }),
    tri('symptomWeakness', 'Weakness', 'quick', 3, {
      section: 'Symptoms',
      summaryLabel: 'Weakness',
    }),
    tri('symptomNumbness', 'Numbness / paresthesia', 'quick', 4, {
      section: 'Symptoms',
      summaryLabel: 'Numbness',
    }),
    tri('symptomSpeech', 'Speech difficulty', 'quick', 5, {
      section: 'Symptoms',
      summaryLabel: 'Speech',
    }),
    tri('symptomVisual', 'Visual symptom', 'quick', 6, {
      section: 'Symptoms',
      summaryLabel: 'Visual',
    }),
    tri('symptomDizziness', 'Dizziness / vertigo', 'quick', 7, {
      section: 'Symptoms',
      summaryLabel: 'Dizziness',
    }),
    tri('symptomLoc', 'Loss of consciousness', 'quick', 8, {
      section: 'Symptoms',
      summaryLabel: 'LOC',
    }),
    tri('symptomTremor', 'Tremor', 'quick', 9, {
      section: 'Symptoms',
      summaryLabel: 'Tremor',
    }),
    tri('symptomGait', 'Gait difficulty', 'quick', 10, {
      section: 'Symptoms',
      summaryLabel: 'Gait sx',
    }),
    tri('symptomMemory', 'Memory / cognition concern', 'quick', 11, {
      section: 'Symptoms',
      summaryLabel: 'Memory',
    }),

    // --- QUICK: Known conditions ---
    tri('knownStrokeTia', 'Stroke / TIA', 'quick', 20, {
      section: 'Known conditions',
      summaryLabel: 'Stroke/TIA',
    }),
    tri('knownEpilepsy', 'Epilepsy', 'quick', 21, {
      section: 'Known conditions',
      summaryLabel: 'Epilepsy',
    }),
    tri('knownMigraine', 'Migraine', 'quick', 22, {
      section: 'Known conditions',
      summaryLabel: 'Migraine',
    }),
    tri('knownNeuropathy', 'Neuropathy', 'quick', 23, {
      section: 'Known conditions',
      summaryLabel: 'Neuropathy',
    }),
    tri('knownParkinsonism', 'Parkinsonism', 'quick', 24, {
      section: 'Known conditions',
      summaryLabel: 'Parkinsonism',
    }),
    tri('knownMs', 'Multiple sclerosis / demyelinating', 'quick', 25, {
      section: 'Known conditions',
      summaryLabel: 'MS',
    }),
    tri('knownDementia', 'Dementia / cognitive disorder', 'quick', 26, {
      section: 'Known conditions',
      summaryLabel: 'Dementia',
    }),
    tri('knownNeuromuscular', 'Neuromuscular disease', 'quick', 27, {
      section: 'Known conditions',
      summaryLabel: 'NMD',
    }),

    // --- QUICK: Exam summary ---
    select('examMentalStatus', 'Mental status', MENTAL_STATUS_OPTIONS, 'quick', 40, {
      section: 'Exam summary',
      summaryLabel: 'Mental',
    }),
    select('examCranialNerves', 'Cranial nerves', CRANIAL_NERVE_SUMMARY_OPTIONS, 'quick', 41, {
      section: 'Exam summary',
      summaryLabel: 'CN',
    }),
    select('examMotor', 'Motor', MOTOR_SUMMARY_OPTIONS, 'quick', 42, {
      section: 'Exam summary',
      summaryLabel: 'Motor',
    }),
    select('examSensory', 'Sensory', SENSORY_SUMMARY_OPTIONS, 'quick', 43, {
      section: 'Exam summary',
      summaryLabel: 'Sensory',
    }),
    select('examReflexes', 'Reflexes', REFLEX_SUMMARY_OPTIONS, 'quick', 44, {
      section: 'Exam summary',
      summaryLabel: 'Reflexes',
    }),
    select('examCoordination', 'Coordination', COORDINATION_SUMMARY_OPTIONS, 'quick', 45, {
      section: 'Exam summary',
      summaryLabel: 'Coord',
    }),
    select('examGait', 'Gait', GAIT_SUMMARY_OPTIONS, 'quick', 46, {
      section: 'Exam summary',
      summaryLabel: 'Gait',
    }),
    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 47, {
      section: 'Exam summary',
      placeholder: 'Clinician assessment — not auto-diagnosed',
    }),

    // --- QUICK: Investigation refs ---
    text('ctMriRef', 'CT / MRI reference', 'quick', 50, {
      section: 'Investigations',
      placeholder: 'Document / imaging ID or brief label',
      helpText: 'Reference only — imaging stays in documents / radiology.',
    }),
    text('eegRef', 'EEG reference', 'quick', 51, {
      section: 'Investigations',
      placeholder: 'EEG report / study reference',
    }),
    text('emgNcsRef', 'EMG / NCS reference', 'quick', 52, {
      section: 'Investigations',
      placeholder: 'EMG/NCS report reference',
    }),

    // --- MORE: Headache (structured; no auto migraine/SAH) ---
    text('headacheDuration', 'Headache duration', 'more', 60, {
      section: 'Headache',
      showIf: yes('symptomHeadache'),
      placeholder: 'e.g. 2 days, chronic 6 months',
    }),
    select(
      'headacheOnset',
      'Headache onset',
      ['Sudden', 'Gradual', 'Thunderclap', 'Not documented'],
      'more',
      61,
      {
        section: 'Headache',
        showIf: yes('symptomHeadache'),
        helpText: 'Clinician description only — does not auto-diagnose migraine or SAH.',
      }
    ),
    select(
      'headacheSeverity',
      'Severity (clinician)',
      ['Mild', 'Moderate', 'Severe', 'Not documented'],
      'more',
      62,
      { section: 'Headache', showIf: yes('symptomHeadache') }
    ),
    tri('headachePhotophobia', 'Photophobia', 'more', 63, {
      section: 'Headache',
      showIf: yes('symptomHeadache'),
    }),
    tri('headachePhonophobia', 'Phonophobia', 'more', 64, {
      section: 'Headache',
      showIf: yes('symptomHeadache'),
    }),
    tri('headacheNausea', 'Nausea / vomiting', 'more', 65, {
      section: 'Headache',
      showIf: yes('symptomHeadache'),
    }),
    tri('headacheNeurologicalDeficit', 'Associated neurological deficit', 'more', 66, {
      section: 'Headache',
      showIf: yes('symptomHeadache'),
    }),
    textArea('headacheNote', 'Headache note', 'more', 67, {
      section: 'Headache',
      showIf: yes('symptomHeadache'),
      placeholder: 'Location, character, triggers — clinician only',
    }),

    // --- MORE: Seizure (ILAE 2025 clinician; no auto classify) ---
    dateField('seizureEventDate', 'Seizure event date', 'more', 70, {
      section: 'Seizure',
      showIf: yes('symptomSeizure'),
    }),
    select(
      'seizureFirstOrRecurrent',
      'First / recurrent',
      ['First', 'Recurrent', 'Not documented'],
      'more',
      71,
      { section: 'Seizure', showIf: yes('symptomSeizure') }
    ),
    text('seizureDuration', 'Seizure duration', 'more', 72, {
      section: 'Seizure',
      showIf: yes('symptomSeizure'),
      placeholder: 'e.g. ~2 minutes',
    }),
    tri('seizureWitnessed', 'Witnessed', 'more', 73, {
      section: 'Seizure',
      showIf: yes('symptomSeizure'),
    }),
    text('classificationProfile', 'Classification profile', 'more', 74, {
      section: 'Seizure',
      showIf: yes('symptomSeizure'),
      placeholder: 'ILAE',
      helpText: 'Default profile label ILAE — clinician-selected; system does not auto-classify.',
    }),
    text('classificationVersion', 'Classification version', 'more', 75, {
      section: 'Seizure',
      showIf: yes('symptomSeizure'),
      placeholder: '2025',
    }),
    select('seizureClass', 'Seizure class (clinician)', SEIZURE_CLASS_OPTIONS, 'more', 76, {
      section: 'Seizure',
      showIf: yes('symptomSeizure'),
      summaryLabel: 'Sz class',
      helpText:
        'Clinician-confirmed ILAE class only — no automatic classification. Legacy 2017 labels may be noted as free text below if needed.',
    }),
    tri('clinicianConfirmed', 'Clinician confirmed classification', 'more', 77, {
      section: 'Seizure',
      showIf: yes('symptomSeizure'),
    }),
    textArea('seizureLegacyClassificationNote', 'Legacy / free-text classification note', 'more', 78, {
      section: 'Seizure',
      showIf: yes('symptomSeizure'),
      placeholder: 'Optional — e.g. prior ILAE 2017 wording readable as free text',
    }),
    textArea('seizureNote', 'Seizure note', 'more', 79, {
      section: 'Seizure',
      showIf: yes('symptomSeizure'),
      placeholder: 'Aura, post-ictal, triggers — clinician only',
    }),

    // --- MORE: Stroke / TIA history ---
    select('strokeType', 'Stroke / TIA type', STROKE_TYPE_OPTIONS, 'more', 90, {
      section: 'Stroke / TIA history',
      showIf: yes('knownStrokeTia'),
      summaryLabel: 'Stroke type',
    }),
    dateField('strokeEventDate', 'Stroke / TIA date', 'more', 91, {
      section: 'Stroke / TIA history',
      showIf: yes('knownStrokeTia'),
    }),
    textArea('strokeResidualDeficit', 'Residual deficit', 'more', 92, {
      section: 'Stroke / TIA history',
      showIf: yes('knownStrokeTia'),
      placeholder: 'e.g. residual left hemiparesis',
    }),

    // --- MORE: Acute stroke documentation only ---
    text('lastKnownWellAt', 'Last known well at', 'more', 100, {
      section: 'Acute stroke (documentation)',
      placeholder: 'Date/time — clinician documented',
      helpText:
        'Documentation only — does not determine thrombolysis / reperfusion eligibility.',
    }),
    text('symptomDiscoveryAt', 'Symptom discovery at', 'more', 101, {
      section: 'Acute stroke (documentation)',
      placeholder: 'Separate from last known well — date/time',
      helpText: 'Keep separate from last known well. No eligibility automation.',
    }),
    textArea('deficitSummary', 'Deficit summary', 'more', 102, {
      section: 'Acute stroke (documentation)',
      placeholder: 'Clinician deficit description',
    }),
    text('strokeScoreRef', 'Stroke score event reference', 'more', 103, {
      section: 'Acute stroke (documentation)',
      placeholder: 'ClinicalScoreEvent id / label',
      helpText: 'Reference to ClinicalScoreEvent — do not embed score values here.',
    }),

    // --- MORE: LOC ---
    text('locDuration', 'LOC duration', 'more', 110, {
      section: 'Loss of consciousness',
      showIf: yes('symptomLoc'),
      placeholder: 'e.g. seconds / minutes',
    }),
    tri('locWitnessed', 'LOC witnessed', 'more', 111, {
      section: 'Loss of consciousness',
      showIf: yes('symptomLoc'),
    }),
    textArea('locNote', 'LOC note', 'more', 112, {
      section: 'Loss of consciousness',
      showIf: yes('symptomLoc'),
      placeholder: 'Prodrome, recovery, associated features',
    }),

    // --- MORE: Motor power (MRC text optional) ---
    text('motorPowerRue', 'Motor power RUE (MRC)', 'more', 120, {
      section: 'Motor power',
      placeholder: 'e.g. 5/5',
    }),
    text('motorPowerLue', 'Motor power LUE (MRC)', 'more', 121, {
      section: 'Motor power',
      placeholder: 'e.g. 4/5',
    }),
    text('motorPowerRle', 'Motor power RLE (MRC)', 'more', 122, {
      section: 'Motor power',
      placeholder: 'e.g. 5/5',
    }),
    text('motorPowerLle', 'Motor power LLE (MRC)', 'more', 123, {
      section: 'Motor power',
      placeholder: 'e.g. 3/5',
    }),
    textArea('motorPowerNote', 'Motor power note', 'more', 124, {
      section: 'Motor power',
      placeholder: 'Optional detail — clinician MRC text only',
    }),

    // --- MORE: Sensory / CN detail / reflexes / coordination / gait ---
    select('sensoryLaterality', 'Sensory laterality', LATERALITY_OPTIONS, 'more', 130, {
      section: 'Sensory detail',
    }),
    textArea('sensoryDetailNote', 'Sensory detail', 'more', 131, {
      section: 'Sensory detail',
      placeholder: 'Modalities, distribution — clinician only',
    }),
    textArea('cranialNerveDetail', 'Cranial nerve detail', 'more', 140, {
      section: 'Cranial nerves detail',
      placeholder: 'CN II–XII findings as documented',
    }),
    textArea('reflexesDetail', 'Reflexes detail', 'more', 150, {
      section: 'Reflexes detail',
      placeholder: 'DTRs, plantars — clinician only',
    }),
    textArea('coordinationDetail', 'Coordination detail', 'more', 160, {
      section: 'Coordination / gait detail',
      placeholder: 'Finger-nose, heel-shin, etc.',
    }),
    textArea('gaitDetail', 'Gait detail', 'more', 161, {
      section: 'Coordination / gait detail',
      placeholder: 'Gait description — clinician only',
    }),

    // --- MORE: Movement / cognition / neuropathy / demyelinating / neuromuscular ---
    textArea('movementDisorderNote', 'Movement disorder note', 'more', 170, {
      section: 'Movement disorders',
      placeholder: 'Tremor, rigidity, chorea — clinician only',
    }),
    textArea('cognitionNote', 'Cognition note', 'more', 180, {
      section: 'Cognition',
      placeholder: 'Orientation, memory, language — clinician only',
    }),
    textArea('neuropathyNote', 'Neuropathy note', 'more', 190, {
      section: 'Neuropathy',
      showIf: yes('knownNeuropathy'),
      placeholder: 'Distribution, type — clinician only',
    }),
    textArea('demyelinatingNote', 'Demyelinating disease note', 'more', 200, {
      section: 'Demyelinating',
      showIf: yes('knownMs'),
      placeholder: 'MS / demyelinating history — clinician only',
    }),
    textArea('neuromuscularNote', 'Neuromuscular note', 'more', 210, {
      section: 'Neuromuscular',
      showIf: yes('knownNeuromuscular'),
      placeholder: 'MG / myopathy / etc. — clinician only',
    }),

    // --- MORE: Score event refs (no embedded scores) ---
    text('nihssScoreEventRef', 'NIHSS ClinicalScoreEvent ref', 'more', 220, {
      section: 'Score references',
      placeholder: 'ClinicalScoreEvent id / label',
      helpText: 'String reference to ClinicalScoreEvent — do not embed NIHSS values.',
      summaryLabel: 'NIHSS ref',
    }),
    text('mrsScoreEventRef', 'mRS ClinicalScoreEvent ref', 'more', 221, {
      section: 'Score references',
      placeholder: 'ClinicalScoreEvent id / label',
      helpText: 'String reference to ClinicalScoreEvent — do not embed mRS values.',
      summaryLabel: 'mRS ref',
    }),
  ],
};

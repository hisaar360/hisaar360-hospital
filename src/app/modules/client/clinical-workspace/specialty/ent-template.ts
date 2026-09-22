import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyFieldSchema,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';

const SIDE_OPTIONS = ['Right', 'Left', 'Bilateral', 'Not documented'];
const NO_AUTO_DX =
  'Clinician-documented only — no autonomous diagnosis (e.g. no auto otitis / BPPV).';

function tri(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    summaryLabel?: string;
    showIf?: SpecialtyFieldSchema['showIf'];
    helpText?: string;
  }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'tri_state',
    group,
    displayOrder,
    section: options?.section,
    summaryLabel: options?.summaryLabel,
    showIf: options?.showIf,
    helpText: options?.helpText,
  };
}

function text(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    placeholder?: string;
    showIf?: SpecialtyFieldSchema['showIf'];
    summaryLabel?: string;
    helpText?: string;
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
    showIf: options?.showIf,
    summaryLabel: options?.summaryLabel,
    helpText: options?.helpText,
  };
}

function textArea(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    showIf?: SpecialtyFieldSchema['showIf'];
    placeholder?: string;
    helpText?: string;
  }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'textarea',
    group,
    displayOrder,
    section: options?.section,
    showIf: options?.showIf,
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
    showIf?: SpecialtyFieldSchema['showIf'];
    summaryLabel?: string;
    helpText?: string;
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
    showIf: options?.showIf,
    summaryLabel: options?.summaryLabel,
    helpText: options?.helpText,
  };
}

const yes = (field: string): SpecialtyFieldSchema['showIf'] => ({ field, equals: 'Yes' });

/**
 * ENT v1 — OPD consultation specialtyData (Phase M).
 * Flat keys only (generic engine has no nested objects).
 * No AudiologyTest model — audiometry/tympanometry are reference strings.
 * EndoscopyRecord remains GI-specific — ENT endoscopy is a document/procedure ref only.
 * Lab / Meds / OperationSchedule stay canonical elsewhere.
 */
export const ENT_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'ENT',
  name: 'ENT',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description:
    'OPD ENT consultation notes. Flat laterality keys; investigation refs only — no autonomous diagnoses.',
  fields: [
    // --- QUICK: Ear symptoms ---
    tri('rightEarPain', 'Right ear pain', 'quick', 1, {
      section: 'Ear symptoms',
      summaryLabel: 'R ear pain',
    }),
    tri('leftEarPain', 'Left ear pain', 'quick', 2, {
      section: 'Ear symptoms',
      summaryLabel: 'L ear pain',
    }),
    tri('rightEarDischarge', 'Right ear discharge', 'quick', 3, {
      section: 'Ear symptoms',
      summaryLabel: 'R discharge',
    }),
    tri('leftEarDischarge', 'Left ear discharge', 'quick', 4, {
      section: 'Ear symptoms',
      summaryLabel: 'L discharge',
    }),
    tri('hearingLoss', 'Hearing loss', 'quick', 5, {
      section: 'Ear symptoms',
      summaryLabel: 'Hearing',
    }),
    select('hearingSide', 'Hearing loss side', SIDE_OPTIONS, 'quick', 6, {
      section: 'Ear symptoms',
      showIf: yes('hearingLoss'),
    }),
    tri('tinnitus', 'Tinnitus', 'quick', 7, {
      section: 'Ear symptoms',
      summaryLabel: 'Tinnitus',
    }),
    select('tinnitusSide', 'Tinnitus side', SIDE_OPTIONS, 'quick', 8, {
      section: 'Ear symptoms',
      showIf: yes('tinnitus'),
    }),
    tri('vertigo', 'Vertigo / dizziness', 'quick', 9, {
      section: 'Ear symptoms',
      summaryLabel: 'Vertigo',
      helpText: NO_AUTO_DX,
    }),
    tri('rightEarBlockage', 'Right ear blockage', 'quick', 10, {
      section: 'Ear symptoms',
      summaryLabel: 'R blockage',
    }),
    tri('leftEarBlockage', 'Left ear blockage', 'quick', 11, {
      section: 'Ear symptoms',
      summaryLabel: 'L blockage',
    }),

    // --- QUICK: Nose / sinus ---
    tri('nasalObstruction', 'Nasal obstruction', 'quick', 20, {
      section: 'Nose / sinus',
      summaryLabel: 'Nasal obst.',
    }),
    select('nasalObstructionSide', 'Obstruction side', SIDE_OPTIONS, 'quick', 21, {
      section: 'Nose / sinus',
      showIf: yes('nasalObstruction'),
    }),
    tri('nasalDischarge', 'Nasal discharge', 'quick', 22, {
      section: 'Nose / sinus',
      summaryLabel: 'Nasal disch.',
    }),
    tri('epistaxis', 'Epistaxis', 'quick', 23, {
      section: 'Nose / sinus',
      summaryLabel: 'Epistaxis',
    }),
    select('epistaxisSide', 'Epistaxis side', SIDE_OPTIONS, 'quick', 24, {
      section: 'Nose / sinus',
      showIf: yes('epistaxis'),
    }),
    tri('sinusPain', 'Sinus pain / pressure', 'quick', 25, {
      section: 'Nose / sinus',
      summaryLabel: 'Sinus pain',
    }),

    // --- QUICK: Throat / voice / neck ---
    tri('soreThroat', 'Sore throat', 'quick', 30, {
      section: 'Throat / voice / neck',
      summaryLabel: 'Sore throat',
    }),
    tri('hoarseness', 'Hoarseness / voice change', 'quick', 31, {
      section: 'Throat / voice / neck',
      summaryLabel: 'Voice',
    }),
    tri('dysphagia', 'Dysphagia', 'quick', 32, {
      section: 'Throat / voice / neck',
      summaryLabel: 'Dysphagia',
    }),
    tri('neckMass', 'Neck mass / swelling', 'quick', 33, {
      section: 'Throat / voice / neck',
      summaryLabel: 'Neck mass',
    }),

    // --- QUICK: Exam + impression ---
    textArea('examinationSummary', 'Examination summary', 'quick', 40, {
      section: 'Exam summary',
      placeholder: 'Brief ENT exam summary',
      helpText: NO_AUTO_DX,
    }),
    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 41, {
      section: 'Exam summary',
      placeholder: 'Clinician assessment — not auto-diagnosed',
      helpText: NO_AUTO_DX,
    }),

    // --- QUICK: Investigation refs (no AudiologyTest / EndoscopyRecord ENT model) ---
    text('audiometryRef', 'Audiometry reference', 'quick', 50, {
      section: 'Investigations',
      placeholder: 'Report / document ID or brief label',
      helpText: 'Reference only — no AudiologyTest model in this phase.',
    }),
    text('tympanometryRef', 'Tympanometry reference', 'quick', 51, {
      section: 'Investigations',
      placeholder: 'Report / document ID',
      helpText: 'Reference only — no AudiologyTest model in this phase.',
    }),
    text('endoscopyRef', 'ENT endoscopy / procedure reference', 'quick', 52, {
      section: 'Investigations',
      placeholder: 'Document / procedure ID',
      helpText:
        'Document/procedure reference only. EndoscopyRecord is GI-specific — not used for ENT.',
    }),
    text('imagingRef', 'Imaging reference', 'quick', 53, {
      section: 'Investigations',
      placeholder: 'CT / MRI / X-ray document ID',
      helpText: 'Reference only — imaging stays in documents / radiology.',
    }),

    // --- MORE: Otoscopy (separate R/L; no auto otitis) ---
    text('rightEarOtoscopyCanal', 'Right ear canal (otoscopy)', 'more', 60, {
      section: 'Otoscopy',
      placeholder: 'Canal findings',
      helpText: NO_AUTO_DX,
    }),
    text('rightEarOtoscopyTm', 'Right tympanic membrane', 'more', 61, {
      section: 'Otoscopy',
      placeholder: 'TM findings',
      helpText: NO_AUTO_DX,
    }),
    text('leftEarOtoscopyCanal', 'Left ear canal (otoscopy)', 'more', 62, {
      section: 'Otoscopy',
      placeholder: 'Canal findings',
      helpText: NO_AUTO_DX,
    }),
    text('leftEarOtoscopyTm', 'Left tympanic membrane', 'more', 63, {
      section: 'Otoscopy',
      placeholder: 'TM findings',
      helpText: NO_AUTO_DX,
    }),

    // --- MORE: Hearing ---
    select(
      'hearingLossType',
      'Hearing loss type (clinician)',
      ['Conductive', 'Sensorineural', 'Mixed', 'Not documented', 'Other'],
      'more',
      70,
      {
        section: 'Hearing',
        showIf: yes('hearingLoss'),
        helpText: NO_AUTO_DX,
      }
    ),
    text('hearingLossDuration', 'Hearing loss duration', 'more', 71, {
      section: 'Hearing',
      showIf: yes('hearingLoss'),
      placeholder: 'e.g. 2 weeks, chronic',
    }),
    textArea('hearingLossNote', 'Hearing loss note', 'more', 72, {
      section: 'Hearing',
      showIf: yes('hearingLoss'),
    }),

    // --- MORE: Tinnitus / vertigo (no BPPV auto) ---
    textArea('tinnitusNote', 'Tinnitus note', 'more', 80, {
      section: 'Tinnitus / vertigo',
      showIf: yes('tinnitus'),
    }),
    select(
      'vertigoCharacter',
      'Vertigo character (clinician)',
      ['Spinning', 'Imbalance', 'Lightheaded', 'Not documented', 'Other'],
      'more',
      81,
      {
        section: 'Tinnitus / vertigo',
        showIf: yes('vertigo'),
        helpText: 'Description only — does not auto-diagnose BPPV or other syndromes.',
      }
    ),
    text('vertigoDuration', 'Vertigo duration / episode length', 'more', 82, {
      section: 'Tinnitus / vertigo',
      showIf: yes('vertigo'),
    }),
    textArea('vertigoNote', 'Vertigo note', 'more', 83, {
      section: 'Tinnitus / vertigo',
      showIf: yes('vertigo'),
      helpText: NO_AUTO_DX,
    }),

    // --- MORE: Nose / epistaxis / sinus ---
    textArea('epistaxisNote', 'Epistaxis note', 'more', 90, {
      section: 'Nose / epistaxis / sinus',
      showIf: yes('epistaxis'),
    }),
    text('sinusHistoryDuration', 'Sinus symptom duration', 'more', 91, {
      section: 'Nose / epistaxis / sinus',
      showIf: yes('sinusPain'),
      placeholder: 'e.g. acute 5 days, chronic',
    }),
    textArea('sinusHistoryNote', 'Sinus history note', 'more', 92, {
      section: 'Nose / epistaxis / sinus',
    }),
    textArea('nasalExamNote', 'Nasal exam note', 'more', 93, {
      section: 'Nose / epistaxis / sinus',
    }),

    // --- MORE: Throat / tonsils / voice / larynx / dysphagia ---
    tri('tonsillitisHistory', 'Tonsillitis / tonsil concern', 'more', 100, {
      section: 'Throat / tonsils / voice',
      summaryLabel: 'Tonsils',
    }),
    textArea('tonsilsNote', 'Tonsils / oropharynx note', 'more', 101, {
      section: 'Throat / tonsils / voice',
    }),
    textArea('voiceLarynxNote', 'Voice / larynx note', 'more', 102, {
      section: 'Throat / tonsils / voice',
      showIf: yes('hoarseness'),
      helpText: NO_AUTO_DX,
    }),
    textArea('dysphagiaNote', 'Dysphagia note (light)', 'more', 103, {
      section: 'Throat / tonsils / voice',
      showIf: yes('dysphagia'),
      placeholder: 'Solids / liquids / progressive — clinician note only',
    }),

    // --- MORE: Oral cavity / neck / salivary ---
    textArea('oralCavityNote', 'Oral cavity note', 'more', 110, {
      section: 'Oral cavity / neck / salivary',
    }),
    textArea('neckExamNote', 'Neck exam note', 'more', 111, {
      section: 'Oral cavity / neck / salivary',
      showIf: yes('neckMass'),
    }),
    tri('salivaryGlandConcern', 'Salivary gland concern', 'more', 112, {
      section: 'Oral cavity / neck / salivary',
      summaryLabel: 'Salivary',
    }),
    textArea('salivaryNote', 'Salivary gland note', 'more', 113, {
      section: 'Oral cavity / neck / salivary',
      showIf: yes('salivaryGlandConcern'),
    }),

    // --- MORE: Procedure / imaging refs ---
    text('procedureRef', 'Procedure reference', 'more', 120, {
      section: 'Procedure / imaging',
      placeholder: 'Optional procedure / OT document ID',
      helpText: 'Reference only — does not create OperationSchedule.',
    }),
    text('operationScheduleId', 'Operation schedule ID (optional)', 'more', 121, {
      section: 'Procedure / imaging',
      placeholder: 'Existing OperationSchedule id if already scheduled',
      helpText: 'Optional link only — specialty save does not create OT.',
    }),
    textArea('imagingSummary', 'Imaging summary', 'more', 122, {
      section: 'Procedure / imaging',
      placeholder: 'Brief clinician summary of referenced imaging',
    }),
  ],
};

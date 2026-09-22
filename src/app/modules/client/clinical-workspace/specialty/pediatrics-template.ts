import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyFieldSchema,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';

function tri(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; summaryLabel?: string; showIf?: SpecialtyFieldSchema['showIf'] }
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
  };
}

function textArea(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; showIf?: SpecialtyFieldSchema['showIf']; placeholder?: string }
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
  };
}

function select(
  key: string,
  label: string,
  optionsList: string[],
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; showIf?: SpecialtyFieldSchema['showIf']; summaryLabel?: string }
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
  };
}

const yes = (field: string): SpecialtyFieldSchema['showIf'] => ({ field, equals: 'Yes' });

/**
 * PEDIATRICS v1 — generic specialty engine template.
 * Visit owns CC/HPI/Exam/Dx/Advice/Vitals. Growth measurements stay canonical in vitals.
 * No autonomous FTT/malnutrition/autism diagnosis. Nursery/BirthRecord remain separate.
 */
export const PEDIATRICS_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'PEDIATRICS',
  name: 'Pediatrics',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description:
    'Age-specific pediatric context. Growth/immunization use canonical records; clinical decisions remain clinician-controlled.',
  fields: [
    // --- QUICK: Overview / birth ---
    select(
      'birthHistorySource',
      'Birth history source',
      ['Not documented', 'Hospital Birth Record', 'Caregiver reported', 'Both'],
      'quick',
      1,
      { section: 'Birth / neonatal summary' }
    ),
    text('gestationalAgeAtBirth', 'Gestational age at birth', 'quick', 2, {
      section: 'Birth / neonatal summary',
      placeholder: 'e.g. 38w / 32w',
    }),
    tri('bornPreterm', 'Preterm birth', 'quick', 3, {
      section: 'Birth / neonatal summary',
      summaryLabel: 'Preterm',
    }),
    select(
      'deliveryModeReported',
      'Mode of delivery (reported)',
      ['Not documented', 'Vaginal', 'Assisted', 'C-section', 'Other'],
      'quick',
      4,
      { section: 'Birth / neonatal summary' }
    ),
    text('birthWeightReported', 'Birth weight (reported)', 'quick', 5, {
      section: 'Birth / neonatal summary',
      placeholder: 'If no hospital Birth Record',
    }),
    tri('nicuHistory', 'NICU admission history', 'quick', 6, {
      section: 'Birth / neonatal summary',
      summaryLabel: 'NICU',
    }),
    text('nicuDuration', 'NICU duration / reason', 'quick', 7, {
      section: 'Birth / neonatal summary',
      showIf: yes('nicuHistory'),
    }),
    tri('neonatalJaundice', 'Neonatal jaundice', 'quick', 8, {
      section: 'Birth / neonatal summary',
    }),
    tri('useCorrectedAge', 'Use corrected age (clinician confirmed)', 'quick', 9, {
      section: 'Birth / neonatal summary',
      showIf: yes('bornPreterm'),
    }),
    textArea('birthHistoryNote', 'Birth / neonatal note', 'quick', 10, {
      section: 'Birth / neonatal summary',
      placeholder: 'Do not copy BirthRecord; note reported history if external birth',
    }),

    // --- QUICK: Feeding ---
    select(
      'feedingType',
      'Feeding',
      [
        'Not documented',
        'Breastfeeding',
        'Formula',
        'Mixed',
        'Complementary feeding',
        'Family diet',
        'Other',
      ],
      'quick',
      20,
      { section: 'Feeding / nutrition' }
    ),
    tri('feedingDifficulty', 'Feeding difficulty', 'quick', 21, {
      section: 'Feeding / nutrition',
    }),
    textArea('feedingNote', 'Feeding / nutrition note', 'quick', 22, {
      section: 'Feeding / nutrition',
      showIf: yes('feedingDifficulty'),
    }),
    tri('appetiteConcern', 'Appetite / diet concern', 'quick', 23, {
      section: 'Feeding / nutrition',
    }),

    // --- QUICK: Growth concern (clinician) ---
    select(
      'growthConcern',
      'Growth concern',
      ['Not assessed', 'No concern', 'Concern', 'Under review'],
      'quick',
      30,
      { section: 'Growth summary', summaryLabel: 'Growth' }
    ),
    textArea('growthConcernNote', 'Growth note', 'quick', 31, {
      section: 'Growth summary',
      showIf: { field: 'growthConcern', equals: 'Concern' },
      placeholder: 'Clinician concern — not auto-diagnosed from chart',
    }),

    // --- QUICK: Development ---
    select(
      'developmentOverall',
      'Development (overall)',
      ['Not assessed', 'No concern', 'Concern'],
      'quick',
      40,
      { section: 'Development', summaryLabel: 'Development' }
    ),
    tri('parentCaregiverConcern', 'Parent / caregiver concern', 'quick', 41, {
      section: 'Development',
    }),
    tri('clinicianDevelopmentConcern', 'Clinician development concern', 'quick', 42, {
      section: 'Development',
    }),
    tri('hearingConcern', 'Hearing concern', 'quick', 43, { section: 'Development' }),
    tri('visionConcern', 'Vision concern', 'quick', 44, { section: 'Development' }),
    tri('behaviorConcern', 'Behavior concern', 'quick', 45, { section: 'Development' }),
    textArea('developmentNote', 'Development note', 'quick', 46, {
      section: 'Development',
      showIf: { field: 'developmentOverall', equals: 'Concern' },
    }),

    // --- QUICK: Immunization summary (display-oriented; records are canonical) ---
    select(
      'immunizationSummaryStatus',
      'Immunization summary',
      ['Not reviewed', 'History recorded', 'Schedule not configured', 'Discussed with caregiver'],
      'quick',
      50,
      { section: 'Immunization summary', summaryLabel: 'Immunization' }
    ),
    textArea('immunizationVisitNote', 'Immunization visit note', 'quick', 51, {
      section: 'Immunization summary',
      placeholder: 'Do not copy lifelong vaccine list into this visit',
    }),

    // --- QUICK: Pediatric history ---
    tri('previousHospitalization', 'Previous hospitalization', 'quick', 60, {
      section: 'Pediatric history',
    }),
    text('previousHospitalizationNote', 'Hospitalization detail', 'quick', 61, {
      section: 'Pediatric history',
      showIf: yes('previousHospitalization'),
    }),
    tri('previousSurgery', 'Previous surgery', 'quick', 62, { section: 'Pediatric history' }),
    tri('recurrentInfectionHistory', 'Recurrent infection history', 'quick', 63, {
      section: 'Pediatric history',
    }),
    tri('asthmaWheezeHistory', 'Asthma / wheeze history', 'quick', 64, {
      section: 'Pediatric history',
      summaryLabel: 'Wheeze',
    }),
    tri('seizureHistory', 'Seizure history', 'quick', 65, {
      section: 'Pediatric history',
      summaryLabel: 'Seizure',
    }),
    tri('knownCongenitalCondition', 'Known congenital condition', 'quick', 66, {
      section: 'Pediatric history',
    }),
    tri('knownCardiacCondition', 'Known cardiac condition', 'quick', 67, {
      section: 'Pediatric history',
    }),
    textArea('pediatricHistoryNote', 'Other major history', 'quick', 68, {
      section: 'Pediatric history',
    }),
    textArea('clinicalImpression', 'Clinical impression / specialty note', 'quick', 70, {
      section: 'Assessment',
      placeholder: 'Clinician assessment — Visit tab owns diagnosis',
    }),

    // --- MORE: Developmental domains ---
    select(
      'devGrossMotor',
      'Gross motor',
      ['Not assessed', 'No concern', 'Concern'],
      'more',
      100,
      { section: 'Developmental domains' }
    ),
    select(
      'devFineMotor',
      'Fine motor',
      ['Not assessed', 'No concern', 'Concern'],
      'more',
      101,
      { section: 'Developmental domains' }
    ),
    select(
      'devLanguage',
      'Language / communication',
      ['Not assessed', 'No concern', 'Concern'],
      'more',
      102,
      { section: 'Developmental domains' }
    ),
    select(
      'devSocial',
      'Social / personal',
      ['Not assessed', 'No concern', 'Concern'],
      'more',
      103,
      { section: 'Developmental domains' }
    ),
    select(
      'devCognitive',
      'Cognitive / learning',
      ['Not assessed', 'No concern', 'Concern'],
      'more',
      104,
      { section: 'Developmental domains' }
    ),

    // --- MORE: Screening event (no copyrighted questionnaire content) ---
    tri('screeningPerformed', 'Developmental screening performed', 'more', 120, {
      section: 'Screening records',
    }),
    text('screeningToolName', 'Tool name', 'more', 121, {
      section: 'Screening records',
      showIf: yes('screeningPerformed'),
      placeholder: 'e.g. ASQ-3 — do not paste questionnaire items',
    }),
    text('screeningToolVersion', 'Tool version', 'more', 122, {
      section: 'Screening records',
      showIf: yes('screeningPerformed'),
    }),
    text('screeningDate', 'Screening date', 'more', 123, {
      section: 'Screening records',
      showIf: yes('screeningPerformed'),
    }),
    text('screeningResultSummary', 'Result summary', 'more', 124, {
      section: 'Screening records',
      showIf: yes('screeningPerformed'),
    }),
    textArea('screeningClinicianInterpretation', 'Clinician interpretation', 'more', 125, {
      section: 'Screening records',
      showIf: yes('screeningPerformed'),
      placeholder: 'Does not diagnose autism or developmental delay automatically',
    }),
    text('screeningDocumentRef', 'Document / reference', 'more', 126, {
      section: 'Screening records',
      showIf: yes('screeningPerformed'),
    }),

    // --- MORE: Family / social ---
    tri('familyConsanguinity', 'Consanguinity (if recorded)', 'more', 140, {
      section: 'Family history',
    }),
    tri('familyAsthmaAllergy', 'Family asthma / allergy', 'more', 141, {
      section: 'Family history',
    }),
    tri('familySeizure', 'Family seizure history', 'more', 142, { section: 'Family history' }),
    tri('familyDevelopmentalDisorder', 'Family developmental disorder', 'more', 143, {
      section: 'Family history',
    }),
    textArea('familyHistoryNote', 'Family history note', 'more', 144, {
      section: 'Family history',
    }),
    text('schoolOrDaycare', 'School / daycare', 'more', 160, {
      section: 'Social / environmental',
    }),
    tri('smokeExposure', 'Smoke exposure', 'more', 161, { section: 'Social / environmental' }),
    textArea('socialEnvironmentNote', 'Social / environmental note', 'more', 162, {
      section: 'Social / environmental',
    }),

    // --- MORE: Exam summary (age-specific; Visit owns general exam) ---
    text('examAppearance', 'General appearance', 'more', 180, {
      section: 'Pediatric examination summary',
    }),
    text('examHydration', 'Hydration', 'more', 181, { section: 'Pediatric examination summary' }),
    text('examActivity', 'Activity / interaction', 'more', 182, {
      section: 'Pediatric examination summary',
    }),
    tri('examPallor', 'Pallor', 'more', 183, { section: 'Pediatric examination summary' }),
    tri('examJaundice', 'Jaundice', 'more', 184, { section: 'Pediatric examination summary' }),
    tri('examCyanosis', 'Cyanosis', 'more', 185, { section: 'Pediatric examination summary' }),
    textArea('examRespiratorySummary', 'Respiratory summary', 'more', 186, {
      section: 'Pediatric examination summary',
    }),
    textArea('examCardiovascularSummary', 'Cardiovascular summary', 'more', 187, {
      section: 'Pediatric examination summary',
    }),
    textArea('examAbdominalSummary', 'Abdominal summary', 'more', 188, {
      section: 'Pediatric examination summary',
    }),
    textArea('examNeuroDevSummary', 'Neurological / developmental summary', 'more', 189, {
      section: 'Pediatric examination summary',
    }),
  ],
};

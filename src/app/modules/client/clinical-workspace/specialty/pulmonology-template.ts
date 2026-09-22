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

function integer(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    unit?: string;
    min?: number;
    max?: number;
    showIf?: SpecialtyFieldSchema['showIf'];
    summaryLabel?: string;
    helpText?: string;
  }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'integer',
    group,
    displayOrder,
    unit: options?.unit,
    min: options?.min,
    max: options?.max,
    section: options?.section,
    showIf: options?.showIf,
    summaryLabel: options?.summaryLabel,
    helpText: options?.helpText,
  };
}

function decimal(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    unit?: string;
    min?: number;
    max?: number;
    showIf?: SpecialtyFieldSchema['showIf'];
    helpText?: string;
  }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'decimal',
    group,
    displayOrder,
    unit: options?.unit,
    min: options?.min,
    max: options?.max,
    section: options?.section,
    showIf: options?.showIf,
    helpText: options?.helpText,
  };
}

function dateField(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; showIf?: SpecialtyFieldSchema['showIf'] }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'date',
    group,
    displayOrder,
    section: options?.section,
    showIf: options?.showIf,
  };
}

const yes = (field: string): SpecialtyFieldSchema['showIf'] => ({ field, equals: 'Yes' });
const smokingActive = (status: string): SpecialtyFieldSchema['showIf'] => ({
  field: 'smokingStatus',
  equals: status,
});

/**
 * PULMONOLOGY v1 — generic engine template (Phase I).
 * Visit owns CC/HPI/Exam/Dx/Advice/Vitals (incl. SpO2). Medicines stay on Visit tab.
 * No autonomous COPD/asthma diagnosis. Pack-years are cigarette-only (util); never from vaping/shisha.
 */
export const PULMONOLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'PULMONOLOGY',
  name: 'Pulmonology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description:
    'Structured respiratory history and exam. Clinical decisions remain clinician-controlled.',
  fields: [
    // --- QUICK: Respiratory symptoms ---
    tri('symptomCough', 'Cough', 'quick', 1, { section: 'Respiratory symptoms' }),
    tri('symptomDyspnea', 'Dyspnea', 'quick', 2, { section: 'Respiratory symptoms' }),
    tri('symptomWheeze', 'Wheeze', 'quick', 3, { section: 'Respiratory symptoms' }),
    tri('symptomSputum', 'Sputum production', 'quick', 4, { section: 'Respiratory symptoms' }),
    tri('symptomHemoptysis', 'Hemoptysis', 'quick', 5, {
      section: 'Respiratory symptoms',
      summaryLabel: 'Hemoptysis',
    }),
    tri('symptomChestTightness', 'Chest tightness', 'quick', 6, { section: 'Respiratory symptoms' }),
    tri('symptomOrthopnea', 'Orthopnea', 'quick', 7, { section: 'Respiratory symptoms' }),
    tri('symptomNightSymptoms', 'Nocturnal symptoms', 'quick', 8, {
      section: 'Respiratory symptoms',
    }),
    tri('symptomExerciseLimitation', 'Exercise limitation', 'quick', 9, {
      section: 'Respiratory symptoms',
    }),

    // --- QUICK: Known conditions (clinician-documented; never auto-diagnosed) ---
    tri('conditionAsthma', 'Asthma (known)', 'quick', 20, {
      section: 'Known respiratory conditions',
      summaryLabel: 'Asthma',
    }),
    tri('conditionCopd', 'COPD (known)', 'quick', 21, {
      section: 'Known respiratory conditions',
      summaryLabel: 'COPD',
    }),
    tri('conditionIld', 'Interstitial lung disease', 'quick', 22, {
      section: 'Known respiratory conditions',
      summaryLabel: 'ILD',
    }),
    tri('conditionBronchiectasis', 'Bronchiectasis', 'quick', 23, {
      section: 'Known respiratory conditions',
      summaryLabel: 'Bronchiectasis',
    }),
    tri('conditionTbHistory', 'TB history', 'quick', 24, {
      section: 'Known respiratory conditions',
      summaryLabel: 'TB Hx',
    }),
    tri('conditionObstructiveSleepApnea', 'OSA (known)', 'quick', 25, {
      section: 'Known respiratory conditions',
      summaryLabel: 'OSA',
    }),
    tri('conditionPulmonaryHypertension', 'Pulmonary hypertension', 'quick', 26, {
      section: 'Known respiratory conditions',
      summaryLabel: 'PH',
    }),
    tri('conditionLungCancer', 'Lung cancer / nodule under review', 'quick', 27, {
      section: 'Known respiratory conditions',
    }),
    tri('conditionRecentPneumonia', 'Recent pneumonia', 'quick', 28, {
      section: 'Known respiratory conditions',
    }),
    textArea('conditionNote', 'Condition note', 'quick', 29, {
      section: 'Known respiratory conditions',
      placeholder: 'Clinician-documented detail — not auto-diagnosed',
    }),

    // --- QUICK: Smoking / exposure ---
    select(
      'smokingStatus',
      'Cigarette smoking',
      ['Never', 'Former', 'Current', 'Not documented'],
      'quick',
      40,
      {
        section: 'Smoking / exposure',
        helpText: 'Pack-years apply to cigarettes only — not vaping or shisha.',
      }
    ),
    integer('cigarettesPerDay', 'Cigarettes per day', 'quick', 41, {
      section: 'Smoking / exposure',
      min: 0,
      max: 200,
      helpText: 'Use cigarettes/day or packs/day (not both required).',
    }),
    decimal('packsPerDay', 'Packs per day', 'quick', 42, {
      section: 'Smoking / exposure',
      min: 0,
      max: 20,
      helpText: '1 pack = 20 cigarettes. Alternative to cigarettes/day.',
    }),
    integer('yearsSmoked', 'Years smoked', 'quick', 43, {
      section: 'Smoking / exposure',
      min: 0,
      max: 80,
    }),
    integer('quitYear', 'Quit year', 'quick', 44, {
      section: 'Smoking / exposure',
      min: 1950,
      max: 2100,
      showIf: smokingActive('Former'),
    }),
    select(
      'vapingStatus',
      'Vaping / e-cigarette',
      ['Never', 'Former', 'Current', 'Not documented'],
      'quick',
      45,
      {
        section: 'Smoking / exposure',
        helpText: 'Recorded for history only — never used for pack-year calculation.',
      }
    ),
    select(
      'shishaStatus',
      'Shisha / hookah',
      ['Never', 'Former', 'Current', 'Not documented'],
      'quick',
      46,
      {
        section: 'Smoking / exposure',
        helpText: 'Recorded for history only — never used for pack-year calculation.',
      }
    ),
    tri('exposureBiomass', 'Biomass / indoor smoke exposure', 'quick', 47, {
      section: 'Smoking / exposure',
    }),
    tri('exposureOccupational', 'Occupational dust / fumes', 'quick', 48, {
      section: 'Smoking / exposure',
    }),
    tri('exposureSecondhandSmoke', 'Secondhand smoke', 'quick', 49, {
      section: 'Smoking / exposure',
    }),
    textArea('exposureNote', 'Exposure note', 'quick', 50, {
      section: 'Smoking / exposure',
    }),

    // --- QUICK: Lung function summary (visit references only; PFT module is longitudinal) ---
    select(
      'lastPftType',
      'Last PFT type (visit ref)',
      ['None documented', 'Spirometry', 'Full PFT', 'Peak flow', 'Other'],
      'quick',
      60,
      { section: 'Lung function summary' }
    ),
    dateField('lastPftDate', 'Last PFT date', 'quick', 61, { section: 'Lung function summary' }),
    decimal('lastFev1', 'Last FEV1 (visit ref)', 'quick', 62, {
      section: 'Lung function summary',
      unit: 'L',
      min: 0,
      max: 10,
      helpText: 'Reference only — does not diagnose obstruction or COPD.',
    }),
    decimal('lastFvc', 'Last FVC (visit ref)', 'quick', 63, {
      section: 'Lung function summary',
      unit: 'L',
      min: 0,
      max: 10,
    }),
    decimal('lastFev1Fvc', 'Last FEV1/FVC (visit ref)', 'quick', 64, {
      section: 'Lung function summary',
      min: 0,
      max: 1.5,
      helpText: 'Enter if known; ratio may also be shown from FEV1÷FVC when units match.',
    }),
    decimal('lastPef', 'Last PEF (visit ref)', 'quick', 65, {
      section: 'Lung function summary',
      unit: 'L/min',
      min: 0,
      max: 1000,
    }),
    text('lastPftReportRef', 'PFT report reference', 'quick', 66, {
      section: 'Lung function summary',
      placeholder: 'Document / report id or note',
    }),
    text('spo2VitalsNote', 'SpO2', 'quick', 67, {
      section: 'Lung function summary',
      helpText: 'SpO2 lives on Visit vitals — do not duplicate here.',
      placeholder: 'See Visit vitals (display-only reminder)',
    }),

    // --- QUICK: Exam summary ---
    text('examBreathSounds', 'Breath sounds', 'quick', 80, {
      section: 'Respiratory examination summary',
      placeholder: 'e.g. Vesicular / diminished / unequal',
    }),
    text('examWheeze', 'Wheeze', 'quick', 81, { section: 'Respiratory examination summary' }),
    text('examCrackles', 'Crackles / crepitations', 'quick', 82, {
      section: 'Respiratory examination summary',
    }),
    tri('examCyanosis', 'Cyanosis', 'quick', 83, { section: 'Respiratory examination summary' }),
    tri('examClubbing', 'Clubbing', 'quick', 84, {
      section: 'Respiratory examination summary',
      summaryLabel: 'Clubbing',
    }),
    text('examChestShape', 'Chest shape / symmetry', 'quick', 85, {
      section: 'Respiratory examination summary',
    }),
    textArea('examOtherFindings', 'Other respiratory findings', 'quick', 86, {
      section: 'Respiratory examination summary',
    }),
    textArea('clinicalImpression', 'Clinical impression / specialty note', 'quick', 90, {
      section: 'Assessment',
      placeholder: 'Clinician assessment — not auto-diagnosed',
    }),

    // --- MORE: Cough detail ---
    select(
      'coughDuration',
      'Cough duration',
      ['Acute (<3 weeks)', 'Subacute (3–8 weeks)', 'Chronic (>8 weeks)', 'Not documented'],
      'more',
      100,
      { section: 'Cough detail', showIf: yes('symptomCough') }
    ),
    select(
      'coughCharacter',
      'Cough character',
      ['Dry', 'Productive', 'Mixed', 'Not documented'],
      'more',
      101,
      { section: 'Cough detail', showIf: yes('symptomCough') }
    ),
    text('sputumColor', 'Sputum color / character', 'more', 102, {
      section: 'Cough detail',
      showIf: yes('symptomSputum'),
    }),
    textArea('coughNote', 'Cough note', 'more', 103, {
      section: 'Cough detail',
      showIf: yes('symptomCough'),
    }),

    // --- MORE: Dyspnea ---
    select(
      'dyspneaSeverity',
      'Dyspnea severity (clinician)',
      ['Mild', 'Moderate', 'Severe', 'Not assessed'],
      'more',
      120,
      { section: 'Dyspnea detail', showIf: yes('symptomDyspnea') }
    ),
    select(
      'dyspneaRelation',
      'Exertional relation',
      ['Exertional', 'At rest', 'Both', 'Not documented'],
      'more',
      121,
      { section: 'Dyspnea detail', showIf: yes('symptomDyspnea') }
    ),
    textArea('dyspneaNote', 'Dyspnea note', 'more', 122, {
      section: 'Dyspnea detail',
      showIf: yes('symptomDyspnea'),
    }),

    // --- MORE: Asthma (known) — control notes only; no auto diagnosis ---
    text('asthmaDiagnosisYear', 'Asthma diagnosis year', 'more', 140, {
      section: 'Asthma (known)',
      showIf: yes('conditionAsthma'),
      placeholder: 'e.g. 2015',
    }),
    select(
      'asthmaControlClinician',
      'Control (clinician)',
      ['Well controlled', 'Partly controlled', 'Uncontrolled', 'Not assessed'],
      'more',
      141,
      { section: 'Asthma (known)', showIf: yes('conditionAsthma') }
    ),
    tri('asthmaRecentExacerbation', 'Recent exacerbation', 'more', 142, {
      section: 'Asthma (known)',
      showIf: yes('conditionAsthma'),
    }),
    tri('asthmaHospitalization', 'Prior asthma hospitalization', 'more', 143, {
      section: 'Asthma (known)',
      showIf: yes('conditionAsthma'),
    }),
    textArea('asthmaNote', 'Asthma note', 'more', 144, {
      section: 'Asthma (known)',
      showIf: yes('conditionAsthma'),
      placeholder: 'Trigger / inhaler adherence notes — medicines remain on Visit tab',
    }),

    // --- MORE: COPD (known) — clinician notes only; no auto diagnosis from spirometry ---
    text('copdDiagnosisYear', 'COPD diagnosis year', 'more', 160, {
      section: 'COPD (known)',
      showIf: yes('conditionCopd'),
    }),
    select(
      'copdSeverityClinician',
      'Severity (clinician)',
      ['Mild', 'Moderate', 'Severe', 'Very severe', 'Not classified'],
      'more',
      161,
      {
        section: 'COPD (known)',
        showIf: yes('conditionCopd'),
        helpText: 'Clinician classification only — not derived from FEV1 automatically.',
      }
    ),
    tri('copdRecentExacerbation', 'Recent exacerbation', 'more', 162, {
      section: 'COPD (known)',
      showIf: yes('conditionCopd'),
    }),
    tri('copdHospitalization', 'Prior COPD hospitalization', 'more', 163, {
      section: 'COPD (known)',
      showIf: yes('conditionCopd'),
    }),
    tri('copdHomeOxygen', 'Home oxygen', 'more', 164, {
      section: 'COPD (known)',
      showIf: yes('conditionCopd'),
      summaryLabel: 'Home O₂',
    }),
    textArea('copdNote', 'COPD note', 'more', 165, {
      section: 'COPD (known)',
      showIf: yes('conditionCopd'),
      placeholder: 'Clinician notes — medicines remain on Visit tab',
    }),

    // --- MORE: Detailed exam ---
    text('examPercussion', 'Percussion', 'more', 180, {
      section: 'Detailed respiratory examination',
    }),
    text('examAccessoryMuscles', 'Accessory muscle use', 'more', 181, {
      section: 'Detailed respiratory examination',
    }),
    tri('examTrachealDeviation', 'Tracheal deviation', 'more', 182, {
      section: 'Detailed respiratory examination',
    }),
    textArea('examDetailedNote', 'Detailed exam note', 'more', 183, {
      section: 'Detailed respiratory examination',
    }),

    // --- MORE: Investigations (references only) ---
    dateField('cxrDate', 'Chest X-ray date', 'more', 200, { section: 'Imaging' }),
    textArea('cxrSummary', 'Chest X-ray summary', 'more', 201, { section: 'Imaging' }),
    text('cxrDocumentRef', 'Chest X-ray document reference', 'more', 202, { section: 'Imaging' }),
    dateField('ctChestDate', 'CT chest date', 'more', 210, { section: 'Imaging' }),
    textArea('ctChestSummary', 'CT chest summary', 'more', 211, { section: 'Imaging' }),
    text('ctChestDocumentRef', 'CT document reference', 'more', 212, { section: 'Imaging' }),
    select(
      'otherInvestigationType',
      'Other investigation',
      ['None', 'ABG', 'Sputum culture', 'Bronchoscopy', 'Sleep study', '6MWT', 'Other'],
      'more',
      220,
      { section: 'Other investigations' }
    ),
    dateField('otherInvestigationDate', 'Investigation date', 'more', 221, {
      section: 'Other investigations',
    }),
    textArea('otherInvestigationSummary', 'Investigation summary', 'more', 222, {
      section: 'Other investigations',
    }),
    text('otherInvestigationRef', 'Report / document reference', 'more', 223, {
      section: 'Other investigations',
    }),
  ],
};

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

/**
 * CARDIOLOGY v1 — generic engine template.
 * Canonical BP/vitals, meds, labs remain outside specialtyData.
 * No autonomous diagnosis / ACS / anticoagulation logic.
 */
export const CARDIOLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'CARDIOLOGY',
  name: 'Cardiology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'Structured cardiac history and exam. Clinical decisions remain clinician-controlled.',
  fields: [
    // --- QUICK: Cardiac symptoms ---
    tri('symptomChestDiscomfort', 'Chest discomfort', 'quick', 1, { section: 'Cardiac symptoms' }),
    tri('symptomDyspnea', 'Dyspnea', 'quick', 2, { section: 'Cardiac symptoms' }),
    tri('symptomPalpitations', 'Palpitations', 'quick', 3, { section: 'Cardiac symptoms' }),
    tri('symptomSyncope', 'Syncope / presyncope', 'quick', 4, { section: 'Cardiac symptoms' }),
    tri('symptomOrthopnea', 'Orthopnea', 'quick', 5, { section: 'Cardiac symptoms' }),
    tri('symptomPnd', 'PND', 'quick', 6, { section: 'Cardiac symptoms' }),
    tri('symptomEdema', 'Peripheral edema', 'quick', 7, { section: 'Cardiac symptoms' }),
    tri('symptomExerciseLimitation', 'Reduced exercise tolerance', 'quick', 8, {
      section: 'Cardiac symptoms',
    }),

    // --- QUICK: Known conditions ---
    tri('conditionHypertension', 'Hypertension', 'quick', 20, {
      section: 'Known cardiac conditions',
      summaryLabel: 'HTN',
    }),
    tri('conditionCad', 'Coronary artery disease', 'quick', 21, {
      section: 'Known cardiac conditions',
      summaryLabel: 'CAD',
    }),
    tri('conditionPreviousMi', 'Previous MI', 'quick', 22, {
      section: 'Known cardiac conditions',
      summaryLabel: 'MI',
    }),
    text('miYear', 'MI year / date', 'quick', 23, {
      section: 'Known cardiac conditions',
      showIf: yes('conditionPreviousMi'),
      placeholder: 'e.g. 2021',
    }),
    textArea('miNote', 'MI note', 'quick', 24, {
      section: 'Known cardiac conditions',
      showIf: yes('conditionPreviousMi'),
    }),
    tri('conditionHeartFailure', 'Heart failure', 'quick', 25, {
      section: 'Known cardiac conditions',
      summaryLabel: 'HF',
    }),
    tri('conditionAf', 'Atrial fibrillation', 'quick', 26, {
      section: 'Known cardiac conditions',
      summaryLabel: 'AF',
    }),
    tri('conditionOtherArrhythmia', 'Other arrhythmia', 'quick', 27, {
      section: 'Known cardiac conditions',
    }),
    tri('conditionValvular', 'Valvular disease', 'quick', 28, {
      section: 'Known cardiac conditions',
      summaryLabel: 'Valve',
    }),
    tri('conditionCardiomyopathy', 'Cardiomyopathy', 'quick', 29, {
      section: 'Known cardiac conditions',
    }),
    tri('conditionCongenital', 'Congenital heart disease', 'quick', 30, {
      section: 'Known cardiac conditions',
    }),

    // --- QUICK: Cardiac history ---
    tri('historyPci', 'Previous PCI / stent', 'quick', 40, {
      section: 'Cardiac history',
      summaryLabel: 'PCI',
    }),
    text('pciYear', 'PCI year', 'quick', 41, {
      section: 'Cardiac history',
      showIf: yes('historyPci'),
      placeholder: 'e.g. 2023',
      summaryLabel: 'PCI',
    }),
    text('pciNote', 'PCI / stent note', 'quick', 42, {
      section: 'Cardiac history',
      showIf: yes('historyPci'),
      placeholder: 'Vessel / facility if known',
    }),
    tri('historyCabg', 'Previous CABG', 'quick', 43, {
      section: 'Cardiac history',
      summaryLabel: 'CABG',
    }),
    text('cabgYear', 'CABG year', 'quick', 44, {
      section: 'Cardiac history',
      showIf: yes('historyCabg'),
    }),
    tri('historyPacemaker', 'Pacemaker', 'quick', 45, {
      section: 'Cardiac history',
      summaryLabel: 'PPM',
    }),
    tri('historyIcd', 'ICD / CRT', 'quick', 46, {
      section: 'Cardiac history',
      summaryLabel: 'ICD',
    }),
    tri('historyCardiacSurgery', 'Previous cardiac surgery', 'quick', 47, {
      section: 'Cardiac history',
    }),

    // --- QUICK: Latest cardiac function ---
    integer('lvefPercent', 'Last known LVEF', 'quick', 50, {
      section: 'Latest cardiac function',
      unit: '%',
      min: 0,
      max: 100,
      summaryLabel: 'EF',
      helpText: 'Measurement only — does not diagnose heart failure.',
    }),
    select(
      'lvefSource',
      'LVEF source',
      ['Echocardiogram', 'Cardiac MRI', 'Nuclear study', 'Other'],
      'quick',
      51,
      { section: 'Latest cardiac function' }
    ),
    dateField('lvefDate', 'LVEF date', 'quick', 52, { section: 'Latest cardiac function' }),
    text('lvefReportRef', 'Echo / report reference', 'quick', 53, {
      section: 'Latest cardiac function',
      placeholder: 'Document or report id/note',
    }),

    // --- QUICK: Exam summary ---
    text('examRhythm', 'Rhythm', 'quick', 60, {
      section: 'Cardiac examination summary',
      placeholder: 'e.g. Regular / Irregular',
    }),
    text('examHeartSounds', 'Heart sounds', 'quick', 61, { section: 'Cardiac examination summary' }),
    text('examMurmur', 'Murmur', 'quick', 62, { section: 'Cardiac examination summary' }),
    text('examJvp', 'JVP', 'quick', 63, { section: 'Cardiac examination summary' }),
    text('examEdema', 'Peripheral edema', 'quick', 64, { section: 'Cardiac examination summary' }),
    textArea('examOtherFindings', 'Other cardiovascular findings', 'quick', 65, {
      section: 'Cardiac examination summary',
    }),
    textArea('clinicalImpression', 'Clinical impression / specialty note', 'quick', 70, {
      section: 'Assessment',
      placeholder: 'Clinician assessment — not auto-diagnosed',
    }),

    // --- MORE: Chest discomfort detail ---
    select(
      'chestOnset',
      'Chest discomfort onset',
      ['Sudden', 'Gradual', 'Not documented'],
      'more',
      100,
      { section: 'Chest discomfort', showIf: yes('symptomChestDiscomfort') }
    ),
    text('chestLocation', 'Location', 'more', 101, {
      section: 'Chest discomfort',
      showIf: yes('symptomChestDiscomfort'),
    }),
    select(
      'chestCharacter',
      'Character',
      ['Pressure', 'Tightness', 'Squeezing', 'Heaviness', 'Burning', 'Sharp', 'Other', 'Not documented'],
      'more',
      102,
      { section: 'Chest discomfort', showIf: yes('symptomChestDiscomfort') }
    ),
    text('chestRadiation', 'Radiation', 'more', 103, {
      section: 'Chest discomfort',
      showIf: yes('symptomChestDiscomfort'),
      placeholder: 'Arm / neck / jaw / back / other',
    }),
    text('chestDuration', 'Duration', 'more', 104, {
      section: 'Chest discomfort',
      showIf: yes('symptomChestDiscomfort'),
    }),
    text('chestPrecipitating', 'Precipitating factor', 'more', 105, {
      section: 'Chest discomfort',
      showIf: yes('symptomChestDiscomfort'),
    }),
    select(
      'chestExertional',
      'Exertional relation',
      ['Exertional', 'At rest', 'Both', 'Not documented'],
      'more',
      106,
      { section: 'Chest discomfort', showIf: yes('symptomChestDiscomfort') }
    ),
    text('chestRelieving', 'Relieving factor', 'more', 107, {
      section: 'Chest discomfort',
      showIf: yes('symptomChestDiscomfort'),
    }),
    select(
      'chestClinicianClass',
      'Clinician classification',
      ['Cardiac', 'Possibly cardiac', 'Noncardiac', 'Undetermined', 'Not assessed'],
      'more',
      108,
      { section: 'Chest discomfort', showIf: yes('symptomChestDiscomfort') }
    ),

    // --- MORE: HF ---
    textArea('hfHistoryNote', 'HF history note', 'more', 120, {
      section: 'Heart failure / functional status',
      showIf: yes('conditionHeartFailure'),
    }),
    tri('hfPreviousAdmission', 'Previous HF admission', 'more', 121, {
      section: 'Heart failure / functional status',
      showIf: yes('conditionHeartFailure'),
    }),
    select(
      'hfPhenotype',
      'Clinician HF classification',
      ['HFrEF', 'HFmrEF', 'HFpEF', 'HFimpEF', 'Other', 'Not classified'],
      'more',
      122,
      { section: 'Heart failure / functional status', showIf: yes('conditionHeartFailure') }
    ),
    select(
      'nyhaClass',
      'NYHA class',
      ['I', 'II', 'III', 'IV', 'Not assessed'],
      'more',
      123,
      {
        section: 'Heart failure / functional status',
        showIf: yes('conditionHeartFailure'),
        summaryLabel: 'NYHA',
      }
    ),
    text('orthopneaPillows', 'Pillows for orthopnea', 'more', 124, {
      section: 'Heart failure / functional status',
      showIf: yes('symptomOrthopnea'),
    }),
    text('recentWeightChange', 'Recent weight change', 'more', 125, {
      section: 'Heart failure / functional status',
    }),

    // --- MORE: AF / arrhythmia ---
    select(
      'afPattern',
      'AF pattern (clinician)',
      ['Paroxysmal', 'Persistent', 'Long-standing persistent', 'Permanent', 'Other', 'Not documented'],
      'more',
      140,
      { section: 'Arrhythmia / AF', showIf: yes('conditionAf') }
    ),
    text('afDiagnosisYear', 'AF diagnosis year', 'more', 141, {
      section: 'Arrhythmia / AF',
      showIf: yes('conditionAf'),
    }),
    tri('afPriorCardioversion', 'Previous cardioversion', 'more', 142, {
      section: 'Arrhythmia / AF',
      showIf: yes('conditionAf'),
    }),
    tri('afPriorAblation', 'Previous ablation', 'more', 143, {
      section: 'Arrhythmia / AF',
      showIf: yes('conditionAf'),
    }),
    textArea('arrhythmiaNote', 'Arrhythmia note', 'more', 144, {
      section: 'Arrhythmia / AF',
    }),

    // --- MORE: Devices ---
    select(
      'deviceType',
      'Device type',
      ['Pacemaker', 'ICD', 'CRT-P', 'CRT-D', 'Other', 'None'],
      'more',
      160,
      { section: 'Devices' }
    ),
    text('deviceImplantYear', 'Implant year', 'more', 161, { section: 'Devices' }),
    text('deviceModel', 'Manufacturer / model', 'more', 162, { section: 'Devices' }),
    dateField('deviceLastCheck', 'Last device check', 'more', 163, { section: 'Devices' }),
    textArea('deviceNote', 'Device note', 'more', 164, { section: 'Devices' }),

    // --- MORE: Valves ---
    select(
      'valveAortic',
      'Aortic valve',
      ['None documented', 'AS', 'AR', 'Mixed', 'Other'],
      'more',
      180,
      { section: 'Valvular disease' }
    ),
    select(
      'valveMitral',
      'Mitral valve',
      ['None documented', 'MS', 'MR', 'Mixed', 'Other'],
      'more',
      181,
      { section: 'Valvular disease' }
    ),
    select(
      'valveSeverity',
      'Severity (if documented)',
      ['Mild', 'Moderate', 'Severe', 'Not documented'],
      'more',
      182,
      { section: 'Valvular disease' }
    ),
    tri('valvePriorRepair', 'Previous valve repair', 'more', 183, { section: 'Valvular disease' }),
    tri('valvePriorReplacement', 'Previous valve replacement', 'more', 184, {
      section: 'Valvular disease',
    }),
    select(
      'valveProsthesisType',
      'Prosthesis type',
      ['Mechanical', 'Bioprosthetic', 'Not documented'],
      'more',
      185,
      { section: 'Valvular disease', showIf: yes('valvePriorReplacement') }
    ),

    // --- MORE: Cardiomyopathy / risk ---
    select(
      'cardiomyopathyType',
      'Cardiomyopathy type',
      ['Dilated', 'Hypertrophic', 'Restrictive', 'Ischemic', 'Other', 'Unspecified'],
      'more',
      200,
      { section: 'Cardiomyopathy', showIf: yes('conditionCardiomyopathy') }
    ),
    tri('riskDiabetes', 'Diabetes', 'more', 210, { section: 'Cardiovascular risk factors' }),
    tri('riskDyslipidemia', 'Dyslipidemia', 'more', 211, { section: 'Cardiovascular risk factors' }),
    select(
      'riskSmoking',
      'Smoking',
      ['Never', 'Former', 'Current', 'Not documented'],
      'more',
      212,
      { section: 'Cardiovascular risk factors' }
    ),
    tri('riskFamilyPrematureCad', 'Family Hx premature CVD', 'more', 213, {
      section: 'Cardiovascular risk factors',
    }),
    tri('riskCkd', 'CKD', 'more', 214, { section: 'Cardiovascular risk factors' }),
    text('bpControlNote', 'BP control note (vitals remain canonical)', 'more', 215, {
      section: 'Cardiovascular risk factors',
      placeholder: 'Home BP / orthostatic note — do not duplicate systolic/diastolic here',
    }),

    // --- MORE: Detailed exam ---
    text('examPulseCharacter', 'Pulse character', 'more', 230, {
      section: 'Detailed cardiovascular examination',
    }),
    text('examMurmurLocation', 'Murmur location', 'more', 231, {
      section: 'Detailed cardiovascular examination',
    }),
    text('examMurmurGrade', 'Murmur grade', 'more', 232, {
      section: 'Detailed cardiovascular examination',
    }),
    text('examPeripheralPulses', 'Peripheral pulses', 'more', 233, {
      section: 'Detailed cardiovascular examination',
    }),
    tri('examCarotidBruit', 'Carotid bruit', 'more', 234, {
      section: 'Detailed cardiovascular examination',
    }),
    textArea('examCongestionSigns', 'Signs of congestion', 'more', 235, {
      section: 'Detailed cardiovascular examination',
    }),

    // --- MORE: Investigations (references only) ---
    dateField('ecgDate', 'ECG date', 'more', 250, { section: 'ECG' }),
    text('ecgRate', 'ECG rate', 'more', 251, { section: 'ECG' }),
    text('ecgRhythm', 'ECG rhythm', 'more', 252, { section: 'ECG' }),
    textArea('ecgInterpretation', 'ECG clinician interpretation', 'more', 253, {
      section: 'ECG',
      placeholder: 'Clinician interpretation — not automated',
    }),
    text('ecgDocumentRef', 'ECG document reference', 'more', 254, { section: 'ECG' }),

    dateField('echoDate', 'Echo date', 'more', 260, { section: 'Echocardiography' }),
    textArea('echoLvSummary', 'LV function summary', 'more', 261, { section: 'Echocardiography' }),
    textArea('echoRvSummary', 'RV function summary', 'more', 262, { section: 'Echocardiography' }),
    textArea('echoValveSummary', 'Valve findings summary', 'more', 263, {
      section: 'Echocardiography',
    }),
    textArea('echoOtherFindings', 'Other echo findings', 'more', 264, {
      section: 'Echocardiography',
    }),
    text('echoDocumentRef', 'Echo report reference', 'more', 265, { section: 'Echocardiography' }),

    select(
      'otherInvestigationType',
      'Other investigation',
      [
        'None',
        'Holter',
        'Event monitor',
        'Stress test',
        'CT coronary angiography',
        'Coronary angiography',
        'Cardiac MRI',
        'Nuclear study',
        'Other',
      ],
      'more',
      280,
      { section: 'Other investigations' }
    ),
    dateField('otherInvestigationDate', 'Investigation date', 'more', 281, {
      section: 'Other investigations',
    }),
    textArea('otherInvestigationSummary', 'Investigation summary', 'more', 282, {
      section: 'Other investigations',
    }),
    text('otherInvestigationRef', 'Report / document reference', 'more', 283, {
      section: 'Other investigations',
    }),
  ],
};

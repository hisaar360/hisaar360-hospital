import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { dateField, decimal, select, text, textArea, tri, yes } from './gi-shared-fields';

/**
 * HEPATOLOGY v1 — generic engine template (Phase J).
 * Separate from GASTROENTEROLOGY — do not merge into one GI/Liver form.
 * Scores are clinician-documented (external/verified) — no autonomous MELD engine.
 * Child-Pugh: clinician-selected class OR stored inputs snapshot only (not auto transplant).
 */
export const HEPATOLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'HEPATOLOGY',
  name: 'Hepatology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description:
    'Structured liver history and exam. Scores are recorded, not auto-computed. Clinical decisions remain clinician-controlled.',
  fields: [
    // --- QUICK: Liver symptoms / decompensation ---
    tri('symptomJaundice', 'Jaundice', 'quick', 1, {
      section: 'Liver symptoms / decompensation',
      summaryLabel: 'Jaundice',
    }),
    tri('symptomAscites', 'Ascites (reported)', 'quick', 2, {
      section: 'Liver symptoms / decompensation',
      summaryLabel: 'Ascites',
    }),
    tri('symptomEdema', 'Peripheral edema', 'quick', 3, {
      section: 'Liver symptoms / decompensation',
    }),
    tri('symptomEncephalopathy', 'Hepatic encephalopathy (reported)', 'quick', 4, {
      section: 'Liver symptoms / decompensation',
      summaryLabel: 'HE',
    }),
    tri('symptomPruritus', 'Pruritus', 'quick', 5, {
      section: 'Liver symptoms / decompensation',
    }),
    tri('symptomFatigue', 'Fatigue', 'quick', 6, {
      section: 'Liver symptoms / decompensation',
    }),
    tri('symptomAbdominalDistension', 'Abdominal distension', 'quick', 7, {
      section: 'Liver symptoms / decompensation',
    }),
    tri('symptomGiBleed', 'GI bleed (variceal concern)', 'quick', 8, {
      section: 'Liver symptoms / decompensation',
      summaryLabel: 'Bleed',
    }),
    tri('decompensationEpisode', 'Current decompensation episode', 'quick', 9, {
      section: 'Liver symptoms / decompensation',
      summaryLabel: 'Decomp',
    }),

    // --- QUICK: Etiology (clinician-documented) ---
    tri('etiologyHbv', 'HBV', 'quick', 20, {
      section: 'Etiology',
      summaryLabel: 'HBV',
    }),
    tri('etiologyHcv', 'HCV', 'quick', 21, {
      section: 'Etiology',
      summaryLabel: 'HCV',
    }),
    tri('etiologyAlcohol', 'Alcohol-related', 'quick', 22, {
      section: 'Etiology',
      summaryLabel: 'Alcohol',
    }),
    tri('etiologyNafld', 'NAFLD / MASLD', 'quick', 23, {
      section: 'Etiology',
      summaryLabel: 'MASLD',
    }),
    tri('etiologyAutoimmune', 'Autoimmune hepatitis', 'quick', 24, {
      section: 'Etiology',
    }),
    tri('etiologyPbcPsc', 'PBC / PSC', 'quick', 25, { section: 'Etiology' }),
    tri('etiologyDrugInduced', 'Drug-induced liver injury', 'quick', 26, {
      section: 'Etiology',
    }),
    tri('etiologyOther', 'Other etiology', 'quick', 27, { section: 'Etiology' }),
    textArea('etiologyNote', 'Etiology note', 'quick', 28, {
      section: 'Etiology',
      placeholder: 'Clinician-documented etiology — not auto-diagnosed',
    }),

    // --- QUICK: Cirrhosis status ---
    select(
      'cirrhosisStatus',
      'Cirrhosis status',
      ['No', 'Compensated', 'Decompensated', 'Suspected', 'Not assessed'],
      'quick',
      40,
      { section: 'Cirrhosis status', summaryLabel: 'Cirrhosis' }
    ),
    text('cirrhosisDiagnosisYear', 'Cirrhosis diagnosis year', 'quick', 41, {
      section: 'Cirrhosis status',
      placeholder: 'e.g. 2020',
    }),
    textArea('cirrhosisNote', 'Cirrhosis note', 'quick', 42, {
      section: 'Cirrhosis status',
    }),

    // --- QUICK: Portal hypertension ---
    tri('portalHtnKnown', 'Portal hypertension (known)', 'quick', 50, {
      section: 'Portal hypertension',
      summaryLabel: 'PHTN',
    }),
    tri('portalVaricesKnown', 'Varices (known)', 'quick', 51, {
      section: 'Portal hypertension',
      summaryLabel: 'Varices',
    }),
    tri('portalPriorBleed', 'Prior variceal bleed', 'quick', 52, {
      section: 'Portal hypertension',
    }),
    tri('portalPriorBanding', 'Prior banding / sclerotherapy', 'quick', 53, {
      section: 'Portal hypertension',
    }),
    textArea('portalHtnNote', 'Portal HTN note', 'quick', 54, {
      section: 'Portal hypertension',
    }),

    // --- QUICK: Viral hepatitis ---
    select(
      'hbvStatus',
      'HBV status (clinician)',
      ['Negative', 'Chronic', 'Resolved', 'Immune', 'Unknown', 'Not documented'],
      'quick',
      60,
      { section: 'Viral hepatitis', showIf: yes('etiologyHbv') }
    ),
    select(
      'hcvStatus',
      'HCV status (clinician)',
      ['Negative', 'Chronic untreated', 'Treated / SVR', 'Unknown', 'Not documented'],
      'quick',
      61,
      { section: 'Viral hepatitis', showIf: yes('etiologyHcv') }
    ),
    text('viralHepNote', 'Viral hepatitis note', 'quick', 62, {
      section: 'Viral hepatitis',
      placeholder: 'Serology / VL refs — labs remain on Lab module',
    }),

    // --- QUICK: Fibrosis / elastography refs ---
    select(
      'fibrosisRefMethod',
      'Fibrosis assessment method',
      ['None documented', 'Elastography', 'FibroScan', 'Biopsy', 'Imaging', 'Other'],
      'quick',
      70,
      { section: 'Fibrosis references' }
    ),
    text('fibrosisStageRef', 'Fibrosis stage (reported)', 'quick', 71, {
      section: 'Fibrosis references',
      placeholder: 'e.g. F3 / F4 — clinician-reported',
      summaryLabel: 'Fibrosis',
    }),
    decimal('elastographyKpa', 'Elastography (kPa)', 'quick', 72, {
      section: 'Fibrosis references',
      unit: 'kPa',
      min: 0,
      max: 100,
      helpText: 'Visit reference only — not an auto-staging engine.',
    }),
    dateField('fibrosisAssessmentDate', 'Assessment date', 'quick', 73, {
      section: 'Fibrosis references',
    }),
    text('fibrosisReportRef', 'Report reference', 'quick', 74, {
      section: 'Fibrosis references',
    }),
    textArea('fibrosisNote', 'Fibrosis / elastography note', 'quick', 75, {
      section: 'Fibrosis references',
      placeholder: 'e.g. Elastography note for visit specialtyData',
    }),

    // --- QUICK: Scores (external / clinician-verified — no auto MELD) ---
    text('meldScoreName', 'Score name', 'quick', 80, {
      section: 'Clinical scores (documented)',
      placeholder: 'e.g. MELD',
      helpText: 'Record external or verified scores only — no autonomous MELD formula.',
    }),
    text('meldScoreVersion', 'Score version', 'quick', 81, {
      section: 'Clinical scores (documented)',
      placeholder: 'e.g. MELD 3.0',
      summaryLabel: 'MELD ver',
      helpText: 'Explicit version string required when recording MELD.',
    }),
    text('meldScoreValue', 'Score value', 'quick', 82, {
      section: 'Clinical scores (documented)',
      placeholder: 'e.g. 18',
      summaryLabel: 'MELD',
    }),
    dateField('meldScoreDate', 'Score date', 'quick', 83, {
      section: 'Clinical scores (documented)',
    }),
    select(
      'meldScoreSource',
      'Score source',
      ['External calculator', 'Verified from chart', 'Other', 'Not documented'],
      'quick',
      84,
      { section: 'Clinical scores (documented)' }
    ),
    tri('meldClinicianVerified', 'Clinician verified', 'quick', 85, {
      section: 'Clinical scores (documented)',
    }),
    select(
      'childPughClass',
      'Child-Pugh class (clinician)',
      ['A', 'B', 'C', 'Not assessed'],
      'quick',
      86,
      {
        section: 'Clinical scores (documented)',
        summaryLabel: 'CTP',
        helpText: 'Optional clinician-selected class — not used for auto transplant listing.',
      }
    ),
    textArea('childPughInputsSnapshot', 'Child-Pugh inputs snapshot', 'quick', 87, {
      section: 'Clinical scores (documented)',
      placeholder: 'Optional stored inputs for this visit (bilirubin, albumin, INR, ascites, HE)',
      helpText: 'Snapshot only — not auto-scored or transplant-triggering.',
    }),

    // --- QUICK: Transplant context ---
    tri('transplantListed', 'Transplant listed', 'quick', 95, {
      section: 'Transplant context',
      summaryLabel: 'Listed',
    }),
    tri('transplantPrior', 'Prior liver transplant', 'quick', 96, {
      section: 'Transplant context',
    }),
    textArea('transplantNote', 'Transplant context note', 'quick', 97, {
      section: 'Transplant context',
      placeholder: 'Context only — not an auto listing workflow',
    }),

    // --- QUICK: Exam ---
    tri('examJaundice', 'Jaundice (exam)', 'quick', 110, {
      section: 'Liver examination summary',
    }),
    tri('examAscites', 'Ascites (exam)', 'quick', 111, {
      section: 'Liver examination summary',
      summaryLabel: 'Ascites exam',
    }),
    text('examLiverSpan', 'Liver span / edge', 'quick', 112, {
      section: 'Liver examination summary',
    }),
    tri('examSplenomegaly', 'Splenomegaly', 'quick', 113, {
      section: 'Liver examination summary',
    }),
    tri('examAsterixis', 'Asterixis', 'quick', 114, {
      section: 'Liver examination summary',
    }),
    textArea('examOtherFindings', 'Other liver findings', 'quick', 115, {
      section: 'Liver examination summary',
    }),
    textArea('clinicalImpression', 'Clinical impression / specialty note', 'quick', 120, {
      section: 'Assessment',
      placeholder: 'Clinician assessment — not auto-diagnosed',
    }),

    // --- MORE: Decompensation detail ---
    select(
      'encephalopathyGrade',
      'HE grade (clinician)',
      ['0', '1', '2', '3', '4', 'Not assessed'],
      'more',
      140,
      { section: 'Decompensation detail', showIf: yes('symptomEncephalopathy') }
    ),
    select(
      'ascitesSeverity',
      'Ascites severity (clinician)',
      ['Mild', 'Moderate', 'Tense', 'Not assessed'],
      'more',
      141,
      { section: 'Decompensation detail', showIf: yes('symptomAscites') }
    ),
    tri('historyParacentesis', 'Prior paracentesis', 'more', 142, {
      section: 'Decompensation detail',
    }),
    textArea('decompensationNote', 'Decompensation note', 'more', 143, {
      section: 'Decompensation detail',
    }),

    // --- MORE: Alcohol / metabolic ---
    select(
      'alcoholUseStatus',
      'Alcohol use',
      ['Never', 'Former', 'Current', 'Not documented'],
      'more',
      160,
      { section: 'Alcohol / metabolic' }
    ),
    textArea('alcoholNote', 'Alcohol note', 'more', 161, {
      section: 'Alcohol / metabolic',
      showIf: yes('etiologyAlcohol'),
    }),
    textArea('metabolicNote', 'Metabolic / MASLD note', 'more', 162, {
      section: 'Alcohol / metabolic',
      showIf: yes('etiologyNafld'),
    }),

    // --- MORE: Investigations (refs only; labs stay in Lab) ---
    dateField('imagingDate', 'Imaging date', 'more', 180, { section: 'Imaging' }),
    select(
      'imagingType',
      'Imaging type',
      ['None', 'US abdomen', 'CT', 'MRI / MRCP', 'Other'],
      'more',
      181,
      { section: 'Imaging' }
    ),
    textArea('imagingSummary', 'Imaging summary', 'more', 182, { section: 'Imaging' }),
    text('imagingDocumentRef', 'Imaging document reference', 'more', 183, {
      section: 'Imaging',
    }),
    text('labReminderNote', 'Labs', 'more', 190, {
      section: 'Labs reminder',
      helpText: 'LFTs / viral markers / INR live in Lab — do not duplicate results here.',
      placeholder: 'See Lab module (display-only reminder)',
    }),
    select(
      'otherInvestigationType',
      'Other investigation',
      ['None', 'EGD for varices', 'Paracentesis', 'Liver biopsy', 'Other'],
      'more',
      200,
      { section: 'Other investigations' }
    ),
    dateField('otherInvestigationDate', 'Investigation date', 'more', 201, {
      section: 'Other investigations',
    }),
    textArea('otherInvestigationSummary', 'Investigation summary', 'more', 202, {
      section: 'Other investigations',
    }),
    text('otherInvestigationRef', 'Report / document reference', 'more', 203, {
      section: 'Other investigations',
    }),
  ],
};

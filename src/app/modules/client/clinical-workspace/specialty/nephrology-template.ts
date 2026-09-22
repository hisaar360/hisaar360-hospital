import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { select, text, textArea, tri, yes } from './phase-n-shared';

const LABS_NOTE =
  'Creatinine / eGFR are display references only — labs stay in Laboratory.';
const NO_AUTO = 'Clinician-documented only — no autonomous CKD staging formula.';

export const NEPHROLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'NEPHROLOGY',
  name: 'Nephrology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'Renal symptoms, CKD, dialysis, transplant and fluid status notes.',
  fields: [
    tri('symptomEdema', 'Edema', 'quick', 1, { section: 'Renal symptoms', summaryLabel: 'Edema' }),
    tri('symptomOliguria', 'Oliguria / anuria concern', 'quick', 2, {
      section: 'Renal symptoms',
      summaryLabel: 'Oliguria',
    }),
    tri('symptomHematuria', 'Hematuria', 'quick', 3, {
      section: 'Renal symptoms',
      summaryLabel: 'Hematuria',
    }),
    tri('symptomFlankPain', 'Flank pain', 'quick', 4, {
      section: 'Renal symptoms',
      summaryLabel: 'Flank pain',
    }),
    tri('symptomFoamyUrine', 'Foamy urine', 'quick', 5, {
      section: 'Renal symptoms',
      summaryLabel: 'Foamy urine',
    }),

    tri('knownCkd', 'Known CKD / kidney disease', 'quick', 10, {
      section: 'Known disease',
      summaryLabel: 'CKD',
    }),
    select(
      'ckdStage',
      'CKD stage (clinician)',
      ['G1', 'G2', 'G3a', 'G3b', 'G4', 'G5', 'Not staged', 'Not documented'],
      'quick',
      11,
      { section: 'Known disease', showIf: yes('knownCkd'), helpText: NO_AUTO, summaryLabel: 'CKD stage' }
    ),
    textArea('knownDiseaseNote', 'Known disease note', 'quick', 12, {
      section: 'Known disease',
      showIf: yes('knownCkd'),
    }),

    select(
      'dialysisStatus',
      'Dialysis status',
      ['Not on dialysis', 'On dialysis', 'Prior dialysis', 'Not documented'],
      'quick',
      20,
      { section: 'Dialysis', summaryLabel: 'Dialysis' }
    ),
    select(
      'dialysisType',
      'Dialysis type',
      ['HD', 'PD', 'Other', 'Not documented'],
      'quick',
      21,
      {
        section: 'Dialysis',
        showIf: { field: 'dialysisStatus', equals: 'On dialysis' },
      }
    ),
    textArea('dialysisNote', 'Dialysis note', 'quick', 22, { section: 'Dialysis' }),

    tri('transplantHistory', 'Transplant history', 'quick', 30, {
      section: 'Transplant / fluid',
      summaryLabel: 'Transplant',
    }),
    textArea('transplantNote', 'Transplant note', 'quick', 31, {
      section: 'Transplant / fluid',
      showIf: yes('transplantHistory'),
    }),
    select(
      'fluidStatus',
      'Fluid status (clinician)',
      ['Euvolemic', 'Volume overload', 'Volume deplete', 'Not assessed', 'Not documented'],
      'quick',
      32,
      { section: 'Transplant / fluid' }
    ),

    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 40, {
      section: 'Assessment',
      helpText: NO_AUTO,
    }),
    textArea('creatinineEgfrNote', 'Creatinine / eGFR (display note)', 'quick', 41, {
      section: 'Labs',
      placeholder: 'Latest values — reference only',
      helpText: LABS_NOTE,
    }),

    textArea('renalSymptomDetail', 'Renal symptom detail', 'more', 50, {
      section: 'More detail',
    }),
    textArea('accessNote', 'Access / fistula note', 'more', 51, {
      section: 'More detail',
    }),
  ],
};

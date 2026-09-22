import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { select, text, textArea, tri, yes } from './phase-n-shared';

const LABS_NOTE =
  'Display / reference only — labs stay in Laboratory; do not duplicate LabOrder here.';
const NO_AUTO = 'Clinician-documented only — no autonomous diagnosis.';

export const ENDOCRINOLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'ENDOCRINOLOGY',
  name: 'Endocrinology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'Diabetes, thyroid, adrenal, pituitary, bone/calcium and reproductive endocrine notes.',
  fields: [
    // Diabetes
    tri('diabetesKnown', 'Known diabetes', 'quick', 1, {
      section: 'Diabetes',
      summaryLabel: 'Diabetes',
    }),
    select(
      'diabetesType',
      'Diabetes type (clinician)',
      ['Type 1', 'Type 2', 'Gestational', 'Other', 'Not documented'],
      'quick',
      2,
      { section: 'Diabetes', showIf: yes('diabetesKnown'), helpText: NO_AUTO }
    ),
    text('diabetesYear', 'Year of diagnosis', 'quick', 3, {
      section: 'Diabetes',
      showIf: yes('diabetesKnown'),
      placeholder: 'e.g. 2018',
    }),
    tri('hypoglycemiaHistory', 'Hypoglycemia history', 'quick', 4, {
      section: 'Diabetes',
      summaryLabel: 'Hypoglycemia',
      showIf: yes('diabetesKnown'),
    }),
    tri('dkaHistory', 'DKA history', 'quick', 5, {
      section: 'Diabetes',
      summaryLabel: 'DKA',
      showIf: yes('diabetesKnown'),
    }),
    tri('hhsHistory', 'HHS history', 'quick', 6, {
      section: 'Diabetes',
      summaryLabel: 'HHS',
      showIf: yes('diabetesKnown'),
    }),

    // Complications
    tri('compRetinopathy', 'Retinopathy', 'quick', 10, {
      section: 'Complications',
      summaryLabel: 'Retinopathy',
    }),
    tri('compNephropathy', 'Nephropathy', 'quick', 11, {
      section: 'Complications',
      summaryLabel: 'Nephropathy',
    }),
    tri('compNeuropathy', 'Neuropathy', 'quick', 12, {
      section: 'Complications',
      summaryLabel: 'Neuropathy',
    }),
    tri('compFootDisease', 'Foot disease', 'quick', 13, {
      section: 'Complications',
      summaryLabel: 'Foot',
    }),
    tri('compCad', 'CAD / CVD', 'quick', 14, {
      section: 'Complications',
      summaryLabel: 'CAD/CVD',
    }),

    // Thyroid
    tri('thyroidKnown', 'Thyroid disease', 'quick', 20, {
      section: 'Thyroid',
      summaryLabel: 'Thyroid',
    }),
    select(
      'thyroidType',
      'Thyroid type (clinician)',
      ['Hypothyroid', 'Hyperthyroid', 'Nodule / goitre', 'Other', 'Not documented'],
      'quick',
      21,
      { section: 'Thyroid', showIf: yes('thyroidKnown'), helpText: NO_AUTO }
    ),
    textArea('thyroidNote', 'Thyroid note', 'quick', 22, {
      section: 'Thyroid',
      showIf: yes('thyroidKnown'),
    }),

    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 30, {
      section: 'Assessment',
      helpText: NO_AUTO,
    }),
    textArea('labsDisplayNote', 'Labs (display note)', 'quick', 31, {
      section: 'Labs',
      placeholder: 'HbA1c / TSH / cortisol etc. — reference only',
      helpText: LABS_NOTE,
    }),

    // More — adrenal / pituitary / bone / reproductive
    tri('adrenalKnown', 'Adrenal concern / known', 'more', 40, {
      section: 'Adrenal',
      summaryLabel: 'Adrenal',
    }),
    textArea('adrenalNote', 'Adrenal note', 'more', 41, {
      section: 'Adrenal',
      showIf: yes('adrenalKnown'),
    }),
    tri('pituitaryKnown', 'Pituitary concern / known', 'more', 50, {
      section: 'Pituitary',
      summaryLabel: 'Pituitary',
    }),
    textArea('pituitaryNote', 'Pituitary note', 'more', 51, {
      section: 'Pituitary',
      showIf: yes('pituitaryKnown'),
    }),
    tri('boneCalciumConcern', 'Bone / calcium concern', 'more', 60, {
      section: 'Bone / calcium',
      summaryLabel: 'Bone/Ca',
    }),
    textArea('boneCalciumNote', 'Bone / calcium note', 'more', 61, {
      section: 'Bone / calcium',
      showIf: yes('boneCalciumConcern'),
    }),
    tri('reproductiveEndocrine', 'Reproductive endocrine', 'more', 70, {
      section: 'Reproductive endocrine',
      summaryLabel: 'Repro endocrine',
    }),
    textArea('reproductiveEndocrineNote', 'Reproductive endocrine note (light)', 'more', 71, {
      section: 'Reproductive endocrine',
      showIf: yes('reproductiveEndocrine'),
      placeholder: 'PCOS / hypogonadism / menopause — clinician note only',
    }),
  ],
};

import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { select, text, textArea, tri } from './phase-n-shared';

const NO_AUTO = 'Clinician-documented only — no autonomous diagnosis.';

export const DERMATOLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'DERMATOLOGY',
  name: 'Dermatology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'Skin site, lesion type, distribution, history and photo reference.',
  fields: [
    text('lesionSite', 'Site', 'quick', 1, {
      section: 'Lesion',
      placeholder: 'e.g. face, scalp, trunk, hands',
      summaryLabel: 'Site',
    }),
    select(
      'lesionType',
      'Lesion type',
      [
        'Macule / patch',
        'Papule / plaque',
        'Vesicle / bulla',
        'Pustule',
        'Nodule',
        'Ulcer',
        'Scale / crust',
        'Other',
        'Not documented',
      ],
      'quick',
      2,
      { section: 'Lesion', helpText: NO_AUTO }
    ),
    select(
      'distribution',
      'Distribution',
      ['Localized', 'Widespread', 'Dermatomal', 'Flexural', 'Extensor', 'Photosensitive', 'Other', 'Not documented'],
      'quick',
      3,
      { section: 'Lesion' }
    ),
    tri('itching', 'Itching', 'quick', 4, { section: 'Lesion', summaryLabel: 'Itch' }),
    tri('pain', 'Pain / burning', 'quick', 5, { section: 'Lesion', summaryLabel: 'Pain' }),

    tri('knownEczema', 'Known eczema / dermatitis', 'quick', 10, {
      section: 'Known history',
      summaryLabel: 'Eczema',
    }),
    tri('knownPsoriasis', 'Known psoriasis', 'quick', 11, {
      section: 'Known history',
      summaryLabel: 'Psoriasis',
    }),
    tri('knownInfection', 'Known skin infection', 'quick', 12, {
      section: 'Known history',
      summaryLabel: 'Infection hx',
    }),
    tri('knownAllergy', 'Known allergy / contact', 'quick', 13, {
      section: 'Known history',
      summaryLabel: 'Allergy',
    }),

    textArea('examNote', 'Exam note', 'quick', 20, {
      section: 'Exam',
      placeholder: 'Brief dermatologic exam',
      helpText: NO_AUTO,
    }),
    text('photoRef', 'Photo reference', 'quick', 21, {
      section: 'Exam',
      placeholder: 'Document / image ID',
      helpText: 'Reference only — images stay in documents.',
    }),
    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 22, {
      section: 'Exam',
      helpText: NO_AUTO,
    }),

    textArea('historyDetail', 'History detail', 'more', 30, { section: 'More' }),
    textArea('treatmentNote', 'Treatment / plan note', 'more', 31, { section: 'More' }),
  ],
};

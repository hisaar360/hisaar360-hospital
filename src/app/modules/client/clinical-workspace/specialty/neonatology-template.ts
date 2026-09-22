import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { select, text, textArea, tri, yes } from './phase-n-shared';

const BIRTH_HELP =
  'Reference BirthRecord when available — do not duplicate BirthRecord fields here.';
const CANONICAL =
  'Growth / vitals / labs stay on canonical Visit / Pediatrics / Laboratory surfaces — notes only.';

export const NEONATOLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'NEONATOLOGY',
  name: 'Neonatology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'Newborn / NICU consultation — BirthRecord refs, feeding, jaundice; no BirthRecord duplicate.',
  fields: [
    text('birthRecordRef', 'Birth record reference', 'quick', 1, {
      section: 'Birth',
      placeholder: 'BirthRecord id or label',
      helpText: BIRTH_HELP,
    }),
    text('gestationalAgeAtBirth', 'Gestational age at birth', 'quick', 2, {
      section: 'Birth',
      placeholder: 'e.g. 34+2 weeks',
      summaryLabel: 'GA',
    }),
    text('birthWeightRef', 'Birth weight (ref)', 'quick', 3, {
      section: 'Birth',
      placeholder: 'Value or BirthRecord field ref',
      helpText: BIRTH_HELP,
    }),
    select(
      'deliveryMode',
      'Delivery mode',
      ['SVD', 'Assisted vaginal', 'CS', 'Not documented'],
      'quick',
      4,
      { section: 'Birth', summaryLabel: 'Delivery' }
    ),

    tri('nicuHistory', 'NICU history', 'quick', 10, {
      section: 'NICU / feeding',
      summaryLabel: 'NICU',
    }),
    textArea('nicuHistoryNote', 'NICU history note', 'quick', 11, {
      section: 'NICU / feeding',
      showIf: yes('nicuHistory'),
    }),
    select(
      'feeding',
      'Feeding',
      ['Breast', 'Formula', 'Mixed', 'NG / tube', 'Parenteral', 'Not documented'],
      'quick',
      12,
      { section: 'NICU / feeding', summaryLabel: 'Feeding' }
    ),

    tri('jaundiceConcern', 'Jaundice concern', 'quick', 20, {
      section: 'Jaundice',
      summaryLabel: 'Jaundice',
    }),
    tri('phototherapyHistory', 'Phototherapy history', 'quick', 21, {
      section: 'Jaundice',
      summaryLabel: 'Phototherapy',
      showIf: yes('jaundiceConcern'),
    }),
    textArea('jaundiceNote', 'Jaundice note', 'quick', 22, {
      section: 'Jaundice',
      showIf: yes('jaundiceConcern'),
    }),

    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 30, {
      section: 'Assessment',
    }),
    textArea('growthVitalsLabsNote', 'Growth / vitals / labs note', 'quick', 31, {
      section: 'Canonical refs',
      placeholder: 'Point to growth chart / vitals / labs — do not duplicate',
      helpText: CANONICAL,
    }),

    textArea('respiratoryNote', 'Respiratory note', 'more', 40, { section: 'More' }),
    textArea('infectionNote', 'Infection note', 'more', 41, { section: 'More' }),
    textArea('followUpNote', 'Follow-up note', 'more', 42, { section: 'More' }),
  ],
};

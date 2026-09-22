import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { select, text, textArea, tri, yes } from './phase-n-shared';

const NO_AUTO = 'Clinician-documented only — no autonomous diagnosis.';
const SIDE = ['Right', 'Left', 'Bilateral', 'Not documented'];

export const UROLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'UROLOGY',
  name: 'Urology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'Urinary symptoms, stones, male/female light notes and procedure references.',
  fields: [
    tri('symptomDysuria', 'Dysuria', 'quick', 1, { section: 'Urinary symptoms', summaryLabel: 'Dysuria' }),
    tri('symptomFrequency', 'Frequency', 'quick', 2, {
      section: 'Urinary symptoms',
      summaryLabel: 'Frequency',
    }),
    tri('symptomUrgency', 'Urgency', 'quick', 3, {
      section: 'Urinary symptoms',
      summaryLabel: 'Urgency',
    }),
    tri('symptomHematuria', 'Hematuria', 'quick', 4, {
      section: 'Urinary symptoms',
      summaryLabel: 'Hematuria',
    }),
    tri('symptomNocturia', 'Nocturia', 'quick', 5, {
      section: 'Urinary symptoms',
      summaryLabel: 'Nocturia',
    }),
    tri('symptomIncontinence', 'Incontinence', 'quick', 6, {
      section: 'Urinary symptoms',
      summaryLabel: 'Incontinence',
    }),
    tri('symptomRetention', 'Retention concern', 'quick', 7, {
      section: 'Urinary symptoms',
      summaryLabel: 'Retention',
    }),

    tri('painFlank', 'Flank pain', 'quick', 10, { section: 'Pain sites', summaryLabel: 'Flank' }),
    tri('painSuprapubic', 'Suprapubic pain', 'quick', 11, {
      section: 'Pain sites',
      summaryLabel: 'Suprapubic',
    }),
    tri('painLoin', 'Loin-to-groin pain', 'quick', 12, {
      section: 'Pain sites',
      summaryLabel: 'Loin-groin',
    }),

    tri('knownBph', 'Known BPH', 'quick', 20, { section: 'Known conditions', summaryLabel: 'BPH' }),
    tri('knownStone', 'Known stone disease', 'quick', 21, {
      section: 'Known conditions',
      summaryLabel: 'Stone',
    }),
    select('stoneSide', 'Stone side', SIDE, 'quick', 22, {
      section: 'Known conditions',
      showIf: yes('knownStone'),
    }),
    tri('knownUtiRecurrent', 'Recurrent UTI', 'quick', 23, {
      section: 'Known conditions',
      summaryLabel: 'Recurrent UTI',
    }),
    tri('knownProstateCa', 'Known prostate cancer', 'quick', 24, {
      section: 'Known conditions',
      summaryLabel: 'Prostate Ca',
      helpText: NO_AUTO,
    }),

    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 30, {
      section: 'Assessment',
      helpText: NO_AUTO,
    }),

    // Male / female light
    textArea('maleSymptomNote', 'Male symptom note (light)', 'more', 40, {
      section: 'Male / female',
      placeholder: 'LUTS / erectile / scrotal — optional',
    }),
    textArea('femaleSymptomNote', 'Female symptom note (light)', 'more', 41, {
      section: 'Male / female',
      placeholder: 'Prolapse / incontinence detail — optional',
    }),
    textArea('stoneHistoryNote', 'Stone history note', 'more', 42, {
      section: 'Stone / procedures',
      showIf: yes('knownStone'),
    }),

    tri('procedureCatheter', 'Catheter (ref)', 'more', 50, {
      section: 'Procedure refs',
      summaryLabel: 'Catheter',
    }),
    tri('procedureCystoscopy', 'Cystoscopy (ref)', 'more', 51, {
      section: 'Procedure refs',
      summaryLabel: 'Cystoscopy',
    }),
    tri('procedureStent', 'Stent (ref)', 'more', 52, {
      section: 'Procedure refs',
      summaryLabel: 'Stent',
    }),
    text('procedureRef', 'Procedure reference', 'more', 53, {
      section: 'Procedure refs',
      placeholder: 'Document / procedure ID',
      helpText: 'Reference only — does not create OperationSchedule.',
    }),
    text('operationScheduleId', 'Operation schedule ID (optional)', 'more', 54, {
      section: 'Procedure refs',
      placeholder: 'Existing OperationSchedule id if scheduled',
      helpText: 'Optional link only — specialty save does not create OT.',
    }),
  ],
};

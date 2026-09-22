import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { text, textArea, tri, yes } from './phase-n-shared';

const MICRO_NOTE = 'Microbiology / culture results are display references only — labs stay in Laboratory.';
const NO_AUTO = 'Clinician-documented only — no autonomous sepsis score or diagnosis.';

export const INFECTIOUS_DISEASE_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'INFECTIOUS_DISEASE',
  name: 'Infectious Disease',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'Fever/infection context, exposure and immunocompromise notes — no sepsis auto.',
  fields: [
    tri('feverPresent', 'Fever', 'quick', 1, { section: 'Fever / infection', summaryLabel: 'Fever' }),
    text('feverDuration', 'Fever duration', 'quick', 2, {
      section: 'Fever / infection',
      showIf: yes('feverPresent'),
      placeholder: 'e.g. 5 days',
    }),
    textArea('infectionContext', 'Infection context', 'quick', 3, {
      section: 'Fever / infection',
      placeholder: 'Suspected focus / syndrome — clinician note',
      helpText: NO_AUTO,
    }),
    tri('localizingSymptoms', 'Localizing symptoms', 'quick', 4, {
      section: 'Fever / infection',
      summaryLabel: 'Localizing',
    }),

    tri('knownHiv', 'Known HIV', 'quick', 10, { section: 'Known infections', summaryLabel: 'HIV' }),
    tri('knownHepatitis', 'Known hepatitis B/C', 'quick', 11, {
      section: 'Known infections',
      summaryLabel: 'HBV/HCV',
    }),
    tri('knownTbHistory', 'TB history (prior)', 'quick', 12, {
      section: 'Known infections',
      summaryLabel: 'TB hx',
      helpText: 'History note only — TB clinic maps to Pulmonology when that is the department.',
    }),
    tri('knownOtherChronicInfection', 'Other chronic infection', 'quick', 13, {
      section: 'Known infections',
      summaryLabel: 'Chronic inf.',
    }),

    tri('exposureTravel', 'Travel exposure', 'quick', 20, {
      section: 'Exposure',
      summaryLabel: 'Travel',
    }),
    tri('exposureOccupational', 'Occupational / animal exposure', 'quick', 21, {
      section: 'Exposure',
      summaryLabel: 'Occupational',
    }),
    tri('exposureSickContact', 'Sick contact', 'quick', 22, {
      section: 'Exposure',
      summaryLabel: 'Sick contact',
    }),
    textArea('exposureNote', 'Exposure note', 'quick', 23, { section: 'Exposure' }),

    tri('immunocompromised', 'Immunocompromised', 'quick', 30, {
      section: 'Host factors',
      summaryLabel: 'Immunocomp.',
    }),
    textArea('immunocompromisedNote', 'Immunocompromise note', 'quick', 31, {
      section: 'Host factors',
      showIf: yes('immunocompromised'),
    }),

    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 40, {
      section: 'Assessment',
      helpText: NO_AUTO,
    }),
    textArea('microLabsNote', 'Micro / labs note (display)', 'quick', 41, {
      section: 'Labs',
      placeholder: 'Culture / PCR / serology — reference only',
      helpText: MICRO_NOTE,
    }),

    textArea('antimicrobialNote', 'Antimicrobial note', 'more', 50, { section: 'More' }),
    textArea('isolationNote', 'Isolation / IPC note', 'more', 51, { section: 'More' }),
  ],
};

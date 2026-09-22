import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { select, text, textArea, tri } from './phase-n-shared';

const ENCOUNTER_HELP =
  'Uses Encounter emergency context — there is no separate EmergencyEncounter model in this phase.';
const NO_AUTO = 'Clinician-documented only — no autonomous triage score.';

export const EMERGENCY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'EMERGENCY',
  name: 'Emergency Medicine',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'ED arrival, triage (clinician), ABCDE summaries and time-critical concerns.',
  fields: [
    select(
      'arrivalMode',
      'Arrival mode',
      ['Walk-in', 'Ambulance', 'Transfer', 'Police', 'Other', 'Not documented'],
      'quick',
      1,
      { section: 'Arrival / triage', summaryLabel: 'Arrival', helpText: ENCOUNTER_HELP }
    ),
    select(
      'triageCategory',
      'Triage category (clinician)',
      ['1', '2', '3', '4', '5', 'Not documented'],
      'quick',
      2,
      { section: 'Arrival / triage', helpText: NO_AUTO, summaryLabel: 'Triage' }
    ),
    textArea('primaryConcern', 'Primary concern', 'quick', 3, {
      section: 'Arrival / triage',
      placeholder: 'Chief ED concern',
      helpText: ENCOUNTER_HELP,
    }),

    textArea('abcAirway', 'A — Airway summary', 'quick', 10, {
      section: 'ABCDE',
      placeholder: 'Airway status / interventions',
    }),
    textArea('abcBreathing', 'B — Breathing summary', 'quick', 11, {
      section: 'ABCDE',
      placeholder: 'Respiratory effort / SpO2 context',
    }),
    textArea('abcCirculation', 'C — Circulation summary', 'quick', 12, {
      section: 'ABCDE',
      placeholder: 'Pulse / BP / perfusion',
    }),
    textArea('abcNeuro', 'D — Neuro summary', 'quick', 13, {
      section: 'ABCDE',
      placeholder: 'AVPU / GCS context / focal signs',
    }),
    textArea('abcExposure', 'E — Exposure summary', 'quick', 14, {
      section: 'ABCDE',
      placeholder: 'Exposure / environment / trauma survey',
    }),

    tri('timeCriticalCardiac', 'Time-critical cardiac concern', 'quick', 20, {
      section: 'Time-critical',
      summaryLabel: 'Cardiac TC',
    }),
    tri('timeCriticalStroke', 'Time-critical stroke concern', 'quick', 21, {
      section: 'Time-critical',
      summaryLabel: 'Stroke TC',
    }),
    tri('timeCriticalTrauma', 'Time-critical trauma concern', 'quick', 22, {
      section: 'Time-critical',
      summaryLabel: 'Trauma TC',
    }),
    tri('timeCriticalSepsis', 'Time-critical sepsis concern', 'quick', 23, {
      section: 'Time-critical',
      summaryLabel: 'Sepsis TC',
      helpText: 'Concern flag only — no autonomous sepsis score.',
    }),
    tri('timeCriticalAirway', 'Time-critical airway concern', 'quick', 24, {
      section: 'Time-critical',
      summaryLabel: 'Airway TC',
    }),

    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 30, {
      section: 'Assessment',
      helpText: NO_AUTO,
    }),

    text('vitalsRefNote', 'Vitals reference note', 'more', 40, {
      section: 'More',
      placeholder: 'Point to Visit vitals — do not duplicate',
      helpText: 'Vitals stay on Visit / Encounter — reference only.',
    }),
    textArea('dispositionNote', 'Disposition note', 'more', 41, { section: 'More' }),
  ],
};

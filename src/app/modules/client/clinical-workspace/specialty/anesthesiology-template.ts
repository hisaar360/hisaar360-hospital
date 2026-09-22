import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { select, text, textArea, tri, yes } from './phase-n-shared';

const NO_FIT =
  'Assessment conclusion only — NO Fit/Unfit auto-label. Clearance is clinician-selected.';
const NO_AUTO = 'Clinician-documented only — no autonomous ASA computation.';

export const ANESTHESIOLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'ANESTHESIOLOGY',
  name: 'Anesthesiology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'Pre-anesthesia assessment — planned procedure, airway, ASA and clearance conclusion.',
  fields: [
    text('plannedProcedure', 'Planned procedure', 'quick', 1, {
      section: 'Procedure',
      placeholder: 'Procedure name / brief description',
      summaryLabel: 'Procedure',
    }),
    text('operationScheduleId', 'Operation schedule ID (optional)', 'quick', 2, {
      section: 'Procedure',
      placeholder: 'Existing OperationSchedule id',
      helpText: 'Optional link only — specialty save does not create OT.',
    }),

    tri('previousAnesthesia', 'Previous anesthesia', 'quick', 10, {
      section: 'History',
      summaryLabel: 'Prior anesthesia',
    }),
    textArea('previousAnesthesiaNote', 'Previous anesthesia note', 'quick', 11, {
      section: 'History',
      showIf: yes('previousAnesthesia'),
    }),
    textArea('allergyContextNote', 'Allergy context note', 'quick', 12, {
      section: 'History',
      placeholder: 'Drug / latex / anesthetic allergy context',
    }),

    textArea('airwaySummary', 'Airway summary', 'quick', 20, {
      section: 'Airway / ASA',
      placeholder: 'Mallampati / mouth opening / neck — clinician summary',
      helpText: NO_AUTO,
    }),
    select(
      'asaClass',
      'ASA class (clinician)',
      ['I', 'II', 'III', 'IV', 'V', 'VI', 'E (emergency modifier)', 'Not documented'],
      'quick',
      21,
      { section: 'Airway / ASA', helpText: NO_AUTO, summaryLabel: 'ASA' }
    ),

    select(
      'anesthesiaPlan',
      'Anesthesia plan',
      ['GA', 'Regional', 'Combined', 'MAC / sedation', 'Local', 'Not yet decided', 'Not documented'],
      'quick',
      30,
      { section: 'Plan / clearance', summaryLabel: 'Plan' }
    ),
    select(
      'clearanceConclusion',
      'Clearance conclusion',
      [
        'Assessment completed',
        'Optimization required',
        'Defer',
        'Proceed per plan',
        'Not documented',
      ],
      'quick',
      31,
      { section: 'Plan / clearance', helpText: NO_FIT, summaryLabel: 'Clearance' }
    ),
    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 32, {
      section: 'Plan / clearance',
      helpText: NO_FIT,
    }),

    textArea('optimizationNote', 'Optimization note', 'more', 40, {
      section: 'More',
      showIf: { field: 'clearanceConclusion', equals: 'Optimization required' },
    }),
    textArea('comorbidityNote', 'Comorbidity note', 'more', 41, { section: 'More' }),
    textArea('npoFastingNote', 'NPO / fasting note', 'more', 42, { section: 'More' }),
  ],
};

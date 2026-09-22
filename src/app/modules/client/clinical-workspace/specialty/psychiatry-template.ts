import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { select, text, textArea, tri } from './phase-n-shared';

const RISK_HELP =
  'Clinician narrative only — NO autonomous risk score. Do not treat this as a scored instrument.';
const NO_AUTO = 'Clinician-documented only — no autonomous diagnosis.';

export const PSYCHIATRY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'PSYCHIATRY',
  name: 'Psychiatry',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'Presenting context and MSE summary — sensitive risk fields are not summary chips.',
  fields: [
    textArea('presentingContext', 'Presenting context', 'quick', 1, {
      section: 'Presenting',
      placeholder: 'Brief reason for psychiatric consultation',
      helpText: NO_AUTO,
    }),
    select(
      'mseAppearance',
      'MSE — appearance / behaviour',
      ['Appropriate', 'Dishevelled', 'Agitated', 'Withdrawn', 'Not assessed', 'Not documented'],
      'quick',
      2,
      { section: 'MSE summary' }
    ),
    select(
      'mseSpeech',
      'MSE — speech',
      ['Normal', 'Pressured', 'Poverty', 'Other', 'Not assessed', 'Not documented'],
      'quick',
      3,
      { section: 'MSE summary' }
    ),
    select(
      'mseThought',
      'MSE — thought',
      ['Normal form', 'Disordered', 'Not assessed', 'Not documented'],
      'quick',
      4,
      { section: 'MSE summary' }
    ),
    select(
      'mseInsight',
      'MSE — insight',
      ['Good', 'Partial', 'Poor', 'Not assessed', 'Not documented'],
      'quick',
      5,
      { section: 'MSE summary' }
    ),

    tri('knownDepression', 'Known depression', 'quick', 10, {
      section: 'Known condition',
      summaryLabel: 'Depression',
    }),
    tri('knownBipolar', 'Known bipolar', 'quick', 11, {
      section: 'Known condition',
      summaryLabel: 'Bipolar',
    }),
    tri('knownPsychosis', 'Known psychosis / schizophrenia', 'quick', 12, {
      section: 'Known condition',
      summaryLabel: 'Psychosis hx',
    }),
    select(
      'followUpPlan',
      'Follow-up',
      ['Routine OPD', 'Early review', 'Urgent review', 'Admission discussed', 'Not documented'],
      'quick',
      13,
      { section: 'Known condition', summaryLabel: 'Follow-up' }
    ),

    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 20, {
      section: 'Assessment',
      helpText: NO_AUTO,
    }),
    textArea('riskAssessmentNote', 'Risk assessment note', 'quick', 21, {
      section: 'Risk',
      placeholder: 'Clinician risk narrative — no auto score',
      helpText: RISK_HELP,
      // intentionally NO summaryLabel — do not chip sensitive risk content
    }),

    // More — mood / anxiety / psychosis / substance / sleep / history
    textArea('moodNote', 'Mood note', 'more', 30, { section: 'Mood / anxiety' }),
    textArea('anxietyNote', 'Anxiety note', 'more', 31, { section: 'Mood / anxiety' }),
    textArea('psychosisNote', 'Psychosis / perceptual note', 'more', 32, {
      section: 'Psychosis / substance',
    }),
    textArea('substanceNote', 'Substance use note', 'more', 33, {
      section: 'Psychosis / substance',
    }),
    textArea('sleepNote', 'Sleep note', 'more', 34, { section: 'Sleep / history' }),
    textArea('psychiatricHistory', 'Psychiatric history', 'more', 35, {
      section: 'Sleep / history',
    }),
    // Sensitive ideation fields — NO summaryLabel
    textArea('suicidalIdeationNote', 'Suicidal ideation note', 'more', 40, {
      section: 'Sensitive (not on summary)',
      helpText: 'Private clinical note — never shown as a summary chip.',
    }),
    textArea('homicidalIdeationNote', 'Homicidal ideation note', 'more', 41, {
      section: 'Sensitive (not on summary)',
      helpText: 'Private clinical note — never shown as a summary chip.',
    }),
  ],
};

import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { text, textArea, tri, yes } from './phase-n-shared';

const LABS_NOTE = 'Labs (RF / anti-CCP / ANA etc.) are display references only.';
const NO_AUTO = 'Clinician-documented only — no autonomous diagnosis.';

export const RHEUMATOLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'RHEUMATOLOGY',
  name: 'Rheumatology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'Joint and systemic inflammatory notes — not orthopedics trauma.',
  fields: [
    tri('jointPain', 'Joint pain', 'quick', 1, { section: 'Joint symptoms', summaryLabel: 'Joint pain' }),
    tri('jointSwelling', 'Joint swelling', 'quick', 2, {
      section: 'Joint symptoms',
      summaryLabel: 'Swelling',
    }),
    tri('morningStiffness', 'Morning stiffness', 'quick', 3, {
      section: 'Joint symptoms',
      summaryLabel: 'AM stiffness',
    }),
    tri('jointWarmth', 'Warmth / erythema', 'quick', 4, {
      section: 'Joint symptoms',
      summaryLabel: 'Warmth',
    }),
    text('jointsInvolved', 'Joints involved', 'quick', 5, {
      section: 'Joint symptoms',
      placeholder: 'e.g. hands MCP, knees, spine',
      showIf: yes('jointPain'),
    }),

    tri('systemicFever', 'Fever', 'quick', 10, { section: 'Systemic', summaryLabel: 'Fever' }),
    tri('systemicFatigue', 'Fatigue', 'quick', 11, { section: 'Systemic', summaryLabel: 'Fatigue' }),
    tri('systemicRash', 'Rash', 'quick', 12, { section: 'Systemic', summaryLabel: 'Rash' }),
    tri('systemicRaynaud', 'Raynaud', 'quick', 13, { section: 'Systemic', summaryLabel: 'Raynaud' }),
    tri('systemicDryEyesMouth', 'Dry eyes / mouth', 'quick', 14, {
      section: 'Systemic',
      summaryLabel: 'Sicca',
    }),

    tri('knownRa', 'Known RA', 'quick', 20, { section: 'Known conditions', summaryLabel: 'RA' }),
    tri('knownSle', 'Known SLE', 'quick', 21, { section: 'Known conditions', summaryLabel: 'SLE' }),
    tri('knownGout', 'Known gout', 'quick', 22, { section: 'Known conditions', summaryLabel: 'Gout' }),
    tri('knownSpondyloarthritis', 'Known spondyloarthritis', 'quick', 23, {
      section: 'Known conditions',
      summaryLabel: 'SpA',
    }),
    tri('knownVasculitis', 'Known vasculitis', 'quick', 24, {
      section: 'Known conditions',
      summaryLabel: 'Vasculitis',
    }),

    textArea('jointExamSummary', 'Joint exam summary', 'quick', 30, {
      section: 'Exam',
      helpText: NO_AUTO,
    }),
    textArea('clinicalImpression', 'Assessment / clinical impression', 'quick', 31, {
      section: 'Exam',
      helpText: NO_AUTO,
    }),
    textArea('labsNote', 'Labs note (display)', 'quick', 32, {
      section: 'Labs',
      placeholder: 'RF / anti-CCP / ANA / ESR / CRP — reference only',
      helpText: LABS_NOTE,
    }),

    textArea('systemicDetail', 'Systemic detail', 'more', 40, { section: 'More' }),
    textArea('treatmentNote', 'Treatment / DMARD note', 'more', 41, { section: 'More' }),
  ],
};

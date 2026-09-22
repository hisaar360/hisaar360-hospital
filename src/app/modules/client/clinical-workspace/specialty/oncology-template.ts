import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { dateField, select, text, textArea, tri, yes } from './phase-n-shared';

/**
 * Oncology consultation layout (matches clinical consult cards):
 * Patient Information → History → Examination → Assessment → Plan
 */
export const ONCOLOGY_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'ONCOLOGY',
  name: 'Oncology',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'Oncology consultation',
  fields: [
    text('primarySite', 'Cancer type / Primary site', 'quick', 1, {
      section: 'Patient Information',
      placeholder: 'e.g. Breast, Lung, Colon',
      summaryLabel: 'Site',
    }),
    text('oncologyDiagnosis', 'Diagnosis (clinician)', 'quick', 2, {
      section: 'Patient Information',
      placeholder: 'Histology / working diagnosis',
      summaryLabel: 'Dx',
    }),
    select(
      'stageClinician',
      'Stage',
      ['I', 'II', 'III', 'IV', 'In situ', 'Not staged', 'Not documented'],
      'quick',
      3,
      { section: 'Patient Information', summaryLabel: 'Stage' }
    ),
    select(
      'performanceStatus',
      'Performance status',
      ['ECOG 0', 'ECOG 1', 'ECOG 2', 'ECOG 3', 'ECOG 4', 'KPS documented', 'Not documented'],
      'quick',
      4,
      { section: 'Patient Information', summaryLabel: 'PS' }
    ),
    dateField('diagnosisDate', 'Diagnosis date', 'quick', 5, {
      section: 'Patient Information',
    }),
    select(
      'currentStatus',
      'Current status',
      [
        'Newly diagnosed',
        'On treatment',
        'Surveillance',
        'Progressive disease',
        'Remission',
        'Palliative',
        'Not documented',
      ],
      'quick',
      6,
      { section: 'Patient Information', summaryLabel: 'Status' }
    ),

    textArea('presentingComplaints', 'Presenting complaints', 'quick', 10, {
      section: 'History',
      placeholder: 'Chief complaints for this visit',
    }),
    textArea('oncologicHistory', 'Oncologic history', 'quick', 11, {
      section: 'History',
      placeholder: 'Prior treatments, response, progression',
    }),

    textArea('generalExaminationSummary', 'General examination', 'quick', 20, {
      section: 'Examination',
      placeholder: 'General appearance, vitals-related findings',
    }),
    textArea('systemicExaminationSummary', 'Systemic examination', 'quick', 21, {
      section: 'Examination',
      placeholder: 'System-wise findings',
    }),

    textArea('clinicalImpression', 'Clinical assessment', 'quick', 30, {
      section: 'Assessment',
      placeholder: 'Assessment / clinical impression',
      fullWidth: true,
    }),

    textArea('treatmentPlan', 'Treatment plan', 'quick', 40, {
      section: 'Plan',
      placeholder: 'Intended treatment / next steps',
    }),
    textArea('advice', 'Advice', 'quick', 41, {
      section: 'Plan',
      placeholder: 'Patient advice',
    }),
    dateField('nextFollowUp', 'Next follow up', 'quick', 42, {
      section: 'Plan',
    }),
    textArea('additionalNotes', 'Additional notes', 'quick', 43, {
      section: 'Plan',
      placeholder: 'Any extra notes',
    }),

    tri('txSurgery', 'Prior surgery', 'more', 50, {
      section: 'Treatment history',
      summaryLabel: 'Surgery',
    }),
    tri('txChemotherapy', 'Chemotherapy', 'more', 51, {
      section: 'Treatment history',
      summaryLabel: 'Chemo',
    }),
    tri('txRadiation', 'Radiation (history)', 'more', 52, {
      section: 'Treatment history',
      summaryLabel: 'Radiation',
    }),
    tri('txImmunotherapy', 'Immunotherapy / targeted', 'more', 53, {
      section: 'Treatment history',
      summaryLabel: 'IO/targeted',
    }),
    textArea('treatmentDetail', 'Treatment detail', 'more', 54, {
      section: 'Treatment history',
      showIf: yes('txChemotherapy'),
      fullWidth: true,
    }),

    tri('symptomPain', 'Pain', 'more', 60, { section: 'Symptoms', summaryLabel: 'Pain' }),
    tri('symptomFatigue', 'Fatigue', 'more', 61, { section: 'Symptoms', summaryLabel: 'Fatigue' }),
    tri('symptomNausea', 'Nausea', 'more', 62, { section: 'Symptoms', summaryLabel: 'Nausea' }),
    tri('symptomWeightLoss', 'Weight loss', 'more', 63, {
      section: 'Symptoms',
      summaryLabel: 'Weight loss',
    }),
    textArea('goalsOfCareNote', 'Goals of care', 'more', 70, {
      section: 'Goals of care',
      fullWidth: true,
    }),
  ],
};

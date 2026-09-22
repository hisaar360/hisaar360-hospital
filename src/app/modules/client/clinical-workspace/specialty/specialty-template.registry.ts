import { SpecialtyKey } from './specialty-keys';
import {
  CURRENT_SPECIALTY_TEMPLATE_VERSION,
  SpecialtyFieldSchema,
  SpecialtyTemplateSchema,
} from './specialty-template.schema';
import { ANESTHESIOLOGY_TEMPLATE } from './anesthesiology-template';
import { CARDIOLOGY_TEMPLATE } from './cardiology-template';
import { DENTAL_TEMPLATE } from './dental-template';
import { DERMATOLOGY_TEMPLATE } from './dermatology-template';
import { EMERGENCY_TEMPLATE } from './emergency-template';
import { ENDOCRINOLOGY_TEMPLATE } from './endocrinology-template';
import { ENT_TEMPLATE } from './ent-template';
import { GASTROENTEROLOGY_TEMPLATE } from './gastroenterology-template';
import { GENERAL_SURGERY_TEMPLATE } from './general-surgery-template';
import { HEPATOLOGY_TEMPLATE } from './hepatology-template';
import { INFECTIOUS_DISEASE_TEMPLATE } from './infectious-disease-template';
import { NEONATOLOGY_TEMPLATE } from './neonatology-template';
import { NEPHROLOGY_TEMPLATE } from './nephrology-template';
import { NEUROLOGY_TEMPLATE } from './neurology-template';
import { NEUROSURGERY_TEMPLATE } from './neurosurgery-template';
import { ONCOLOGY_TEMPLATE } from './oncology-template';
import { OPHTHALMOLOGY_TEMPLATE } from './ophthalmology-template';
import { ORTHOPEDICS_TEMPLATE } from './orthopedics-template';
import { PEDIATRICS_TEMPLATE } from './pediatrics-template';
import { PSYCHIATRY_TEMPLATE } from './psychiatry-template';
import { PULMONOLOGY_TEMPLATE } from './pulmonology-template';
import { RHEUMATOLOGY_TEMPLATE } from './rheumatology-template';
import { UROLOGY_TEMPLATE } from './urology-template';

function tri(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; summaryLabel?: string }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'tri_state',
    group,
    displayOrder,
    section: options?.section,
    summaryLabel: options?.summaryLabel,
  };
}

function textArea(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    placeholder?: string;
    showIf?: SpecialtyFieldSchema['showIf'];
    fullWidth?: boolean;
  }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'textarea',
    group,
    displayOrder,
    section: options?.section,
    placeholder: options?.placeholder,
    showIf: options?.showIf,
    fullWidth: options?.fullWidth,
  };
}

function textField(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; showIf?: SpecialtyFieldSchema['showIf']; placeholder?: string }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'text',
    group,
    displayOrder,
    section: options?.section,
    showIf: options?.showIf,
    placeholder: options?.placeholder,
  };
}

function selectField(
  key: string,
  label: string,
  optionsList: string[],
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; showIf?: SpecialtyFieldSchema['showIf'] }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'single_select',
    options: optionsList,
    group,
    displayOrder,
    section: options?.section,
    showIf: options?.showIf,
  };
}

const yes = (field: string): SpecialtyFieldSchema['showIf'] => ({ field, equals: 'Yes' });

const GENERAL_MEDICINE_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'GENERAL_MEDICINE',
  name: 'General Medicine',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'General Medicine consultation',
  fields: [
    // Patient Information — known chronic conditions
    tri('chronicHypertension', 'HTN', 'quick', 1, {
      section: 'Patient Information',
      summaryLabel: 'HTN',
    }),
    textField('hypertensionDuration', 'HTN duration', 'quick', 2, {
      section: 'Patient Information',
      showIf: yes('chronicHypertension'),
      placeholder: 'e.g. 5 years',
    }),
    textField('hypertensionTreatmentSummary', 'HTN treatment', 'quick', 3, {
      section: 'Patient Information',
      showIf: yes('chronicHypertension'),
      placeholder: 'Brief treatment summary',
    }),

    tri('chronicDiabetes', 'Diabetes', 'quick', 4, {
      section: 'Patient Information',
      summaryLabel: 'Diabetes',
    }),
    textField('diabetesDuration', 'DM duration', 'quick', 5, {
      section: 'Patient Information',
      showIf: yes('chronicDiabetes'),
      placeholder: 'e.g. 8 years',
    }),
    textField('diabetesTreatmentSummary', 'DM treatment', 'quick', 6, {
      section: 'Patient Information',
      showIf: yes('chronicDiabetes'),
      placeholder: 'e.g. Metformin',
    }),

    tri('chronicAsthma', 'Asthma', 'quick', 7, {
      section: 'Patient Information',
      summaryLabel: 'Asthma',
    }),
    textField('asthmaSummary', 'Asthma summary', 'quick', 8, {
      section: 'Patient Information',
      showIf: yes('chronicAsthma'),
    }),

    tri('chronicCopd', 'COPD', 'quick', 9, {
      section: 'Patient Information',
      summaryLabel: 'COPD',
    }),
    textField('copdSummary', 'COPD summary', 'quick', 10, {
      section: 'Patient Information',
      showIf: yes('chronicCopd'),
    }),

    tri('chronicIschemicHeartDisease', 'IHD', 'quick', 11, {
      section: 'Patient Information',
      summaryLabel: 'IHD',
    }),
    textField('ihdSummary', 'IHD / intervention summary', 'quick', 12, {
      section: 'Patient Information',
      showIf: yes('chronicIschemicHeartDisease'),
      placeholder: 'MI / PCI / CABG if relevant',
    }),

    tri('chronicKidneyDisease', 'CKD', 'quick', 13, {
      section: 'Patient Information',
      summaryLabel: 'CKD',
    }),
    textField('ckdSummary', 'CKD / dialysis summary', 'quick', 14, {
      section: 'Patient Information',
      showIf: yes('chronicKidneyDisease'),
    }),

    tri('chronicLiverDisease', 'CLD', 'quick', 15, {
      section: 'Patient Information',
      summaryLabel: 'CLD',
    }),
    textField('cldSummary', 'Liver history summary', 'quick', 16, {
      section: 'Patient Information',
      showIf: yes('chronicLiverDisease'),
    }),

    tri('chronicThyroidDisease', 'Thyroid', 'quick', 17, {
      section: 'Patient Information',
      summaryLabel: 'Thyroid',
    }),
    selectField(
      'thyroidType',
      'Thyroid type',
      ['Hypothyroid', 'Hyperthyroid', 'Other'],
      'quick',
      18,
      { section: 'Patient Information', showIf: yes('chronicThyroidDisease') }
    ),
    textField('thyroidNote', 'Thyroid note', 'quick', 19, {
      section: 'Patient Information',
      showIf: yes('chronicThyroidDisease'),
    }),

    // History — presenting concerns
    tri('presentingFever', 'Fever', 'quick', 20, { section: 'History' }),
    tri('presentingFatigue', 'Fatigue', 'quick', 21, { section: 'History' }),
    tri('presentingWeightChange', 'Weight change', 'quick', 22, { section: 'History' }),
    tri('presentingAppetiteChange', 'Appetite change', 'quick', 23, { section: 'History' }),

    textArea('generalExaminationSummary', 'General examination', 'quick', 40, {
      section: 'Examination',
    }),
    textArea('systemicExaminationSummary', 'Systemic examination', 'quick', 41, {
      section: 'Examination',
    }),
    textArea('clinicalImpression', 'Clinical assessment', 'quick', 42, {
      section: 'Assessment',
      fullWidth: true,
    }),

    // More — lightweight systemic reviews (not full specialty modules)
    tri('cvChestSymptoms', 'Chest symptoms', 'more', 50, { section: 'Cardiovascular' }),
    tri('cvEdema', 'Edema', 'more', 51, { section: 'Cardiovascular' }),
    textArea('cvHistorySummary', 'Cardiovascular history summary', 'more', 52, {
      section: 'Cardiovascular',
    }),

    tri('respCough', 'Cough', 'more', 60, { section: 'Respiratory' }),
    tri('respDyspnea', 'Dyspnea', 'more', 61, { section: 'Respiratory' }),
    tri('respWheeze', 'Wheeze', 'more', 62, { section: 'Respiratory' }),
    textArea('respHistorySummary', 'Respiratory history summary', 'more', 63, {
      section: 'Respiratory',
    }),

    tri('giNauseaVomiting', 'Nausea / vomiting', 'more', 70, { section: 'GI' }),
    tri('giBowelChange', 'Bowel change', 'more', 71, { section: 'GI' }),
    textArea('giSymptomSummary', 'Abdominal symptom summary', 'more', 72, { section: 'GI' }),

    tri('neuroDizziness', 'Dizziness', 'more', 80, { section: 'Neuro' }),
    tri('neuroWeakness', 'Weakness', 'more', 81, { section: 'Neuro' }),
    tri('neuroSeizureHistory', 'Seizure history', 'more', 82, { section: 'Neuro' }),
    textArea('neuroSymptomSummary', 'Neuro symptom summary', 'more', 83, { section: 'Neuro' }),

    textArea('endocrineMetabolicNote', 'Metabolic history note', 'more', 90, {
      section: 'Endocrine / Metabolic',
    }),
    textArea('renalHistorySummary', 'Urinary / renal history summary', 'more', 100, {
      section: 'Renal',
    }),
  ],
};

const OTHER_TEMPLATE: SpecialtyTemplateSchema = {
  key: 'OTHER',
  name: 'Other Specialty',
  version: CURRENT_SPECIALTY_TEMPLATE_VERSION,
  description: 'Specialty consultation',
  fields: [
    textArea('specialtyHistory', 'Presenting complaints / history', 'quick', 1, {
      section: 'History',
    }),
    textArea('specialtyExamination', 'Examination findings', 'quick', 2, {
      section: 'Examination',
    }),
    textArea('clinicalImpression', 'Clinical assessment', 'quick', 3, {
      section: 'Assessment',
      fullWidth: true,
    }),
    textArea('specialtyPlanNotes', 'Plan / notes', 'quick', 4, {
      section: 'Plan',
      fullWidth: true,
    }),
  ],
};

/** Versioned registry — Phase N completes core OPD specialties; unknown keys fall back to OTHER. */
export const SPECIALTY_TEMPLATE_REGISTRY: Partial<Record<SpecialtyKey, SpecialtyTemplateSchema>> = {
  GENERAL_MEDICINE: GENERAL_MEDICINE_TEMPLATE,
  CARDIOLOGY: CARDIOLOGY_TEMPLATE,
  PEDIATRICS: PEDIATRICS_TEMPLATE,
  PULMONOLOGY: PULMONOLOGY_TEMPLATE,
  GASTROENTEROLOGY: GASTROENTEROLOGY_TEMPLATE,
  HEPATOLOGY: HEPATOLOGY_TEMPLATE,
  GENERAL_SURGERY: GENERAL_SURGERY_TEMPLATE,
  ORTHOPEDICS: ORTHOPEDICS_TEMPLATE,
  NEUROLOGY: NEUROLOGY_TEMPLATE,
  NEUROSURGERY: NEUROSURGERY_TEMPLATE,
  ENT: ENT_TEMPLATE,
  ENDOCRINOLOGY: ENDOCRINOLOGY_TEMPLATE,
  NEPHROLOGY: NEPHROLOGY_TEMPLATE,
  UROLOGY: UROLOGY_TEMPLATE,
  DERMATOLOGY: DERMATOLOGY_TEMPLATE,
  RHEUMATOLOGY: RHEUMATOLOGY_TEMPLATE,
  INFECTIOUS_DISEASE: INFECTIOUS_DISEASE_TEMPLATE,
  PSYCHIATRY: PSYCHIATRY_TEMPLATE,
  ONCOLOGY: ONCOLOGY_TEMPLATE,
  ANESTHESIOLOGY: ANESTHESIOLOGY_TEMPLATE,
  EMERGENCY: EMERGENCY_TEMPLATE,
  NEONATOLOGY: NEONATOLOGY_TEMPLATE,
  /** Registered for summary/print helpers; UI path remains CUSTOM_LEGACY (not generic-rendered). */
  OPHTHALMOLOGY: OPHTHALMOLOGY_TEMPLATE,
  /** Registered for BE validation / helpers; UI path remains CUSTOM_LEGACY dental grid. */
  DENTAL: DENTAL_TEMPLATE,
  OTHER: OTHER_TEMPLATE,
};

export function getSpecialtyTemplate(key: SpecialtyKey): SpecialtyTemplateSchema {
  return SPECIALTY_TEMPLATE_REGISTRY[key] || SPECIALTY_TEMPLATE_REGISTRY.OTHER!;
}

export function listRegisteredSpecialtyTemplates(): SpecialtyTemplateSchema[] {
  return Object.values(SPECIALTY_TEMPLATE_REGISTRY).filter(Boolean) as SpecialtyTemplateSchema[];
}

export function usesGenericSpecialtyEngine(key: SpecialtyKey): boolean {
  return (
    key === 'GENERAL_MEDICINE' ||
    key === 'CARDIOLOGY' ||
    key === 'PEDIATRICS' ||
    key === 'PULMONOLOGY' ||
    key === 'GASTROENTEROLOGY' ||
    key === 'HEPATOLOGY' ||
    key === 'GENERAL_SURGERY' ||
    key === 'ORTHOPEDICS' ||
    key === 'NEUROLOGY' ||
    key === 'NEUROSURGERY' ||
    key === 'ENT' ||
    key === 'ENDOCRINOLOGY' ||
    key === 'NEPHROLOGY' ||
    key === 'UROLOGY' ||
    key === 'DERMATOLOGY' ||
    key === 'RHEUMATOLOGY' ||
    key === 'INFECTIOUS_DISEASE' ||
    key === 'PSYCHIATRY' ||
    key === 'ONCOLOGY' ||
    key === 'ANESTHESIOLOGY' ||
    key === 'EMERGENCY' ||
    key === 'NEONATOLOGY' ||
    key === 'OTHER'
    // OPHTHALMOLOGY / DENTAL intentionally excluded — CUSTOM_LEGACY hybrid
  );
}

/** All engine field keys that must exist on specialtyData FormGroup. */
export function allEngineSpecialtyFieldKeys(): string[] {
  const keys = new Set<string>();
  listRegisteredSpecialtyTemplates().forEach((template) => {
    template.fields.forEach((field) => keys.add(field.key));
  });
  return [...keys];
}

import { SpecialtyFieldSchema } from './specialty-template.schema';

/** Shared option lists and field builders for NEUROLOGY / NEUROSURGERY. */

export { LATERALITY_OPTIONS } from './surgical-shared';

export const MENTAL_STATUS_OPTIONS = [
  'Alert / oriented',
  'Confused',
  'Drowsy',
  'Obtunded',
  'Not assessed',
  'Not documented',
];

export const CRANIAL_NERVE_SUMMARY_OPTIONS = [
  'Intact',
  'Abnormal',
  'Not fully assessed',
  'Not documented',
];

export const MOTOR_SUMMARY_OPTIONS = [
  'Normal power',
  'Weakness present',
  'Not fully assessed',
  'Not documented',
];

export const SENSORY_SUMMARY_OPTIONS = [
  'Intact',
  'Impaired',
  'Not fully assessed',
  'Not documented',
];

export const REFLEX_SUMMARY_OPTIONS = [
  'Normal',
  'Brisk / hyper',
  'Reduced / absent',
  'Asymmetric',
  'Not assessed',
  'Not documented',
];

export const COORDINATION_SUMMARY_OPTIONS = [
  'Normal',
  'Impaired',
  'Not assessed',
  'Not documented',
];

export const GAIT_SUMMARY_OPTIONS = [
  'Normal',
  'Abnormal',
  'Unable to walk / not tested',
  'Not assessed',
  'Not documented',
];

export const PROBLEM_DOMAIN_OPTIONS = [
  'Brain',
  'Spine',
  'Peripheral nerve',
  'Trauma',
  'Other',
  'Not documented',
];

export const SURGICAL_PLAN_STATUS_OPTIONS = [
  'Observe',
  'Further imaging',
  'Procedure recommended',
  'Admission recommended',
  'Operation planned',
  'Post-op follow-up',
];

export const SEIZURE_CLASS_OPTIONS = [
  'Focal',
  'Generalized',
  'Unknown',
  'Unclassified',
  'Not documented',
];

export const STROKE_TYPE_OPTIONS = [
  'Ischemic',
  'Hemorrhagic',
  'Unknown',
  'TIA',
  'Not documented',
];

export const HEMORRHAGE_TYPE_OPTIONS = [
  'ICH',
  'SDH',
  'EDH',
  'SAH',
  'Mixed / other',
  'Not documented',
];

export function tri(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    summaryLabel?: string;
    showIf?: SpecialtyFieldSchema['showIf'];
    helpText?: string;
  }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'tri_state',
    group,
    displayOrder,
    section: options?.section,
    summaryLabel: options?.summaryLabel,
    showIf: options?.showIf,
    helpText: options?.helpText,
  };
}

export function text(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    placeholder?: string;
    showIf?: SpecialtyFieldSchema['showIf'];
    summaryLabel?: string;
    helpText?: string;
  }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'text',
    group,
    displayOrder,
    section: options?.section,
    placeholder: options?.placeholder,
    showIf: options?.showIf,
    summaryLabel: options?.summaryLabel,
    helpText: options?.helpText,
  };
}

export function textArea(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    showIf?: SpecialtyFieldSchema['showIf'];
    placeholder?: string;
    helpText?: string;
  }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'textarea',
    group,
    displayOrder,
    section: options?.section,
    showIf: options?.showIf,
    placeholder: options?.placeholder,
    helpText: options?.helpText,
  };
}

export function select(
  key: string,
  label: string,
  optionsList: string[],
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    showIf?: SpecialtyFieldSchema['showIf'];
    summaryLabel?: string;
    helpText?: string;
  }
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
    summaryLabel: options?.summaryLabel,
    helpText: options?.helpText,
  };
}

export function dateField(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    showIf?: SpecialtyFieldSchema['showIf'];
    helpText?: string;
  }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'date',
    group,
    displayOrder,
    section: options?.section,
    showIf: options?.showIf,
    helpText: options?.helpText,
  };
}

export const yes = (field: string): SpecialtyFieldSchema['showIf'] => ({ field, equals: 'Yes' });

export const equals =
  (field: string, value: unknown): SpecialtyFieldSchema['showIf'] => ({ field, equals: value });

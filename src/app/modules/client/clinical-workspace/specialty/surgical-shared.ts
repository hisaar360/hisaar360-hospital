import { SpecialtyFieldSchema } from './specialty-template.schema';

/** Shared option lists and field builders for GENERAL_SURGERY / ORTHOPEDICS. */

export const LATERALITY_OPTIONS = ['Right', 'Left', 'Bilateral', 'Midline', 'Not applicable', 'Not documented'];

export const BODY_REGION_OPTIONS = [
  'Head / face',
  'Neck',
  'Shoulder',
  'Arm / elbow',
  'Forearm / wrist',
  'Hand',
  'Chest / thorax',
  'Abdomen',
  'Pelvis / hip',
  'Thigh / knee',
  'Leg / ankle',
  'Foot',
  'Spine / back',
  'Other',
  'Not documented',
];

export const ANATOMICAL_SITE_OPTIONS = [
  'Inguinal',
  'Umbilical',
  'Epigastric',
  'Incisional',
  'Breast',
  'Thyroid',
  'Gallbladder / biliary',
  'Appendix',
  'Anorectal',
  'Soft tissue / skin',
  'Bone',
  'Joint',
  'Tendon / ligament',
  'Other',
  'Not documented',
];

export function tri(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; summaryLabel?: string; showIf?: SpecialtyFieldSchema['showIf']; helpText?: string }
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
    showIf: options?.showIf,
    placeholder: options?.placeholder,
    helpText: options?.helpText,
    fullWidth: options?.fullWidth,
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

export function integer(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: {
    section?: string;
    unit?: string;
    min?: number;
    max?: number;
    showIf?: SpecialtyFieldSchema['showIf'];
    helpText?: string;
    summaryLabel?: string;
  }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'integer',
    group,
    displayOrder,
    unit: options?.unit,
    min: options?.min,
    max: options?.max,
    section: options?.section,
    showIf: options?.showIf,
    helpText: options?.helpText,
    summaryLabel: options?.summaryLabel,
  };
}

export function dateField(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; showIf?: SpecialtyFieldSchema['showIf'] }
): SpecialtyFieldSchema {
  return {
    key,
    label,
    type: 'date',
    group,
    displayOrder,
    section: options?.section,
    showIf: options?.showIf,
  };
}

export const yes = (field: string): SpecialtyFieldSchema['showIf'] => ({ field, equals: 'Yes' });

export const equals =
  (field: string, value: unknown): SpecialtyFieldSchema['showIf'] => ({ field, equals: value });

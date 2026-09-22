import { SpecialtyFieldSchema } from './specialty-template.schema';

/** Shared field builders for GASTROENTEROLOGY / HEPATOLOGY templates. */

export function tri(
  key: string,
  label: string,
  group: 'quick' | 'more',
  displayOrder: number,
  options?: { section?: string; summaryLabel?: string; showIf?: SpecialtyFieldSchema['showIf'] }
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

export function decimal(
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
    type: 'decimal',
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

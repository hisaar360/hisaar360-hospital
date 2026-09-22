import { SpecialtyKey } from './specialty-keys';

export type SpecialtyFieldType =
  | 'text'
  | 'textarea'
  | 'integer'
  | 'decimal'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'tri_state'
  | 'checkbox'
  | 'single_select'
  | 'multi_select'
  | 'radio'
  | 'measurement'
  | 'score'
  | 'score-display'
  | 'laterality'
  | 'file_ref'
  | 'linked_record'
  | 'repeatable-row';

export interface SpecialtyShowIf {
  field: string;
  equals: unknown;
}

export interface SpecialtyFieldSchema {
  key: string;
  label: string;
  type: SpecialtyFieldType;
  unit?: string;
  options?: string[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: unknown;
  showIf?: SpecialtyShowIf;
  repeatable?: boolean;
  min?: number;
  max?: number;
  displayOrder: number;
  helpText?: string;
  collapsedByDefault?: boolean;
  /** Compact summary chip label when value is Yes / meaningful. */
  summaryLabel?: string;
  /** Quick fields show immediately; more-detail fields sit behind accordion. */
  group: 'quick' | 'more';
  /** Optional visual subgroup label inside Quick or More Details. */
  section?: string;
  /** Force full-width in the section grid (e.g. single Assessment textarea). */
  fullWidth?: boolean;
}

export interface SpecialtyTemplateSchema {
  key: SpecialtyKey;
  name: string;
  version: string;
  description: string;
  fields: SpecialtyFieldSchema[];
}

/** Simple string version used with specialtyKey (e.g. GENERAL_MEDICINE + 1.0). */
export const CURRENT_SPECIALTY_TEMPLATE_VERSION = '1.0';

export function quickFields(template: SpecialtyTemplateSchema): SpecialtyFieldSchema[] {
  return template.fields
    .filter((field) => field.group === 'quick')
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function moreFields(template: SpecialtyTemplateSchema): SpecialtyFieldSchema[] {
  return template.fields
    .filter((field) => field.group === 'more')
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function evaluateShowIf(
  showIf: SpecialtyShowIf | undefined,
  values: Record<string, unknown>
): boolean {
  if (!showIf) {
    return true;
  }
  return values[showIf.field] === showIf.equals;
}

export function collectTemplateFieldKeys(template: SpecialtyTemplateSchema): string[] {
  return template.fields.map((field) => field.key);
}

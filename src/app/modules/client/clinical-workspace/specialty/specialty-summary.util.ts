import { SpecialtyKey, specialtyDisplayName } from './specialty-keys';
import { getSpecialtyTemplate } from './specialty-template.registry';
import { SpecialtyFieldSchema, SpecialtyTemplateSchema } from './specialty-template.schema';

function isYes(value: unknown): boolean {
  const text = String(value || '').trim().toLowerCase();
  return text === 'yes' || text === 'true' || value === true;
}

function isMeaningful(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const text = String(value).trim();
  if (!text) {
    return false;
  }
  const lower = text.toLowerCase();
  return lower !== 'no' && lower !== 'false' && lower !== 'unknown' && lower !== 'not recorded';
}

/**
 * Compact specialty summary chips — only meaningful positive values.
 * Generic: uses field.summaryLabel when value is Yes; specialty-specific extractors can extend later.
 */
export function buildSpecialtySummaryParts(
  key: SpecialtyKey,
  data: Record<string, unknown> | null | undefined,
  template?: SpecialtyTemplateSchema | null
): string[] {
  const record = data || {};
  const schema = template || getSpecialtyTemplate(key);
  const parts: string[] = [];

  schema.fields.forEach((field: SpecialtyFieldSchema) => {
    if (!field.summaryLabel) {
      return;
    }
    const raw = record[field.key];
    if (isYes(raw)) {
      parts.push(field.summaryLabel);
      return;
    }
    // Meaningful non-boolean values (e.g. EF 45, PCI 2023, NYHA II, Follow-up plan)
    if (field.type !== 'tri_state' && field.type !== 'boolean' && field.type !== 'checkbox' && isMeaningful(raw)) {
      const value = String(raw).trim();
      if (field.key === 'lvefPercent' || field.summaryLabel === 'EF') {
        parts.push(`EF ${value}%`.replace('%%', '%'));
        return;
      }
      if (field.summaryLabel === 'PCI' || field.summaryLabel === 'NYHA') {
        parts.push(`${field.summaryLabel} ${value}`);
        return;
      }
      parts.push(field.summaryLabel);
    }
  });

  return parts;
}

/**
 * Returns empty string when there is nothing meaningful to show
 * (callers should hide the summary area entirely).
 */
export function buildSpecialtySummaryLine(
  key: SpecialtyKey,
  data: Record<string, unknown> | null | undefined,
  template?: SpecialtyTemplateSchema | null
): string {
  const parts = buildSpecialtySummaryParts(key, data, template);
  return parts.length ? parts.join(' · ') : '';
}

export function buildSpecialtySummaryTitleLine(
  key: SpecialtyKey,
  data: Record<string, unknown> | null | undefined,
  template?: SpecialtyTemplateSchema | null
): string {
  const name = template?.name || specialtyDisplayName(key);
  const parts = buildSpecialtySummaryParts(key, data, template);
  return parts.length ? `${name} · ${parts.join(' · ')}` : name;
}

/** Compact print rows for engine specialties — skip empty / No values. */
export function buildEngineSpecialtyPrintRows(
  key: SpecialtyKey,
  data: Record<string, unknown> | null | undefined
): Array<{ label: string; value: string; wide?: boolean }> {
  const record = data || {};
  const template = getSpecialtyTemplate(key);
  const rows: Array<{ label: string; value: string; wide?: boolean }> = [];

  template.fields.forEach((field) => {
    const raw = record[field.key];
    if (!isMeaningful(raw) && !isYes(raw)) {
      return;
    }
    const value = isYes(raw) ? 'Yes' : String(raw ?? '').trim();
    if (!value) {
      return;
    }
    rows.push({
      label: field.label,
      value,
      wide: field.type === 'textarea' ? true : undefined,
    });
  });

  return rows.slice(0, 16);
}

import { PrescriptionTemplate } from '../../../shared/models/hospital.model';
import { SpecialtyTemplateKey } from './prescription-specialty-print';

export type GynaePrintLayout = 'gynae-clinical' | 'gynae-womens-health' | 'gynae-modern';

const GYNAE_PRINT_TEMPLATES = new Set<string>([
  'gynae-clinical',
  'gynae-womens-health',
  'gynae-modern',
]);

export function isGynaeSpecialty(specialtySection: SpecialtyTemplateKey | '' | null | undefined): boolean {
  return specialtySection === 'gynae';
}

/**
 * Keep explicit gynae theme IDs as-is so designer/pharmacy print can honor them.
 * Empty/unknown values fall back to classic.
 */
export function normalizeGynaePrescriptionTemplate(
  template: PrescriptionTemplate | null | undefined,
  _specialtySection?: SpecialtyTemplateKey | '' | null
): PrescriptionTemplate {
  const value = String(template || '').trim();
  if (!value) {
    return 'classic';
  }

  return (value as PrescriptionTemplate) || 'classic';
}

/** Dedicated gynae sheet when an explicit gynae-* template is selected. */
export function resolveGynaePrintLayout(
  _specialtySection?: SpecialtyTemplateKey | '' | null,
  template?: PrescriptionTemplate | null
): GynaePrintLayout | null {
  const normalized = normalizeGynaePrescriptionTemplate(template);
  if (GYNAE_PRINT_TEMPLATES.has(normalized)) {
    return normalized as GynaePrintLayout;
  }

  return null;
}

export function usesGynaeClinicalPrint(
  specialtySection?: SpecialtyTemplateKey | '' | null,
  template?: PrescriptionTemplate | null
): boolean {
  return resolveGynaePrintLayout(specialtySection, template) === 'gynae-clinical';
}

export function usesGynaeWomensHealthPrint(
  specialtySection?: SpecialtyTemplateKey | '' | null,
  template?: PrescriptionTemplate | null
): boolean {
  return resolveGynaePrintLayout(specialtySection, template) === 'gynae-womens-health';
}

export function usesGynaeModernPrint(
  specialtySection?: SpecialtyTemplateKey | '' | null,
  template?: PrescriptionTemplate | null
): boolean {
  return resolveGynaePrintLayout(specialtySection, template) === 'gynae-modern';
}

export function usesGynaeClinicalBluePrint(
  _specialtySection?: SpecialtyTemplateKey | '' | null,
  _template?: PrescriptionTemplate | null
): boolean {
  // clinical-blue uses the shared general print sheets, not a dedicated gynae host.
  return false;
}

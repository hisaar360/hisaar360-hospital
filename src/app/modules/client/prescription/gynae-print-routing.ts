import { PrescriptionTemplate } from '../../../shared/models/hospital.model';
import { SpecialtyTemplateKey } from './prescription-specialty-print';

/** Dedicated gynae print layouts are retired — one shared general theme for all specialties. */
export type GynaePrintLayout = null;

const LEGACY_GYNAE_PRINT_TEMPLATES = new Set<string>([
  'gynae-clinical',
  'gynae-womens-health',
  'gynae-modern',
]);

export function isGynaeSpecialty(specialtySection: SpecialtyTemplateKey | '' | null | undefined): boolean {
  return specialtySection === 'gynae';
}

/**
 * Map any prescription template to the shared general theme set.
 * Legacy gynae-only themes collapse to classic so one print design is used for everyone.
 */
export function normalizeGynaePrescriptionTemplate(
  template: PrescriptionTemplate | null | undefined,
  _specialtySection?: SpecialtyTemplateKey | '' | null
): PrescriptionTemplate {
  const value = String(template || '').trim();
  if (!value || LEGACY_GYNAE_PRINT_TEMPLATES.has(value)) {
    return 'classic';
  }

  return (value as PrescriptionTemplate) || 'classic';
}

/** Always null — dedicated gynae print components are no longer selected. */
export function resolveGynaePrintLayout(
  _specialtySection?: SpecialtyTemplateKey | '' | null,
  _template?: PrescriptionTemplate | null
): GynaePrintLayout {
  return null;
}

export function usesGynaeClinicalPrint(
  _specialtySection?: SpecialtyTemplateKey | '' | null,
  _template?: PrescriptionTemplate | null
): boolean {
  return false;
}

export function usesGynaeWomensHealthPrint(
  _specialtySection?: SpecialtyTemplateKey | '' | null,
  _template?: PrescriptionTemplate | null
): boolean {
  return false;
}

export function usesGynaeModernPrint(
  _specialtySection?: SpecialtyTemplateKey | '' | null,
  _template?: PrescriptionTemplate | null
): boolean {
  return false;
}

export function usesGynaeClinicalBluePrint(
  _specialtySection?: SpecialtyTemplateKey | '' | null,
  _template?: PrescriptionTemplate | null
): boolean {
  return false;
}

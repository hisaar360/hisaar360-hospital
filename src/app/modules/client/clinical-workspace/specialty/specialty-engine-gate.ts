/**
 * Whether Specialty tab should use the Phase D/E generic engine renderer.
 *
 * CURRENT UI PATH MAP
 * -------------------
 * GENERIC_ENGINE:
 *   GENERAL_MEDICINE, CARDIOLOGY, PEDIATRICS, PULMONOLOGY,
 *   GASTROENTEROLOGY, HEPATOLOGY, GENERAL_SURGERY, ORTHOPEDICS,
 *   NEUROLOGY, NEUROSURGERY, ENT,
 *   ENDOCRINOLOGY, NEPHROLOGY, UROLOGY, DERMATOLOGY, RHEUMATOLOGY,
 *   INFECTIOUS_DISEASE, PSYCHIATRY, ONCOLOGY, ANESTHESIOLOGY,
 *   EMERGENCY, NEONATOLOGY
 *
 * OTHER_FALLBACK (generic OTHER template until specialty phase ships):
 *   specialist surgery (thoracic/HPB/etc.), RADIOLOGY/ULTRASOUND/LAB keys without legacy, etc.
 *
 * CUSTOM_LEGACY (do not generic-render):
 *   OBGYN / gynae — hybrid custom UI + PregnancyEpisode longitudinal model
 *   PHYSIOTHERAPY
 *   OPHTHALMOLOGY / eye — hybrid CUSTOM_LEGACY (legacy eye grid; not generic renderer)
 *   DENTAL / dental — hybrid CUSTOM_LEGACY (legacy dental grid; not generic renderer)
 *   ultrasound / radiology / lab legacy grids
 */
import { SpecialtyKey, specialtyUiPath } from './specialty-keys';

export function shouldUseGenericSpecialtyEngine(options: {
  specialtyKey: SpecialtyKey;
  legacySection: string | null | undefined;
}): boolean {
  const path = specialtyUiPath(options.specialtyKey, options.legacySection);
  return path === 'GENERIC_ENGINE' || path === 'OTHER_FALLBACK';
}

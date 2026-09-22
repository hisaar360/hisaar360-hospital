/**
 * Compatibility shim — prefer `doctor-master-data.catalog` for new code.
 */
export {
  CUSTOM_VALUE as CUSTOM_SPECIALIZATION_VALUE,
  CUSTOM_VALUE,
  CLINICAL_DEPARTMENTS,
  DOCTOR_DEPARTMENTS,
  DOCTOR_DESIGNATIONS,
  DOCTOR_QUALIFICATIONS,
  DOCTOR_SPECIALIZATIONS,
  LEGACY_DEPARTMENT_ALIASES,
  clinicalDepartmentLabel,
  filterOptions,
  findDepartmentByKey,
  findDepartmentByLabel,
  inferDepartmentFromSpecialization as inferClinicalDepartmentFromSpecialization,
  joinMulti,
  mapSpecialtyKeyToPrescriptionTemplate,
  resolveDoctorSpecialtyKey,
  splitMulti,
  type DoctorDepartmentOption,
  type LegacyClinicalDepartmentKey as ClinicalDepartmentKey,
} from './doctor-master-data.catalog';

import {
  DOCTOR_QUALIFICATIONS,
  mapSpecialtyKeyToPrescriptionTemplate,
  resolveDoctorSpecialtyKey,
  specializationsForDepartment as masterSpecializationsForDepartment,
} from './doctor-master-data.catalog';
import { SpecialtyTemplateKey } from '../../modules/client/prescription/prescription-specialty-print';

export const AUTO_PRESCRIPTION_SPECIALTY = 'auto';

export interface CatalogOption {
  value: string;
  label?: string;
  specialtyTemplate?: SpecialtyTemplateKey;
  prescriptionTemplate?: string;
}

export const QUALIFICATION_OPTIONS: CatalogOption[] = DOCTOR_QUALIFICATIONS.filter(
  (item) => item !== 'Other / Custom'
).map((value) => ({ value, label: value }));

export const PRESCRIPTION_SPECIALTY_OPTIONS: Array<{ key: SpecialtyTemplateKey; label: string }> = [
  { key: 'general', label: 'General Prescription (Medicines + Vitals + Lab)' },
  { key: 'eye', label: 'Eye Prescription' },
  { key: 'physiotherapy', label: 'Physiotherapy Treatment Plan' },
  { key: 'dental', label: 'Dental Chart + Procedure' },
  { key: 'ultrasound', label: 'Ultrasound Report' },
  { key: 'radiology', label: 'Radiology Report' },
  { key: 'gynae', label: 'Gynae / Obstetric Notes' },
  { key: 'lab', label: 'Lab Report Format' },
];

/** CatalogOption-shaped specialization list (legacy callers). */
export function specializationsForDepartment(departmentKey: string): CatalogOption[] {
  return masterSpecializationsForDepartment(departmentKey).map((value) => ({
    value,
    label: value,
    specialtyTemplate: resolveSpecialtyTemplateForSpecialization(value, departmentKey),
  }));
}

export function findSpecializationOption(
  departmentKey: string,
  value: string
): CatalogOption | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return (
    specializationsForDepartment(departmentKey).find(
      (item) => item.value.trim().toLowerCase() === normalized
    ) || null
  );
}

export function resolveSpecialtyTemplateForSpecialization(
  specialization: string,
  departmentKey = ''
): SpecialtyTemplateKey {
  const specialtyKey = resolveDoctorSpecialtyKey(departmentKey, [specialization]);
  return mapSpecialtyKeyToPrescriptionTemplate(specialtyKey);
}

export function specialtyTemplateLabel(key: SpecialtyTemplateKey): string {
  return PRESCRIPTION_SPECIALTY_OPTIONS.find((item) => item.key === key)?.label || key;
}

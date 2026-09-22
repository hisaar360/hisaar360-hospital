import {
  isSpecialtyKey,
  legacySectionToSpecialtyKey,
  normalizeSpecialtyKey,
  SpecialtyKey,
} from './specialty-keys';

export interface SpecialtyResolveInput {
  /** Saved on the consultation record — highest priority when editing. */
  savedSpecialtyKey?: string | null;
  /** DoctorProfile explicit specialty / specialization. */
  doctorSpecialty?: string | null;
  /** Doctor clinical department label. */
  doctorDepartment?: string | null;
  /** Appointment department name. */
  appointmentDepartment?: string | null;
  /** Hospital Department.name */
  departmentName?: string | null;
  /** Legacy specialtySection on prescription. */
  legacySpecialtySection?: string | null;
  /** Extra free-text blobs (qualification, etc.). */
  extraText?: string | null;
  mode?: 'create' | 'edit';
}

/**
 * Deterministic specialty resolution.
 *
 * Edit mode:
 * 1. saved specialtyKey
 * 2. legacy specialtySection
 * 3. OTHER (do not re-derive from renamed doctor department)
 *
 * Create mode:
 * 1. doctor specialty
 * 2. doctor department
 * 3. appointment department
 * 4. department name
 * 5. legacy specialtySection (if prefilled)
 * 6. OTHER
 */
export function resolveSpecialtyKey(input: SpecialtyResolveInput): SpecialtyKey {
  const mode = input.mode || 'create';

  if (mode === 'edit') {
    if (isSpecialtyKey(String(input.savedSpecialtyKey || '').trim())) {
      return String(input.savedSpecialtyKey).trim() as SpecialtyKey;
    }
    if (input.legacySpecialtySection) {
      return legacySectionToSpecialtyKey(input.legacySpecialtySection);
    }
    return 'OTHER';
  }

  const candidates = [
    input.doctorSpecialty,
    input.doctorDepartment,
    input.appointmentDepartment,
    input.departmentName,
    input.extraText,
    input.legacySpecialtySection,
  ];

  for (const candidate of candidates) {
    if (!String(candidate || '').trim()) {
      continue;
    }
    const key = normalizeSpecialtyKey(candidate);
    if (key !== 'OTHER') {
      return key;
    }
  }

  // Last pass: join all text for multi-token aliases (e.g. "Heart Department").
  const joined = candidates.filter(Boolean).join(' ');
  if (joined.trim()) {
    return normalizeSpecialtyKey(joined);
  }

  return 'OTHER';
}

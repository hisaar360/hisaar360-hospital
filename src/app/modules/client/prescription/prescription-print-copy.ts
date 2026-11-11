export interface PrescriptionPrintCopy {
  doctorDisplayName: string;
  qualification: string;
  specialtyTitle: string;
  contactPhone: string;
  contactEmail: string;
  hospitalLine: string;
  rxTitle: string;
  clinicTagline: string;
}

export const DEFAULT_PRESCRIPTION_PRINT_COPY: PrescriptionPrintCopy = {
  doctorDisplayName: '',
  qualification: '',
  specialtyTitle: '',
  contactPhone: '',
  contactEmail: '',
  hospitalLine: '',
  rxTitle: 'PRESCRIPTION',
  clinicTagline: '',
};

const trimField = (value: unknown, max: number): string =>
  String(value ?? '')
    .trim()
    .slice(0, max);

export function normalizePrescriptionPrintCopy(
  copy?: Partial<PrescriptionPrintCopy> | null
): PrescriptionPrintCopy {
  const incoming = copy && typeof copy === 'object' ? copy : {};
  const rxTitle = trimField(incoming.rxTitle, 80) || DEFAULT_PRESCRIPTION_PRINT_COPY.rxTitle;

  return {
    doctorDisplayName: trimField(incoming.doctorDisplayName, 150),
    qualification: trimField(incoming.qualification, 200),
    specialtyTitle: trimField(incoming.specialtyTitle, 200),
    contactPhone: trimField(incoming.contactPhone, 40),
    contactEmail: trimField(incoming.contactEmail, 120),
    hospitalLine: trimField(incoming.hospitalLine, 200),
    rxTitle,
    clinicTagline: trimField(incoming.clinicTagline, 200),
  };
}

export function resolvePrintCopyValue(
  override: string | null | undefined,
  fallback: string | null | undefined,
  emptyFallback = ''
): string {
  const primary = String(override || '').trim();
  if (primary) {
    return primary;
  }
  const secondary = String(fallback || '').trim();
  return secondary || emptyFallback;
}

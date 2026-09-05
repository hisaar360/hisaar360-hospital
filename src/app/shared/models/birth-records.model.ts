import { BirthCertificateRecord, BirthCertificateSnapshot, BirthRecordItem } from '../../modules/client/ward/birth-certificate-print.builder';

export type { BirthCertificateRecord, BirthCertificateSnapshot, BirthRecordItem };

export interface BirthCertificateVerificationResult {
  found: boolean;
  status?: 'VALID' | 'REVOKED' | 'SUPERSEDED' | string;
  certificateNo?: string;
  hospitalName?: string;
  hospitalLogoUrl?: string;
  hospitalAddress?: string;
  hospitalCity?: string;
  hospitalPhone?: string;
  hospitalEmail?: string;
  hospitalWebsite?: string;
  hospitalTagline?: string;
  documentTitle?: string;
  birthRecordNo?: string;
  verificationDisplayCode?: string;
  babyName?: string;
  babySex?: string;
  babyMrNo?: string;
  babyTimeOfBirth?: string;
  babyPlaceOfBirth?: string;
  babyBirthWeightGrams?: number | null;
  pluralityLabel?: string;
  dateOfBirth?: string | Date | null;
  motherName?: string;
  motherMrNo?: string;
  fatherName?: string;
  deliveredBy?: string;
  modeOfDelivery?: string;
  issuedAt?: string | Date | null;
  version?: number;
  signatoryName?: string;
  signatoryDesignation?: string;
  signatureUrl?: string;
  stampUrl?: string;
  revokedAt?: string | Date | null;
  revocationReason?: string;
  supersededMessage?: string;
  latestCertificateNo?: string;
  latestVersion?: number;
  footerText?: string;
  legalDisclaimer?: string;
}

export interface BirthCertificateDetail extends BirthCertificateRecord {
  snapshot: BirthCertificateSnapshot;
  publicVerificationCode?: string;
  verificationBaseUrl?: string;
  verificationDisplayCode?: string;
  issuedAt: string | Date;
  /** Server-embedded QR (data URL) — View Certificate should not call external QR APIs. */
  qrCodeDataUrl?: string;
}

export interface MotherPatientSummary {
  firstName?: string;
  lastName?: string;
  patientNo?: string;
}

export interface MotherAdmissionSummary {
  admissionNo?: string;
  room?: { name?: string; roomNo?: string };
  bed?: { bedNo?: string; name?: string };
  encounterId?: string;
}

export interface BirthRecordMotherContext {
  mother?: MotherPatientSummary & { _id?: string; gender?: string; phone?: string; dateOfBirth?: string };
  admission?: MotherAdmissionSummary | null;
  existingNewborns?: Array<Record<string, unknown>>;
}

export interface BirthCertificateIssueResult {
  certificate: BirthCertificateDetail;
  warnings?: string[];
}

export interface BirthCertificateCorrectResult {
  certificate: BirthCertificateDetail;
  supersededCertificateId?: string;
}

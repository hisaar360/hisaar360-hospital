/**
 * Neutral Clinical Workspace concepts.
 * Persistence currently maps to the Prescription API for compatibility.
 * Encounter remains the visit/admission identity when present.
 */
export type ClinicalWorkspaceTab = 'visit' | 'specialty' | 'orders' | 'history';

export type ClinicalOrdersSubTab =
  | 'medicines'
  | 'lab'
  | 'iv'
  | 'admission'
  | 'documents';

export type ClinicalSpecialtySubTab = 'notes' | 'ultrasound';

export interface ClinicalPatientHeaderModel {
  name: string;
  ageSex: string;
  mrNo: string;
  allergies: string;
  bloodGroup: string;
  lastVisit: string;
  specialtySummary?: string | null;
  /** Gynae consultation banner extras */
  variant?: 'default' | 'gynae';
  phone?: string;
  patientId?: string;
  pregnancyLabel?: string;
  eddLabel?: string;
  avatarInitials?: string;
}

export interface ClinicalWorkspaceContext {
  patientId: string | null;
  appointmentId: string | null;
  doctorId: string | null;
  departmentId: string | null;
  hospitalId: string | null;
  encounterId: string | null;
}

export type MarDosePresentationStatus =
  | 'Due'
  | 'Upcoming'
  | 'Given'
  | 'Late'
  | 'Missed'
  | 'Held'
  | 'Refused'
  | 'Not Available';

export interface MarDoseSlot {
  id: string;
  label: string;
  scheduledAt: string;
  status: MarDosePresentationStatus;
  administeredAt?: string | null;
  administeredBy?: string | null;
  activityId?: string | null;
}

export interface MarMedicineCard {
  id: string;
  medicine: string;
  dose: string;
  route: string;
  frequency: string;
  recommendedBy?: string;
  enteredBy?: string;
  issuedBy?: string;
  startAt?: string;
  duration?: string;
  pharmacyStatus?: string;
  lastGivenAt?: string | null;
  lastGivenBy?: string | null;
  nextDueAt?: string | null;
  nextDueLabel?: string;
  prescriptionId?: string;
  patientId?: string;
  admissionId?: string;
  slots: MarDoseSlot[];
}

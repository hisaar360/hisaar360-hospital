import { Patient, PrescriptionTemplate } from '../../../shared/models/hospital.model';
import { ClinicalRxPrintPage } from './clinical-rx-print-pages';
import { GynaeConsultMode } from './gynae-prescription-data';
import {
  PrescriptionCustomSection,
  PrescriptionLayoutSection,
} from './prescription-style';

export type PrescriptionPrintDoseSlot = 'morning' | 'noon' | 'evening' | 'night';

export interface PrescriptionPrintPreviewData {
  template: PrescriptionTemplate;
  patient: Patient;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientNo: string;
  patientPhone: string;
  patientAddress: string;
  doctorName: string;
  doctorNamePlain: string;
  doctorNameUrdu: string;
  doctorQualification: string;
  doctorQualificationUrdu: string;
  doctorTitleEnglish: string;
  doctorTitleUrdu: string;
  doctorSpecialty?: string;
  clinicTagline?: string;
  contactPhone?: string;
  contactEmail?: string;
  rxTitle?: string;
  visitType?: string;
  hospitalName: string;
  hospitalNameUrdu: string;
  hospitalAddress: string;
  hospitalAddressUrdu: string;
  hospitalLogoUrl: string;
  showHospitalLogo: boolean;
  hospitalLogoScale: number;
  prescriptionRevisionNote: string;
  prescriptionFollowUpLine: string;
  prescriptionFooterLines: string[];
  date: string;
  prescriptionNo: string;
  disease: string;
  vitals: Record<string, string>;
  vitalRows: Array<{ label: string; value: string }>;
  labTests: Array<{ name: string; category: string }>;
  ivFluids: Array<{ name: string; rate: string; quantity: string; route: string }>;
  medicines: Array<Record<string, unknown>>;
  followUpDate: string;
  patientNote: string;
  consultation: string;
  admissionOrderLines: string[];
  consultationRows?: Array<{ label: string; value: string; wide?: boolean }>;
  specialtyTitle?: string;
  specialtySection?: string;
  specialtyRows?: Array<{ label: string; value: string; wide?: boolean }>;
  gynaeConsultationRows?: Array<{ label: string; value: string }>;
  gynaeSidebarRows?: Array<{ label: string; value: string; wide?: boolean }>;
  gynaeExtendedRows?: Array<{ label: string; value: string; wide?: boolean }>;
  gynaeSummaryRows?: Array<{ label: string; value: string }>;
  ultrasoundRows?: Array<{ label: string; value: string }>;
  clinicalPages?: ClinicalRxPrintPage[];
  gynaeMode?: GynaeConsultMode;
  patientBloodGroup?: string;
  styleCssVars?: Record<string, string>;
  layout?: PrescriptionLayoutSection[];
  customSections?: PrescriptionCustomSection[];
}

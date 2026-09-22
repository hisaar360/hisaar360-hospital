import { SpecialtyKey } from '../../modules/client/clinical-workspace/specialty/specialty-keys';
import { SpecialtyTemplateKey } from '../../modules/client/prescription/prescription-specialty-print';

/** Sentinel value for “add custom” options in searchable selects. */
export const CUSTOM_VALUE = '__custom__';

export interface DoctorDepartmentOption {
  key: string;
  label: string;
  specialtyKey: SpecialtyKey;
}

/** Legacy clinical department keys stored on older doctor records. */
export type LegacyClinicalDepartmentKey =
  | 'general_medical'
  | 'surgery'
  | 'women_child'
  | 'pediatrics'
  | 'eye_ent_dental'
  | 'physiotherapy'
  | 'diagnostics'
  | 'emergency_critical_care'
  | 'anesthesia'
  | 'oncology'
  | 'other_common';

export interface LegacyClinicalDepartmentOption {
  key: LegacyClinicalDepartmentKey;
  label: string;
}

/** Labels for legacy department keys (unchanged from original catalog). */
export const CLINICAL_DEPARTMENTS: LegacyClinicalDepartmentOption[] = [
  { key: 'general_medical', label: 'General / Medical' },
  { key: 'surgery', label: 'Surgery' },
  { key: 'women_child', label: 'Women & Child / OBS-Gynae' },
  { key: 'pediatrics', label: 'Pediatrics' },
  { key: 'eye_ent_dental', label: 'Eye / ENT / Dental' },
  { key: 'physiotherapy', label: 'Physiotherapy & Rehabilitation' },
  { key: 'diagnostics', label: 'Diagnostics / Laboratory / Radiology' },
  { key: 'emergency_critical_care', label: 'Emergency & Critical Care' },
  { key: 'anesthesia', label: 'Anesthesia & Pain Management' },
  { key: 'oncology', label: 'Oncology / Cancer Care' },
  { key: 'other_common', label: 'Other / Allied Health' },
];

/** Map legacy stored keys to closest canonical department slug. */
export const LEGACY_DEPARTMENT_ALIASES: Record<string, string> = {
  general_medical: 'general_medicine',
  surgery: 'general_surgery',
  women_child: 'obgyn',
  eye_ent_dental: 'ophthalmology',
  diagnostics: 'radiology',
  emergency_critical_care: 'emergency',
  anesthesia: 'anesthesiology',
  other_common: 'other',
};

/** Default SpecialtyKey when only a legacy department key is known (no specialization override). */
const LEGACY_DEPARTMENT_SPECIALTY_KEYS: Record<string, SpecialtyKey> = {
  general_medical: 'GENERAL_MEDICINE',
  surgery: 'GENERAL_SURGERY',
  women_child: 'OBGYN',
  pediatrics: 'PEDIATRICS',
  eye_ent_dental: 'OPHTHALMOLOGY',
  physiotherapy: 'PHYSIOTHERAPY',
  diagnostics: 'RADIOLOGY',
  emergency_critical_care: 'EMERGENCY',
  anesthesia: 'ANESTHESIOLOGY',
  oncology: 'ONCOLOGY',
  other_common: 'OTHER',
};

const GENERAL_MEDICINE_DEPARTMENTS: DoctorDepartmentOption[] = [
  { key: 'general_medicine', label: 'General Medicine / Internal Medicine', specialtyKey: 'GENERAL_MEDICINE' },
  { key: 'family_medicine', label: 'Family Medicine', specialtyKey: 'GENERAL_MEDICINE' },
];

const MEDICAL_SPECIALTY_DEPARTMENTS: DoctorDepartmentOption[] = [
  { key: 'cardiology', label: 'Cardiology', specialtyKey: 'CARDIOLOGY' },
  { key: 'endocrinology', label: 'Endocrinology & Diabetes', specialtyKey: 'ENDOCRINOLOGY' },
  { key: 'pulmonology', label: 'Pulmonology / Chest Medicine', specialtyKey: 'PULMONOLOGY' },
  { key: 'gastroenterology', label: 'Gastroenterology', specialtyKey: 'GASTROENTEROLOGY' },
  { key: 'hepatology', label: 'Hepatology', specialtyKey: 'HEPATOLOGY' },
  { key: 'nephrology', label: 'Nephrology', specialtyKey: 'NEPHROLOGY' },
  { key: 'rheumatology', label: 'Rheumatology', specialtyKey: 'RHEUMATOLOGY' },
  { key: 'infectious_disease', label: 'Infectious Diseases', specialtyKey: 'INFECTIOUS_DISEASE' },
  { key: 'neurology', label: 'Neurology', specialtyKey: 'NEUROLOGY' },
  { key: 'psychiatry', label: 'Psychiatry / Mental Health', specialtyKey: 'PSYCHIATRY' },
  { key: 'oncology', label: 'Oncology', specialtyKey: 'ONCOLOGY' },
  { key: 'hematology', label: 'Hematology', specialtyKey: 'ONCOLOGY' },
];

const SURGICAL_DEPARTMENTS: DoctorDepartmentOption[] = [
  { key: 'general_surgery', label: 'General Surgery', specialtyKey: 'GENERAL_SURGERY' },
  { key: 'neurosurgery', label: 'Neurosurgery', specialtyKey: 'NEUROSURGERY' },
  { key: 'orthopedics', label: 'Orthopedics', specialtyKey: 'ORTHOPEDICS' },
  { key: 'cardiac_surgery', label: 'Cardiac Surgery', specialtyKey: 'OTHER' },
  { key: 'thoracic_surgery', label: 'Thoracic Surgery', specialtyKey: 'OTHER' },
  { key: 'vascular_surgery', label: 'Vascular Surgery', specialtyKey: 'OTHER' },
  { key: 'plastic_surgery', label: 'Plastic & Reconstructive Surgery', specialtyKey: 'OTHER' },
  { key: 'hpb_surgery', label: 'HPB Surgery', specialtyKey: 'OTHER' },
  { key: 'surgical_oncology', label: 'Surgical Oncology', specialtyKey: 'ONCOLOGY' },
  { key: 'pediatric_surgery', label: 'Pediatric Surgery', specialtyKey: 'GENERAL_SURGERY' },
  { key: 'urology', label: 'Urology', specialtyKey: 'UROLOGY' },
];

const WOMEN_CHILD_DEPARTMENTS: DoctorDepartmentOption[] = [
  { key: 'obgyn', label: 'Obstetrics & Gynecology', specialtyKey: 'OBGYN' },
  { key: 'pediatrics', label: 'Pediatrics', specialtyKey: 'PEDIATRICS' },
  { key: 'neonatology', label: 'Neonatology', specialtyKey: 'NEONATOLOGY' },
];

const HEAD_NECK_DEPARTMENTS: DoctorDepartmentOption[] = [
  { key: 'ent', label: 'ENT / Otolaryngology', specialtyKey: 'ENT' },
  { key: 'ophthalmology', label: 'Ophthalmology', specialtyKey: 'OPHTHALMOLOGY' },
  { key: 'dermatology', label: 'Dermatology', specialtyKey: 'DERMATOLOGY' },
  { key: 'dental', label: 'Dental / Dentistry', specialtyKey: 'DENTAL' },
  { key: 'omfs', label: 'Oral & Maxillofacial Surgery', specialtyKey: 'DENTAL' },
];

const CRITICAL_DIAGNOSTIC_DEPARTMENTS: DoctorDepartmentOption[] = [
  { key: 'anesthesiology', label: 'Anesthesiology', specialtyKey: 'ANESTHESIOLOGY' },
  { key: 'pain_medicine', label: 'Pain Medicine', specialtyKey: 'ANESTHESIOLOGY' },
  { key: 'emergency', label: 'Emergency Medicine', specialtyKey: 'EMERGENCY' },
  { key: 'critical_care', label: 'Critical Care / ICU', specialtyKey: 'EMERGENCY' },
  { key: 'radiology', label: 'Radiology', specialtyKey: 'RADIOLOGY' },
  { key: 'ultrasound', label: 'Ultrasound / Sonology', specialtyKey: 'ULTRASOUND' },
  { key: 'nuclear_medicine', label: 'Nuclear Medicine', specialtyKey: 'OTHER' },
  { key: 'pathology', label: 'Pathology', specialtyKey: 'LAB' },
  { key: 'laboratory', label: 'Laboratory Medicine', specialtyKey: 'LAB' },
  { key: 'transfusion', label: 'Transfusion Medicine / Blood Bank', specialtyKey: 'LAB' },
];

const ALLIED_OTHER_DEPARTMENTS: DoctorDepartmentOption[] = [
  { key: 'rehabilitation', label: 'Rehabilitation Medicine', specialtyKey: 'PHYSIOTHERAPY' },
  { key: 'physiotherapy', label: 'Physiotherapy', specialtyKey: 'PHYSIOTHERAPY' },
  { key: 'sports_medicine', label: 'Sports Medicine', specialtyKey: 'PHYSIOTHERAPY' },
  { key: 'palliative', label: 'Palliative Medicine', specialtyKey: 'OTHER' },
  { key: 'occupational', label: 'Occupational Medicine', specialtyKey: 'OTHER' },
  { key: 'public_health', label: 'Public Health / Preventive Medicine', specialtyKey: 'OTHER' },
  { key: 'clinical_nutrition', label: 'Clinical Nutrition', specialtyKey: 'OTHER' },
  { key: 'sleep_medicine', label: 'Sleep Medicine', specialtyKey: 'OTHER' },
  { key: 'other', label: 'Other / Allied Health', specialtyKey: 'OTHER' },
];

/** Canonical doctor form departments (searchable single-select). */
export const DOCTOR_DEPARTMENTS: DoctorDepartmentOption[] = [
  ...GENERAL_MEDICINE_DEPARTMENTS,
  ...MEDICAL_SPECIALTY_DEPARTMENTS,
  ...SURGICAL_DEPARTMENTS,
  ...WOMEN_CHILD_DEPARTMENTS,
  ...HEAD_NECK_DEPARTMENTS,
  ...CRITICAL_DIAGNOSTIC_DEPARTMENTS,
  ...ALLIED_OTHER_DEPARTMENTS,
];

const SPEC_GENERAL_MEDICINE = [
  'General Physician',
  'Internal Medicine Specialist',
  'Consultant Physician',
  'Hospital Medicine',
  'Geriatric Medicine',
] as const;

const SPEC_FAMILY_MEDICINE = ['Family Physician', 'Primary Care Physician'] as const;

const SPEC_CARDIOLOGY = [
  'General Cardiology',
  'Interventional Cardiology',
  'Electrophysiology',
  'Heart Failure',
  'Preventive Cardiology',
  'Pediatric Cardiology',
] as const;

const SPEC_ENDOCRINOLOGY = [
  'Endocrinologist',
  'Diabetologist',
  'Thyroid Specialist',
  'Metabolic Medicine',
  'Pituitary / Adrenal Disorders',
] as const;

const SPEC_PULMONOLOGY = [
  'Pulmonologist',
  'Respiratory Physician',
  'Chest Specialist',
  'Asthma Specialist',
  'COPD Specialist',
  'Sleep Respiratory Medicine',
  'Interventional Pulmonology',
] as const;

const SPEC_GASTROENTEROLOGY = [
  'Gastroenterologist',
  'GI Physician',
  'Endoscopist',
  'IBD Specialist',
  'Pancreatic / Biliary GI Specialist',
] as const;

const SPEC_HEPATOLOGY = [
  'Hepatologist',
  'Liver Specialist',
  'Viral Hepatitis Specialist',
  'Cirrhosis / Liver Disease Specialist',
  'Transplant Hepatology',
] as const;

const SPEC_NEPHROLOGY = [
  'Nephrologist',
  'Renal Physician',
  'Dialysis Specialist',
  'Renal Transplant Medicine',
] as const;

const SPEC_RHEUMATOLOGY = [
  'Rheumatologist',
  'Arthritis Specialist',
  'Autoimmune / Connective Tissue Disease Specialist',
] as const;

const SPEC_INFECTIOUS_DISEASE = [
  'Infectious Disease Specialist',
  'Tropical Medicine Specialist',
  'HIV Medicine',
  'Infection Control Specialist',
] as const;

const SPEC_NEUROLOGY = [
  'Neurologist',
  'Epilepsy Specialist',
  'Stroke Neurologist',
  'Movement Disorder Specialist',
  'Headache Specialist',
  'Neuromuscular Specialist',
  'Neuroimmunology / MS Specialist',
] as const;

const SPEC_PSYCHIATRY = [
  'General Psychiatrist',
  'Child & Adolescent Psychiatrist',
  'Addiction Psychiatrist',
  'Geriatric Psychiatrist',
  'Consultation-Liaison Psychiatrist',
] as const;

const SPEC_ONCOLOGY = [
  'Medical Oncologist',
  'Clinical Oncologist',
  'Hemato-Oncologist',
  'Pediatric Oncologist',
] as const;

const SPEC_HEMATOLOGY = [
  'Clinical Hematologist',
  'Hemato-Oncologist',
  'Coagulation Specialist',
  'Transfusion Medicine Specialist',
] as const;

const SPEC_GENERAL_SURGERY = [
  'General Surgeon',
  'Laparoscopic Surgeon',
  'Breast Surgeon',
  'Colorectal Surgeon',
  'Hernia Surgeon',
  'GI Surgeon',
] as const;

const SPEC_NEUROSURGERY = [
  'Neurosurgeon',
  'Brain Surgery',
  'Spine Neurosurgery',
  'Pediatric Neurosurgery',
  'Neurotrauma',
] as const;

const SPEC_ORTHOPEDICS = [
  'Orthopedic Surgeon',
  'Trauma Surgeon',
  'Joint Replacement Surgeon',
  'Spine Orthopedics',
  'Sports Orthopedics',
  'Hand Surgeon',
  'Pediatric Orthopedics',
  'Foot & Ankle Surgeon',
] as const;

const SPEC_CARDIAC_SURGERY = [
  'Cardiac Surgeon',
  'Cardiothoracic Surgeon',
  'Adult Cardiac Surgery',
  'Pediatric Cardiac Surgery',
] as const;

const SPEC_THORACIC_SURGERY = ['Thoracic Surgeon', 'Chest Surgery', 'Lung Surgery'] as const;

const SPEC_VASCULAR_SURGERY = [
  'Vascular Surgeon',
  'Peripheral Vascular Surgery',
  'Endovascular Surgery',
] as const;

const SPEC_PLASTIC_SURGERY = [
  'Plastic Surgeon',
  'Reconstructive Surgeon',
  'Cosmetic Surgeon',
  'Burn Surgeon',
  'Hand / Reconstructive Surgery',
] as const;

const SPEC_HPB_SURGERY = ['Hepatobiliary Surgeon', 'Pancreatic Surgeon', 'Liver Surgery'] as const;

const SPEC_SURGICAL_ONCOLOGY = ['Surgical Oncologist', 'Cancer Surgeon'] as const;

const SPEC_PEDIATRIC_SURGERY = ['Pediatric Surgeon', 'Neonatal Surgeon'] as const;

const SPEC_UROLOGY = [
  'Urologist',
  'Endourologist',
  'Uro-Oncologist',
  'Andrologist',
  'Pediatric Urologist',
  'Female Urology',
  'Stone Disease Specialist',
] as const;

const SPEC_OBGYN = [
  'Obstetrician',
  'Gynecologist',
  'OB-GYN',
  'Maternal-Fetal Medicine',
  'High-Risk Pregnancy',
  'Gynecologic Oncology',
  'Reproductive Medicine / Infertility',
  'Urogynecology',
] as const;

const SPEC_PEDIATRICS = [
  'Pediatrician',
  'General Pediatrics',
  'Pediatric Cardiology',
  'Pediatric Neurology',
  'Pediatric Gastroenterology',
  'Pediatric Nephrology',
  'Pediatric Endocrinology',
  'Pediatric Pulmonology',
  'Pediatric Hematology / Oncology',
] as const;

const SPEC_NEONATOLOGY = ['Neonatologist', 'Newborn Medicine', 'NICU Specialist'] as const;

const SPEC_ENT = [
  'ENT Specialist',
  'Otologist',
  'Rhinologist',
  'Laryngologist',
  'Head & Neck Surgeon',
  'Pediatric ENT',
  'Neurotologist',
] as const;

const SPEC_OPHTHALMOLOGY = [
  'Ophthalmologist',
  'Cataract Surgeon',
  'Retina Specialist',
  'Glaucoma Specialist',
  'Cornea Specialist',
  'Pediatric Ophthalmologist',
  'Oculoplastic Surgeon',
  'Neuro-Ophthalmologist',
] as const;

const SPEC_DERMATOLOGY = [
  'Dermatologist',
  'Clinical Dermatology',
  'Pediatric Dermatology',
  'Cosmetic Dermatology',
  'Dermatosurgery',
  'Hair / Trichology',
] as const;

const SPEC_DENTAL = [
  'General Dentist',
  'Operative Dentistry',
  'Prosthodontist',
  'Periodontist',
  'Endodontist',
  'Orthodontist',
  'Pediatric Dentist',
  'Oral Medicine',
] as const;

const SPEC_OMFS = ['Oral Surgeon', 'Maxillofacial Surgeon', 'Facial Trauma Surgeon'] as const;

const SPEC_ANESTHESIOLOGY = [
  'Anesthesiologist',
  'General Anesthesia',
  'Regional Anesthesia',
  'Cardiac Anesthesia',
  'Pediatric Anesthesia',
  'Neuroanesthesia',
  'Obstetric Anesthesia',
] as const;

const SPEC_PAIN_MEDICINE = [
  'Pain Specialist',
  'Interventional Pain Medicine',
  'Chronic Pain Specialist',
] as const;

const SPEC_EMERGENCY = [
  'Emergency Physician',
  'Accident & Emergency Specialist',
  'Trauma / Emergency Specialist',
] as const;

const SPEC_CRITICAL_CARE = [
  'Critical Care Specialist',
  'Intensivist',
  'Medical ICU',
  'Surgical ICU',
  'Pediatric ICU',
] as const;

const SPEC_RADIOLOGY = [
  'Diagnostic Radiologist',
  'Interventional Radiologist',
  'Neuroradiologist',
  'Musculoskeletal Radiologist',
  'Pediatric Radiologist',
  'Breast Imaging Specialist',
] as const;

const SPEC_ULTRASOUND = [
  'Sonologist',
  'General Ultrasound',
  'Obstetric Ultrasound',
  'Doppler Ultrasound',
] as const;

const SPEC_NUCLEAR_MEDICINE = ['Nuclear Medicine Physician', 'PET/CT Specialist'] as const;

const SPEC_PATHOLOGY = [
  'Histopathologist',
  'Chemical Pathologist',
  'Hematopathologist',
  'Microbiologist',
  'Immunopathologist',
  'Molecular Pathologist',
] as const;

const SPEC_LABORATORY = [
  'Clinical Pathologist',
  'Microbiology',
  'Hematology',
  'Biochemistry',
  'Molecular Diagnostics',
] as const;

const SPEC_REHABILITATION = [
  'Physical Medicine & Rehabilitation Physician',
  'Rehabilitation Specialist',
] as const;

const SPEC_PHYSIOTHERAPY = [
  'General Physiotherapist',
  'Musculoskeletal Physiotherapy',
  'Neuro Physiotherapy',
  'Sports Physiotherapy',
  'Pediatric Physiotherapy',
  'Cardiorespiratory Physiotherapy',
  "Women's Health Physiotherapy",
] as const;

const SPEC_SPORTS_MEDICINE = ['Sports Medicine Physician', 'Sports Injury Specialist'] as const;

const SPEC_PALLIATIVE = ['Palliative Care Physician', 'Pain & Symptom Management'] as const;

const SPEC_OCCUPATIONAL = ['Occupational Health Physician'] as const;

const SPEC_PUBLIC_HEALTH = [
  'Public Health Physician',
  'Preventive Medicine',
  'Epidemiology',
] as const;

const SPEC_CLINICAL_NUTRITION = ['Clinical Nutrition', 'Clinical Dietetics'] as const;

const SPEC_SLEEP_MEDICINE = ['Sleep Physician', 'Sleep Disorders Specialist'] as const;

const SPEC_TRANSFUSION = ['Transfusion Medicine Specialist', 'Blood Bank Physician'] as const;

/** Legacy specialization lists (preserved for inferring department on old records). */
const SPEC_LEGACY_GENERAL_MEDICAL = [
  'General Physician',
  'Family Physician',
  'Internal Medicine',
  'Consultant Physician',
  'Diabetologist',
  'Endocrinologist',
  'Cardiologist',
  'Pulmonologist / Chest Specialist',
  'Gastroenterologist',
  'Nephrologist',
  'Neurologist',
  'Dermatologist',
  'Psychiatrist',
  'Rheumatologist',
  'Infectious Disease Specialist',
] as const;

const SPEC_LEGACY_SURGERY = [
  'General Surgeon',
  'Orthopedic Surgeon',
  'Neurosurgeon',
  'Urologist',
  'ENT Surgeon',
  'Plastic Surgeon',
  'Vascular Surgeon',
  'Pediatric Surgeon',
  'Cardiac Surgeon',
] as const;

const SPEC_LEGACY_WOMEN_CHILD = [
  'Gynecologist',
  'Obstetrician',
  'Consultant Gynecologist / Obstetrician',
  'Fertility Specialist',
  'Maternal-Fetal Medicine Specialist',
] as const;

const SPEC_LEGACY_EYE_ENT_DENTAL = [
  'Eye Specialist / Ophthalmologist',
  'Optometrist',
  'ENT Specialist',
  'Audiologist',
  'Dentist',
  'Orthodontist',
  'Oral & Maxillofacial Surgeon',
  'Periodontist',
  'Endodontist',
] as const;

const SPEC_LEGACY_PHYSIOTHERAPY = [
  'Physiotherapist',
  'Orthopedic Physiotherapist',
  'Sports Physiotherapist',
  'Neuro Physiotherapist',
  'Pediatric Physiotherapist',
  'Geriatric Physiotherapist',
  'Cardio-Pulmonary Physiotherapist',
  'Manual Therapist',
  'Chiropractor',
  'Rehabilitation Specialist',
] as const;

const SPEC_LEGACY_DIAGNOSTICS = [
  'Radiologist',
  'Sonologist / Ultrasound Specialist',
  'Interventional Radiologist',
  'Pathologist',
  'Microbiologist',
  'Hematologist',
  'Biochemist',
  'Lab Consultant',
  'Histopathologist',
] as const;

const SPEC_LEGACY_EMERGENCY = [
  'Emergency Physician',
  'Consultant Emergency Medicine',
  'Intensivist / Critical Care Specialist',
  'Trauma Surgeon',
  'Accident & Emergency Specialist',
] as const;

const SPEC_LEGACY_ANESTHESIA = [
  'Anesthesiologist',
  'Consultant Anesthesia',
  'Pain Management Specialist',
  'Cardiac Anesthesiologist',
] as const;

const SPEC_LEGACY_ONCOLOGY = [
  'Medical Oncologist',
  'Radiation Oncologist',
  'Clinical Oncologist',
  'Surgical Oncologist',
  'Hematologist-Oncologist',
] as const;

const SPEC_LEGACY_OTHER = [
  'Nutritionist / Dietitian',
  'Speech Therapist',
  'Occupational Therapist',
  'Psychologist',
  'Homeopathic Doctor',
  'Hakim / Tibb Specialist',
] as const;

/** Department key → specialization options (filtered dropdown). */
export const DOCTOR_SPECIALIZATIONS: Record<string, readonly string[]> = {
  general_medicine: SPEC_GENERAL_MEDICINE,
  family_medicine: SPEC_FAMILY_MEDICINE,
  cardiology: SPEC_CARDIOLOGY,
  endocrinology: SPEC_ENDOCRINOLOGY,
  pulmonology: SPEC_PULMONOLOGY,
  gastroenterology: SPEC_GASTROENTEROLOGY,
  hepatology: SPEC_HEPATOLOGY,
  nephrology: SPEC_NEPHROLOGY,
  rheumatology: SPEC_RHEUMATOLOGY,
  infectious_disease: SPEC_INFECTIOUS_DISEASE,
  neurology: SPEC_NEUROLOGY,
  psychiatry: SPEC_PSYCHIATRY,
  oncology: [...SPEC_ONCOLOGY, 'Radiation Oncologist', 'Surgical Oncologist', 'Hematologist-Oncologist'],
  hematology: SPEC_HEMATOLOGY,
  general_surgery: SPEC_GENERAL_SURGERY,
  neurosurgery: SPEC_NEUROSURGERY,
  orthopedics: SPEC_ORTHOPEDICS,
  cardiac_surgery: SPEC_CARDIAC_SURGERY,
  thoracic_surgery: SPEC_THORACIC_SURGERY,
  vascular_surgery: SPEC_VASCULAR_SURGERY,
  plastic_surgery: SPEC_PLASTIC_SURGERY,
  hpb_surgery: SPEC_HPB_SURGERY,
  surgical_oncology: SPEC_SURGICAL_ONCOLOGY,
  pediatric_surgery: SPEC_PEDIATRIC_SURGERY,
  urology: SPEC_UROLOGY,
  obgyn: SPEC_OBGYN,
  pediatrics: [...SPEC_PEDIATRICS, 'Neonatologist', 'Pediatric Surgeon'],
  neonatology: SPEC_NEONATOLOGY,
  ent: SPEC_ENT,
  ophthalmology: SPEC_OPHTHALMOLOGY,
  dermatology: SPEC_DERMATOLOGY,
  dental: SPEC_DENTAL,
  omfs: SPEC_OMFS,
  anesthesiology: SPEC_ANESTHESIOLOGY,
  pain_medicine: SPEC_PAIN_MEDICINE,
  emergency: SPEC_EMERGENCY,
  critical_care: SPEC_CRITICAL_CARE,
  radiology: SPEC_RADIOLOGY,
  ultrasound: SPEC_ULTRASOUND,
  nuclear_medicine: SPEC_NUCLEAR_MEDICINE,
  pathology: SPEC_PATHOLOGY,
  laboratory: SPEC_LABORATORY,
  rehabilitation: SPEC_REHABILITATION,
  physiotherapy: [
    ...SPEC_PHYSIOTHERAPY,
    'Physiotherapist',
    'Orthopedic Physiotherapist',
    'Manual Therapist',
    'Chiropractor',
  ],
  sports_medicine: SPEC_SPORTS_MEDICINE,
  palliative: SPEC_PALLIATIVE,
  occupational: SPEC_OCCUPATIONAL,
  public_health: SPEC_PUBLIC_HEALTH,
  clinical_nutrition: SPEC_CLINICAL_NUTRITION,
  sleep_medicine: SPEC_SLEEP_MEDICINE,
  transfusion: SPEC_TRANSFUSION,
  other: [],

  // Legacy keys (same pediatrics / physiotherapy / oncology lists as canonical where applicable)
  general_medical: SPEC_LEGACY_GENERAL_MEDICAL,
  surgery: SPEC_LEGACY_SURGERY,
  women_child: SPEC_LEGACY_WOMEN_CHILD,
  eye_ent_dental: SPEC_LEGACY_EYE_ENT_DENTAL,
  diagnostics: SPEC_LEGACY_DIAGNOSTICS,
  emergency_critical_care: SPEC_LEGACY_EMERGENCY,
  anesthesia: SPEC_LEGACY_ANESTHESIA,
  other_common: SPEC_LEGACY_OTHER,
};

export const DOCTOR_QUALIFICATIONS: readonly string[] = [
  'MBBS',
  'BDS',
  'DPT',
  'Pharm-D',
  'DVM',
  'BSN',
  'Post-RN BSN',
  'BSc Physiotherapy',
  'BS Medical Laboratory Technology',
  'BS Radiology / Imaging Technology',
  'BS Nutrition / Dietetics',
  'BS Psychology',
  'BS Speech & Language Pathology',
  'BS Occupational Therapy',
  'FCPS',
  'MCPS',
  'MD',
  'MS',
  'MDS',
  'MPhil',
  'PhD',
  'MPH',
  'MSPH',
  'MSc',
  'MRCP (UK)',
  'MRCPCH',
  'MRCOG',
  'MRCS',
  'FRCS',
  'FRCP',
  'FRCOG',
  'FRCPCH',
  'MRCGP',
  'MRCPsych',
  'FRCR',
  'FRCPath',
  'American Board Certification',
  'European Board / Fellowship',
  'Arab Board',
  'Subspecialty Fellowship',
  'DCH',
  'DGO',
  'DLO',
  'DOMS',
  'DA',
  'DMRD',
  'DPM',
  'DTCD',
  'Diploma in Cardiology',
  'Diploma in Dermatology',
  'Diploma in Anesthesia',
  'Diploma in Radiology',
  'Diploma in Child Health',
  'Diploma in Gynecology & Obstetrics',
  'Diploma in ENT',
  'Diploma in Ophthalmology',
  'Diploma in Psychiatry',
  'Diploma in Public Health',
  'Other / Custom',
];

export const DOCTOR_DESIGNATIONS: readonly string[] = [
  'Medical Officer',
  'Woman Medical Officer',
  'Resident Medical Officer',
  'Postgraduate Trainee',
  'Registrar',
  'Senior Registrar',
  'Specialist',
  'Associate Consultant',
  'Consultant',
  'Senior Consultant',
  'Assistant Professor',
  'Associate Professor',
  'Professor',
  'Head of Department',
  'Medical Director',
  'Other',
];

/**
 * Exact specialization label → SpecialtyKey overrides.
 * Used only when the result differs from the department default or for legacy mixed departments.
 * Keys are lowercased trimmed labels.
 */
const SPECIALIZATION_SPECIALTY_ALIASES: Record<string, SpecialtyKey> = {
  // Pediatric subspecialties (department pediatrics → clinical subspecialty keys)
  'pediatric cardiology': 'CARDIOLOGY',
  'pediatric neurology': 'NEUROLOGY',
  'pediatric gastroenterology': 'GASTROENTEROLOGY',
  'pediatric nephrology': 'NEPHROLOGY',
  'pediatric endocrinology': 'ENDOCRINOLOGY',
  'pediatric pulmonology': 'PULMONOLOGY',
  'pediatric hematology / oncology': 'ONCOLOGY',
  'pediatric oncologist': 'ONCOLOGY',

  // Legacy general_medical mixed internal specialties
  diabetologist: 'ENDOCRINOLOGY',
  endocrinologist: 'ENDOCRINOLOGY',
  cardiologist: 'CARDIOLOGY',
  'pulmonologist / chest specialist': 'PULMONOLOGY',
  gastroenterologist: 'GASTROENTEROLOGY',
  nephrologist: 'NEPHROLOGY',
  neurologist: 'NEUROLOGY',
  dermatologist: 'DERMATOLOGY',
  psychiatrist: 'PSYCHIATRY',
  rheumatologist: 'RHEUMATOLOGY',
  'infectious disease specialist': 'INFECTIOUS_DISEASE',

  // Legacy surgery
  'orthopedic surgeon': 'ORTHOPEDICS',
  neurosurgeon: 'NEUROSURGERY',
  urologist: 'UROLOGY',
  'ent surgeon': 'ENT',
  'plastic surgeon': 'OTHER',
  'vascular surgeon': 'OTHER',
  'pediatric surgeon': 'GENERAL_SURGERY',
  'cardiac surgeon': 'OTHER',

  // Legacy women_child
  gynecologist: 'OBGYN',
  obstetrician: 'OBGYN',
  'consultant gynecologist / obstetrician': 'OBGYN',
  'fertility specialist': 'OBGYN',
  'maternal-fetal medicine specialist': 'OBGYN',
  'gynecologic oncology': 'OBGYN',
  'gynaecologic oncology': 'OBGYN',
  'ob-gyn': 'OBGYN',
  'maternal-fetal medicine': 'OBGYN',
  'high-risk pregnancy': 'OBGYN',
  'reproductive medicine / infertility': 'OBGYN',
  urogynecology: 'OBGYN',
  urogynecologist: 'OBGYN',

  // Legacy eye_ent_dental
  'eye specialist / ophthalmologist': 'OPHTHALMOLOGY',
  optometrist: 'OTHER',
  'ent specialist': 'ENT',
  audiologist: 'OTHER',
  dentist: 'DENTAL',
  orthodontist: 'DENTAL',
  'oral & maxillofacial surgeon': 'DENTAL',
  periodontist: 'DENTAL',
  endodontist: 'DENTAL',

  // Legacy diagnostics
  radiologist: 'RADIOLOGY',
  'sonologist / ultrasound specialist': 'ULTRASOUND',
  'interventional radiologist': 'RADIOLOGY',
  pathologist: 'LAB',
  microbiologist: 'LAB',
  hematologist: 'LAB',
  biochemist: 'LAB',
  'lab consultant': 'LAB',
  histopathologist: 'LAB',

  // Legacy emergency / anesthesia / oncology
  'intensivist / critical care specialist': 'EMERGENCY',
  'trauma surgeon': 'OTHER',
  anesthesiologist: 'ANESTHESIOLOGY',
  'pain management specialist': 'ANESTHESIOLOGY',
  'cardiac anesthesiologist': 'ANESTHESIOLOGY',
  'medical oncologist': 'ONCOLOGY',
  'radiation oncologist': 'OTHER',
  'clinical oncologist': 'ONCOLOGY',
  'surgical oncologist': 'ONCOLOGY',
  'hematologist-oncologist': 'ONCOLOGY',

  // Legacy allied
  'occupational therapist': 'PHYSIOTHERAPY',
  physiotherapist: 'PHYSIOTHERAPY',
  'nutritionist / dietitian': 'OTHER',
  'speech therapist': 'OTHER',
  psychologist: 'OTHER',

  // Pulmonology cross-links
  'sleep respiratory medicine': 'PULMONOLOGY',

  // Transfusion / lab cross-links
  'transfusion medicine specialist': 'LAB',
  'blood bank physician': 'LAB',
};

function normalizeOptionText(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function canonicalDepartmentKey(departmentKey: string): string {
  const key = String(departmentKey || '').trim();
  if (!key) {
    return '';
  }
  return LEGACY_DEPARTMENT_ALIASES[key] || key;
}

export function specializationsForDepartment(departmentKey: string): string[] {
  const key = String(departmentKey || '').trim();
  if (!key) {
    return [];
  }
  const list = DOCTOR_SPECIALIZATIONS[key];
  return list ? [...list] : [];
}

export function filterOptions(options: string[], search: string): string[] {
  const query = normalizeOptionText(search);
  if (!query) {
    return [...options];
  }
  return options.filter((option) => normalizeOptionText(option).includes(query));
}

export function findDepartmentByKey(key: string): DoctorDepartmentOption | null {
  const normalized = String(key || '').trim();
  if (!normalized) {
    return null;
  }
  return DOCTOR_DEPARTMENTS.find((item) => item.key === normalized) || null;
}

export function findDepartmentByLabel(label: string): DoctorDepartmentOption | null {
  const normalized = normalizeOptionText(label);
  if (!normalized) {
    return null;
  }
  return (
    DOCTOR_DEPARTMENTS.find((item) => normalizeOptionText(item.label) === normalized) ||
    DOCTOR_DEPARTMENTS.find((item) => normalizeOptionText(item.label).includes(normalized)) ||
    null
  );
}

export function inferDepartmentFromSpecialization(spec: string): string {
  const normalized = normalizeOptionText(spec);
  if (!normalized) {
    return '';
  }

  for (const [departmentKey, specs] of Object.entries(DOCTOR_SPECIALIZATIONS)) {
    const match = specs.some((item) => normalizeOptionText(item) === normalized);
    if (match) {
      return departmentKey;
    }
  }

  return '';
}

export function resolveDoctorSpecialtyKey(
  departmentKey: string,
  specializations: string[] = []
): SpecialtyKey {
  const specs = (specializations || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  for (const spec of specs) {
    const alias = SPECIALIZATION_SPECIALTY_ALIASES[normalizeOptionText(spec)];
    if (alias) {
      return alias;
    }
  }

  const canonical = canonicalDepartmentKey(departmentKey);
  const department = findDepartmentByKey(canonical) || findDepartmentByKey(departmentKey);
  if (department) {
    return department.specialtyKey;
  }

  const legacySpecialty = LEGACY_DEPARTMENT_SPECIALTY_KEYS[String(departmentKey || '').trim()];
  if (legacySpecialty) {
    return legacySpecialty;
  }

  return 'OTHER';
}

export function joinMulti(values: string[]): string {
  return (values || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(' | ');
}

export function splitMulti(value: string): string[] {
  return String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function clinicalDepartmentLabel(key: string | null | undefined): string {
  const normalized = String(key || '').trim();
  if (!normalized) {
    return '-';
  }

  const legacy = CLINICAL_DEPARTMENTS.find((item) => item.key === normalized);
  if (legacy) {
    return legacy.label;
  }

  const department = findDepartmentByKey(normalized);
  if (department) {
    return department.label;
  }

  return normalized;
}

/** Map clinical SpecialtyKey to legacy prescription print template key. */
export function mapSpecialtyKeyToPrescriptionTemplate(key: SpecialtyKey): SpecialtyTemplateKey {
  switch (key) {
    case 'OBGYN':
      return 'gynae';
    case 'OPHTHALMOLOGY':
      return 'eye';
    case 'ULTRASOUND':
      return 'ultrasound';
    case 'RADIOLOGY':
      return 'radiology';
    case 'DENTAL':
      return 'dental';
    case 'PHYSIOTHERAPY':
      return 'physiotherapy';
    case 'LAB':
      return 'lab';
    case 'GENERAL_MEDICINE':
      return 'general';
    default:
      return 'general';
  }
}

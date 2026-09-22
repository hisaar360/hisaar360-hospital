import { GynaeConsultMode } from './gynae-prescription-data';
import { ClinicalRxPrintPage } from './clinical-rx-print-pages';

export type GynaePrintPreview = {
  doctorName: string;
  doctorNamePlain: string;
  doctorNameUrdu?: string;
  doctorQualification: string;
  doctorQualificationUrdu?: string;
  doctorTitleEnglish?: string;
  doctorTitleUrdu?: string;
  doctorSpecialty?: string;
  hospitalName: string;
  hospitalNameUrdu: string;
  hospitalAddress: string;
  hospitalAddressUrdu?: string;
  hospitalLogoUrl: string;
  showHospitalLogo: boolean;
  hospitalLogoScale: number;
  clinicTagline?: string;
  visitType?: string;
  prescriptionNo: string;
  patientNo: string;
  date: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientPhone: string;
  patientAddress: string;
  patientBloodGroup: string;
  disease: string;
  vitals: Record<string, string>;
  labTests: Array<{ name: string; category: string }>;
  ivFluids: Array<{ name: string; rate: string; quantity: string; route: string }>;
  medicines: Array<Record<string, unknown>>;
  specialtyTitle: string;
  specialtyRows: Array<{ label: string; value: string; wide?: boolean }>;
  gynaeConsultationRows: Array<{ label: string; value: string }>;
  consultationRows?: Array<{ label: string; value: string; wide?: boolean }>;
  gynaeSidebarRows: Array<{ label: string; value: string; wide?: boolean }>;
  gynaeExtendedRows: Array<{ label: string; value: string; wide?: boolean }>;
  patientNote: string;
  prescriptionRevisionNote: string;
  prescriptionFollowUpLine: string;
  prescriptionFooterLines: string[];
  followUpDate: string;
  gynaeMode: GynaeConsultMode;
};

export type GynaeWhMetric = { label: string; labelUr: string; value: string; unit?: string };

export type GynaeWhNoteCard = {
  key: string;
  titleEn: string;
  titleUr: string;
  icon: string;
  value: string;
};

export type GynaeWhMedicineRow = {
  name: string;
  dosage: string;
  frequency: string;
  frequencyUrdu: string;
  duration: string;
  instructionEnglish: string;
  instructionUrdu: string;
};

export type GynaeWhBilingualLine = { en: string; ur: string };

const METRIC_LABEL_URDU: Record<string, string> = {
  LMP: 'آخری حیض',
  EDD: 'متوقع تاریخ ولادت',
  'Gestational Age': 'حمل کی عمر',
  'Gravida / Para': 'گراویڈا / پیرا',
  'Blood Group': 'بلڈ گروپ',
  Weight: 'وزن',
  BP: 'بلڈ پریشر',
  Pulse: 'نبض',
  Temp: 'درجہ حرارت',
  SpO2: 'آکسیجن',
};

const FIELD_LABEL_URDU: Record<string, string> = {
  'Abortion (A)': 'اسقاط',
  Abortion: 'اسقاط',
  'Living Children': 'زندہ بچے',
  Living: 'زندہ',
  'Previous C-Section': 'پچھلا سیزین',
  'Previous C-section': 'پچھلا سیزین',
  'Fetal Movement': 'جنین کی حرکت',
  'Fundal Height (cm)': 'فنڈل اونچائی',
  'Fundal Height': 'فنڈل اونچائی',
  'Fetal Heart Rate': 'جنین کی دھڑکن',
  Presentation: 'پریزنٹیشن',
  'Fetal Presentation': 'جنین کی پوزیشن',
  'Urine Albumin': 'پیشاب البیومن',
  'Urine Sugar': 'پیشاب شوگر',
  Edema: 'ورم',
  'Pelvic findings': 'پیلوک معائنہ',
  'Examination Consent': 'معائنہ کی رضامندی',
};

const ADVICE_URDU: Record<string, string> = {
  'take adequate rest': 'مناسب آرام کریں',
  'drink plenty of water': 'زیادہ پانی پییں',
  'avoid heavy lifting': 'بھاری وزن نہ اٹھائیں',
  'take medicines as advised': 'ادویات ہدایت کے مطابق لیں',
  'follow up as scheduled': 'مقررہ تاریخ پر دوبارہ آئیں',
  'maintain hygiene': 'صفائی کا خیال رکھیں',
  fever: 'بخار',
  'severe abdominal pain': 'شدید پیٹ درد',
  'vaginal bleeding': 'اندام نہانی سے خون',
  'reduced fetal movement': 'جنین کی حرکت کم ہونا',
  'headache with vision changes': 'سر درد کے ساتھ نظر کی خرابی',
};

export function urduForLabel(label: string): string {
  const direct = METRIC_LABEL_URDU[label] || FIELD_LABEL_URDU[label];
  if (direct) {
    return direct;
  }

  const key = Object.keys(FIELD_LABEL_URDU).find((item) =>
    label.toLowerCase().includes(item.toLowerCase())
  );
  return key ? FIELD_LABEL_URDU[key] : '';
}

export function bilingualAdviceLine(line: string): GynaeWhBilingualLine {
  const en = String(line || '').trim();
  if (!en) {
    return { en: '', ur: '' };
  }

  if (/[\u0600-\u06FF]/.test(en)) {
    return { en: '', ur: en };
  }

  const lower = en.toLowerCase();
  for (const [matcher, ur] of Object.entries(ADVICE_URDU)) {
    if (lower.includes(matcher)) {
      return { en, ur };
    }
  }

  return { en, ur: '' };
}

const FREQUENCY_URDU: Record<string, string> = {
  od: 'روزانہ ایک بار',
  qd: 'روزانہ ایک بار',
  'once daily': 'روزانہ ایک بار',
  bd: 'روزانہ دو بار',
  bid: 'روزانہ دو بار',
  'twice daily': 'روزانہ دو بار',
  tds: 'روزانہ تین بار',
  tid: 'روزانہ تین بار',
  'three times daily': 'روزانہ تین بار',
  qid: 'روزانہ چار بار',
  'four times daily': 'روزانہ چار بار',
  hs: 'رات کو',
  sos: 'ضرورت پڑنے پر',
  prn: 'ضرورت پڑنے پر',
};

export function resolveGynaePrintContactPhone(footerLines: string[]): string {
  const combined = footerLines.join(' | ');
  const phoneMatch = combined.match(/Phone:\s*([^|]+)/i);
  if (phoneMatch?.[1]?.trim()) {
    return phoneMatch[1].trim();
  }

  const line = footerLines.find(
    (item) => !/@/.test(item) && /phone|tel|cell|mobile|call/i.test(item)
  );
  return line?.replace(/^[^:]+:\s*/, '').trim() || '';
}

export function resolveGynaePrintContactEmail(footerLines: string[]): string {
  const combined = footerLines.join(' | ');
  const emailMatch = combined.match(/Email:\s*([^|]+)/i);
  if (emailMatch?.[1]?.trim()) {
    return emailMatch[1].trim();
  }

  const line = footerLines.find((item) => /@/.test(item));
  return line?.replace(/^[^:]+:\s*/, '').trim() || '';
}

export function findGynaePrintRowValue(
  preview: Pick<GynaePrintPreview, 'gynaeSidebarRows' | 'gynaeExtendedRows' | 'specialtyRows'>,
  matchers: string[]
): string {
  const rows = [...preview.gynaeSidebarRows, ...preview.gynaeExtendedRows, ...preview.specialtyRows];
  for (const matcher of matchers) {
    const row = rows.find((item) => item.label.toLowerCase().includes(matcher.toLowerCase()));
    if (row?.value?.trim()) {
      return row.value.trim();
    }
  }

  return '';
}

export function hasPrintDisplayValue(value: unknown): boolean {
  const text = String(value || '').trim();
  return Boolean(text) && text !== '-' && text !== '—' && text.toLowerCase() !== 'n/a';
}

export function displayPrintValue(value: unknown, fallback = '—'): string {
  return hasPrintDisplayValue(value) ? String(value).trim() : fallback;
}

export function resolveMedicineFrequencyUrdu(frequency: string): string {
  const raw = String(frequency || '').trim();
  if (!raw) {
    return '';
  }

  const key = raw.toLowerCase();
  for (const [matcher, urdu] of Object.entries(FREQUENCY_URDU)) {
    if (key === matcher || key.includes(matcher)) {
      return urdu;
    }
  }

  return containsUrduScript(raw) ? raw : '';
}

export function resolveMedicineInstructionPair(medicine: Record<string, unknown>): {
  english: string;
  urdu: string;
} {
  const english = String(
    medicine['instructionEnglish'] || medicine['instructions'] || medicine['instruction'] || ''
  ).trim();
  const explicitUrdu = String(
    medicine['instructionUrdu'] || medicine['instructionsUrdu'] || medicine['urduInstructions'] || ''
  ).trim();

  if (explicitUrdu) {
    return { english: english || explicitUrdu, urdu: explicitUrdu };
  }

  if (!english) {
    return { english: '', urdu: '' };
  }

  if (containsUrduScript(english)) {
    return { english: '', urdu: english };
  }

  const lower = english.toLowerCase();
  if (/after breakfast/.test(lower)) {
    return { english, urdu: 'ناشتہ کے بعد لیں' };
  }
  if (/after meals?/.test(lower)) {
    return { english, urdu: 'کھانے کے بعد لیں' };
  }
  if (/before meals?/.test(lower)) {
    return { english, urdu: 'کھانے سے پہلے لیں' };
  }
  if (/at night|bedtime|\bhs\b/.test(lower)) {
    return { english, urdu: 'رات کو سوتے وقت لیں' };
  }
  if (/once daily|\bod\b/.test(lower)) {
    return { english, urdu: 'روزانہ ایک بار لیں' };
  }
  if (/twice daily|\bbd\b/.test(lower)) {
    return { english, urdu: 'روزانہ دو بار لیں' };
  }
  if (/three times|\btds\b/.test(lower)) {
    return { english, urdu: 'روزانہ تین بار لیں' };
  }

  return { english, urdu: '' };
}

export function buildGynaeWhMedicineRow(medicine: Record<string, unknown>): GynaeWhMedicineRow {
  const frequency = String(medicine['frequency'] || '').trim();
  const instructions = resolveMedicineInstructionPair(medicine);

  return {
    name: String(medicine['name'] || 'Medicine').trim() || 'Medicine',
    dosage: String(medicine['dosage'] || medicine['dose'] || '').trim(),
    frequency,
    frequencyUrdu: resolveMedicineFrequencyUrdu(frequency),
    duration: String(medicine['duration'] || '').trim(),
    instructionEnglish: instructions.english,
    instructionUrdu: instructions.urdu,
  };
}

function containsUrduScript(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

export type { ClinicalRxPrintPage };

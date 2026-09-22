import {
  ALL_SPECIALTY_KEYS,
  SpecialtyKey,
  SPECIALTY_DISPLAY_NAMES,
} from './specialty-keys';
import { getSpecialtyTemplate } from './specialty-template.registry';

export type SpecialtyLibraryCategory = 'medical' | 'women_child' | 'surgical' | 'other';

export type SpecialtyLibraryFilter = 'all' | SpecialtyLibraryCategory;

export interface SpecialtyLibraryItem {
  key: SpecialtyKey;
  name: string;
  description: string;
  category: SpecialtyLibraryCategory;
  /** Font Awesome icon class suffix, e.g. `fa-stethoscope` */
  icon: string;
  /** Accent color for icon chip */
  accent: string;
}

const CATEGORY_BY_KEY: Record<SpecialtyKey, SpecialtyLibraryCategory> = {
  GENERAL_MEDICINE: 'medical',
  CARDIOLOGY: 'medical',
  PULMONOLOGY: 'medical',
  GASTROENTEROLOGY: 'medical',
  HEPATOLOGY: 'medical',
  NEPHROLOGY: 'medical',
  ENDOCRINOLOGY: 'medical',
  INFECTIOUS_DISEASE: 'medical',
  RHEUMATOLOGY: 'medical',
  OBGYN: 'women_child',
  PEDIATRICS: 'women_child',
  NEONATOLOGY: 'women_child',
  GENERAL_SURGERY: 'surgical',
  ORTHOPEDICS: 'surgical',
  NEUROSURGERY: 'surgical',
  ENT: 'surgical',
  OPHTHALMOLOGY: 'surgical',
  DENTAL: 'surgical',
  UROLOGY: 'surgical',
  NEUROLOGY: 'other',
  DERMATOLOGY: 'other',
  PSYCHIATRY: 'other',
  ONCOLOGY: 'other',
  ANESTHESIOLOGY: 'other',
  PHYSIOTHERAPY: 'other',
  EMERGENCY: 'other',
  RADIOLOGY: 'other',
  ULTRASOUND: 'other',
  LAB: 'other',
  OTHER: 'other',
};

const ICON_BY_KEY: Partial<Record<SpecialtyKey, string>> = {
  GENERAL_MEDICINE: 'fa-stethoscope',
  CARDIOLOGY: 'fa-heartbeat',
  PULMONOLOGY: 'fa-cloud',
  GASTROENTEROLOGY: 'fa-tint',
  HEPATOLOGY: 'fa-leaf',
  NEPHROLOGY: 'fa-flask',
  ENDOCRINOLOGY: 'fa-balance-scale',
  INFECTIOUS_DISEASE: 'fa-bug',
  RHEUMATOLOGY: 'fa-hand-paper-o',
  OBGYN: 'fa-female',
  PEDIATRICS: 'fa-child',
  NEONATOLOGY: 'fa-heart',
  GENERAL_SURGERY: 'fa-medkit',
  ORTHOPEDICS: 'fa-wheelchair',
  NEUROSURGERY: 'fa-user-md',
  ENT: 'fa-headphones',
  OPHTHALMOLOGY: 'fa-eye',
  DENTAL: 'fa-smile-o',
  UROLOGY: 'fa-tint',
  NEUROLOGY: 'fa-bolt',
  DERMATOLOGY: 'fa-hand-o-up',
  PSYCHIATRY: 'fa-comments',
  ONCOLOGY: 'fa-plus-square',
  ANESTHESIOLOGY: 'fa-bed',
  PHYSIOTHERAPY: 'fa-male',
  EMERGENCY: 'fa-ambulance',
  RADIOLOGY: 'fa-file-image-o',
  ULTRASOUND: 'fa-volume-up',
  LAB: 'fa-flask',
  OTHER: 'fa-th-large',
};

const ACCENT_BY_CATEGORY: Record<SpecialtyLibraryCategory, string> = {
  medical: '#2563eb',
  women_child: '#db2777',
  surgical: '#0d9488',
  other: '#7c3aed',
};

const SHORT_BLURB: Partial<Record<SpecialtyKey, string>> = {
  GENERAL_MEDICINE: 'Chronic care, systemic review',
  CARDIOLOGY: 'Heart & circulation',
  PULMONOLOGY: 'Lungs & airways',
  GASTROENTEROLOGY: 'GI tract & digestion',
  HEPATOLOGY: 'Liver & biliary',
  NEPHROLOGY: 'Kidney & dialysis',
  ENDOCRINOLOGY: 'Hormones & diabetes',
  INFECTIOUS_DISEASE: 'Infections & fever',
  RHEUMATOLOGY: 'Joints & autoimmune',
  OBGYN: "Women's health & pregnancy",
  PEDIATRICS: 'Growth, immunization',
  NEONATOLOGY: 'Newborn care',
  GENERAL_SURGERY: 'General operative care',
  ORTHOPEDICS: 'Bones & joints',
  NEUROSURGERY: 'Brain & spine surgery',
  ENT: 'Ear, nose & throat',
  OPHTHALMOLOGY: 'Eye examination',
  DENTAL: 'Oral & dental care',
  UROLOGY: 'Urinary tract',
  NEUROLOGY: 'Brain & nerves',
  DERMATOLOGY: 'Skin conditions',
  PSYCHIATRY: 'Mental health',
  ONCOLOGY: 'Cancer care',
  ANESTHESIOLOGY: 'Pre-op & anesthesia',
  PHYSIOTHERAPY: 'Rehab & mobility',
  EMERGENCY: 'Acute emergencies',
  RADIOLOGY: 'Imaging studies',
  ULTRASOUND: 'Ultrasound reporting',
  LAB: 'Lab consultation',
  OTHER: 'Custom specialty notes',
};

export const SPECIALTY_LIBRARY_CATEGORY_LABELS: Record<SpecialtyLibraryCategory, string> = {
  medical: 'Medical Specialties',
  women_child: 'Women & Child Health',
  surgical: 'Surgical Specialties',
  other: 'Other Specialties',
};

export const SPECIALTY_LIBRARY_FILTER_TABS: Array<{ key: SpecialtyLibraryFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'medical', label: 'Medical' },
  { key: 'surgical', label: 'Surgical' },
  { key: 'women_child', label: 'Women & Child' },
  { key: 'other', label: 'Others' },
];

/** Prefer specialties shown in design library; exclude imaging/lab unless needed. */
const LIBRARY_KEYS: SpecialtyKey[] = [
  'GENERAL_MEDICINE',
  'CARDIOLOGY',
  'PULMONOLOGY',
  'GASTROENTEROLOGY',
  'HEPATOLOGY',
  'NEPHROLOGY',
  'ENDOCRINOLOGY',
  'INFECTIOUS_DISEASE',
  'RHEUMATOLOGY',
  'OBGYN',
  'PEDIATRICS',
  'NEONATOLOGY',
  'GENERAL_SURGERY',
  'ORTHOPEDICS',
  'NEUROSURGERY',
  'ENT',
  'OPHTHALMOLOGY',
  'DENTAL',
  'NEUROLOGY',
  'DERMATOLOGY',
  'PSYCHIATRY',
  'ONCOLOGY',
  'ANESTHESIOLOGY',
  'PHYSIOTHERAPY',
  'EMERGENCY',
  'UROLOGY',
  'OTHER',
];

function buildItem(key: SpecialtyKey): SpecialtyLibraryItem {
  const category = CATEGORY_BY_KEY[key] || 'other';
  const template = getSpecialtyTemplate(key);
  return {
    key,
    name: SPECIALTY_DISPLAY_NAMES[key] || template.name,
    description: SHORT_BLURB[key] || template.description || 'Specialty consultation template',
    category,
    icon: ICON_BY_KEY[key] || 'fa-stethoscope',
    accent: ACCENT_BY_CATEGORY[category],
  };
}

export const SPECIALTY_LIBRARY_ITEMS: SpecialtyLibraryItem[] = LIBRARY_KEYS.filter((key) =>
  ALL_SPECIALTY_KEYS.includes(key)
).map(buildItem);

export function specialtyLibraryItem(key: SpecialtyKey | null | undefined): SpecialtyLibraryItem | null {
  if (!key) return null;
  return SPECIALTY_LIBRARY_ITEMS.find((item) => item.key === key) || buildItem(key);
}

export function filterSpecialtyLibrary(
  items: SpecialtyLibraryItem[],
  options: { filter?: SpecialtyLibraryFilter; search?: string }
): SpecialtyLibraryItem[] {
  const filter = options.filter || 'all';
  const search = String(options.search || '')
    .trim()
    .toLowerCase();
  return items.filter((item) => {
    if (filter !== 'all' && item.category !== filter) {
      return false;
    }
    if (!search) {
      return true;
    }
    return (
      item.name.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      item.key.toLowerCase().includes(search)
    );
  });
}

export function groupSpecialtyLibrary(
  items: SpecialtyLibraryItem[]
): Array<{ category: SpecialtyLibraryCategory; label: string; items: SpecialtyLibraryItem[] }> {
  const order: SpecialtyLibraryCategory[] = ['medical', 'women_child', 'surgical', 'other'];
  return order
    .map((category) => ({
      category,
      label: SPECIALTY_LIBRARY_CATEGORY_LABELS[category],
      items: items.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);
}

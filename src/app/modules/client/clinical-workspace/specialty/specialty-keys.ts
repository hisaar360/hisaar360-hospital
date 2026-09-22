/**
 * Normalized specialty keys used as schema identifiers.
 * Never use raw department display names as schema IDs.
 */
export type SpecialtyKey =
  | 'GENERAL_MEDICINE'
  | 'OBGYN'
  | 'CARDIOLOGY'
  | 'PULMONOLOGY'
  | 'GASTROENTEROLOGY'
  | 'HEPATOLOGY'
  | 'GENERAL_SURGERY'
  | 'ORTHOPEDICS'
  | 'NEUROLOGY'
  | 'NEUROSURGERY'
  | 'PEDIATRICS'
  | 'NEONATOLOGY'
  | 'NEPHROLOGY'
  | 'UROLOGY'
  | 'ENDOCRINOLOGY'
  | 'DERMATOLOGY'
  | 'ENT'
  | 'OPHTHALMOLOGY'
  | 'ONCOLOGY'
  | 'RHEUMATOLOGY'
  | 'PSYCHIATRY'
  | 'INFECTIOUS_DISEASE'
  | 'ANESTHESIOLOGY'
  | 'EMERGENCY'
  | 'PHYSIOTHERAPY'
  | 'DENTAL'
  | 'RADIOLOGY'
  | 'ULTRASOUND'
  | 'LAB'
  | 'OTHER';

export const ALL_SPECIALTY_KEYS: SpecialtyKey[] = [
  'GENERAL_MEDICINE',
  'OBGYN',
  'CARDIOLOGY',
  'PULMONOLOGY',
  'GASTROENTEROLOGY',
  'HEPATOLOGY',
  'GENERAL_SURGERY',
  'ORTHOPEDICS',
  'NEUROLOGY',
  'NEUROSURGERY',
  'PEDIATRICS',
  'NEONATOLOGY',
  'NEPHROLOGY',
  'UROLOGY',
  'ENDOCRINOLOGY',
  'DERMATOLOGY',
  'ENT',
  'OPHTHALMOLOGY',
  'ONCOLOGY',
  'RHEUMATOLOGY',
  'PSYCHIATRY',
  'INFECTIOUS_DISEASE',
  'ANESTHESIOLOGY',
  'EMERGENCY',
  'PHYSIOTHERAPY',
  'DENTAL',
  'RADIOLOGY',
  'ULTRASOUND',
  'LAB',
  'OTHER',
];

/** Display labels for clinicians (never show raw keys in UI). */
export const SPECIALTY_DISPLAY_NAMES: Record<SpecialtyKey, string> = {
  GENERAL_MEDICINE: 'General Medicine',
  OBGYN: 'Obstetrics & Gynaecology',
  CARDIOLOGY: 'Cardiology',
  PULMONOLOGY: 'Pulmonology',
  GASTROENTEROLOGY: 'Gastroenterology',
  HEPATOLOGY: 'Hepatology',
  GENERAL_SURGERY: 'General Surgery',
  ORTHOPEDICS: 'Orthopaedics',
  NEUROLOGY: 'Neurology',
  NEUROSURGERY: 'Neurosurgery',
  PEDIATRICS: 'Pediatrics',
  NEONATOLOGY: 'Neonatology',
  NEPHROLOGY: 'Nephrology',
  UROLOGY: 'Urology',
  ENDOCRINOLOGY: 'Endocrinology',
  DERMATOLOGY: 'Dermatology',
  ENT: 'ENT',
  OPHTHALMOLOGY: 'Ophthalmology',
  ONCOLOGY: 'Oncology',
  RHEUMATOLOGY: 'Rheumatology',
  PSYCHIATRY: 'Psychiatry',
  INFECTIOUS_DISEASE: 'Infectious Disease',
  ANESTHESIOLOGY: 'Anesthesiology',
  EMERGENCY: 'Emergency Medicine',
  PHYSIOTHERAPY: 'Physiotherapy',
  DENTAL: 'Dental / Oral & Maxillofacial',
  RADIOLOGY: 'Radiology',
  ULTRASOUND: 'Ultrasound',
  LAB: 'Laboratory',
  OTHER: 'Other Specialty',
};

/**
 * Exact normalized aliases (full string match after normalizeSpecialtyText).
 * Prefer exact aliases over substring patterns to avoid collisions like
 * "Respiratory Medicine" → GENERAL_MEDICINE.
 */
export const SPECIALTY_EXACT_ALIASES: Record<string, SpecialtyKey> = {
  // General Medicine — explicit only
  medicine: 'GENERAL_MEDICINE',
  'general medicine': 'GENERAL_MEDICINE',
  'internal medicine': 'GENERAL_MEDICINE',
  'medicine department': 'GENERAL_MEDICINE',
  'medical unit': 'GENERAL_MEDICINE',
  'medical department': 'GENERAL_MEDICINE',
  'general physician': 'GENERAL_MEDICINE',
  physician: 'GENERAL_MEDICINE',
  'consultant physician': 'GENERAL_MEDICINE',
  gp: 'GENERAL_MEDICINE',

  // Compound * medicine that must NOT fall through to General Medicine
  'emergency medicine': 'EMERGENCY',
  'respiratory medicine': 'PULMONOLOGY',
  'pulmonary medicine': 'PULMONOLOGY',
  'chest medicine': 'PULMONOLOGY',
  'respiratory diseases': 'PULMONOLOGY',
  'chest diseases': 'PULMONOLOGY',
  'chest clinic': 'PULMONOLOGY',
  'lung clinic': 'PULMONOLOGY',
  'cardiac medicine': 'CARDIOLOGY',
  'heart medicine': 'CARDIOLOGY',
  'liver medicine': 'HEPATOLOGY',
  'hepatic medicine': 'HEPATOLOGY',
  'gi medicine': 'GASTROENTEROLOGY',
  'digestive diseases': 'GASTROENTEROLOGY',
  'digestive medicine': 'GASTROENTEROLOGY',
  'gastrointestinal medicine': 'GASTROENTEROLOGY',
  'physical medicine': 'PHYSIOTHERAPY',
  'physical medicine and rehabilitation': 'PHYSIOTHERAPY',
  'sports medicine': 'OTHER',
  'nuclear medicine': 'OTHER',
  'sleep medicine': 'OTHER',
  // Distinguish later; do not treat as General Medicine by default
  'family medicine': 'OTHER',

  // General Surgery — exact only (specialist surgery stays OTHER / other keys)
  'general surgery': 'GENERAL_SURGERY',
  surgery: 'GENERAL_SURGERY',
  'surgical clinic': 'GENERAL_SURGERY',
  'general surgeon': 'GENERAL_SURGERY',
  'surgical department': 'GENERAL_SURGERY',

  // Specialist surgery — must NOT map to GENERAL_SURGERY
  'thoracic surgery': 'OTHER',
  'hpb surgery': 'OTHER',
  'gi surgery': 'OTHER',
  'hepatobiliary surgery': 'OTHER',
  'colorectal surgery': 'OTHER',
  'cardiac surgery': 'OTHER',
  'plastic surgery': 'OTHER',
  'vascular surgery': 'OTHER',

  // Orthopedics — exact aliases (not rheumatology / physio / sports / neurosurgery)
  orthopedics: 'ORTHOPEDICS',
  orthopaedics: 'ORTHOPEDICS',
  'orthopedic surgery': 'ORTHOPEDICS',
  'orthopaedic surgery': 'ORTHOPEDICS',
  'bone and joint': 'ORTHOPEDICS',
  'bone joint': 'ORTHOPEDICS',
  ortho: 'ORTHOPEDICS',
  'ortho clinic': 'ORTHOPEDICS',

  // Neurology — exact (not neurosurgery / psychiatry / orthopedic spine)
  neurology: 'NEUROLOGY',
  neurologist: 'NEUROLOGY',
  'neurological medicine': 'NEUROLOGY',
  'neuro medicine': 'NEUROLOGY',
  'neurology clinic': 'NEUROLOGY',

  // Neurosurgery — exact (wins over bare neuro via exact table before patterns)
  neurosurgery: 'NEUROSURGERY',
  'neuro surgery': 'NEUROSURGERY',
  neurosurgical: 'NEUROSURGERY',
  neurosurgeon: 'NEUROSURGERY',
  'brain and spine surgery': 'NEUROSURGERY',
  'brain spine surgery': 'NEUROSURGERY',

  // Common exact department labels
  cardiology: 'CARDIOLOGY',
  'heart department': 'CARDIOLOGY',
  'cardiac clinic': 'CARDIOLOGY',
  pulmonology: 'PULMONOLOGY',
  hepatology: 'HEPATOLOGY',
  'liver clinic': 'HEPATOLOGY',
  liver: 'HEPATOLOGY',
  gastroenterology: 'GASTROENTEROLOGY',
  gastro: 'GASTROENTEROLOGY',
  'gi clinic': 'GASTROENTEROLOGY',
  'digestive clinic': 'GASTROENTEROLOGY',
  pediatrics: 'PEDIATRICS',
  paediatrics: 'PEDIATRICS',
  'pediatric medicine': 'PEDIATRICS',
  'paediatric medicine': 'PEDIATRICS',
  'child specialist': 'PEDIATRICS',
  'child medicine': 'PEDIATRICS',
  'children clinic': 'PEDIATRICS',
  "children's medicine": 'PEDIATRICS',
  'children medicine': 'PEDIATRICS',
  neonatology: 'NEONATOLOGY',
  'neonatal medicine': 'NEONATOLOGY',
  physiotherapy: 'PHYSIOTHERAPY',
  physio: 'PHYSIOTHERAPY',

  // ENT — exact only (audiology / speech / maxillofacial / H&N oncology stay out)
  ent: 'ENT',
  'ear nose throat': 'ENT',
  'ear nose and throat': 'ENT',
  otolaryngology: 'ENT',
  otorhinolaryngology: 'ENT',
  'ent clinic': 'ENT',
  'ent specialist': 'ENT',
  orl: 'ENT',
  audiology: 'OTHER',
  'speech therapy': 'OTHER',
  'speech language pathology': 'OTHER',
  'head and neck oncology': 'ONCOLOGY',
  'head neck oncology': 'ONCOLOGY',

  // Ophthalmology — exact; optometry is NOT ophthalmology
  ophthalmology: 'OPHTHALMOLOGY',
  ophthalmologist: 'OPHTHALMOLOGY',
  eye: 'OPHTHALMOLOGY',
  'eye clinic': 'OPHTHALMOLOGY',
  'eye department': 'OPHTHALMOLOGY',
  'eye specialist': 'OPHTHALMOLOGY',
  optometry: 'OTHER',
  optometrist: 'OTHER',

  // Endocrinology — exact (gestational diabetes ok; obstetrics still wins via OBGYN patterns first)
  endocrinology: 'ENDOCRINOLOGY',
  endocrine: 'ENDOCRINOLOGY',
  'diabetes clinic': 'ENDOCRINOLOGY',
  diabetology: 'ENDOCRINOLOGY',
  'diabetes and endocrine': 'ENDOCRINOLOGY',
  'hormone clinic': 'ENDOCRINOLOGY',
  'gestational diabetes': 'ENDOCRINOLOGY',

  // Nephrology — exact (not urology)
  nephrology: 'NEPHROLOGY',
  kidney: 'NEPHROLOGY',
  'kidney clinic': 'NEPHROLOGY',
  'renal medicine': 'NEPHROLOGY',
  'renal clinic': 'NEPHROLOGY',

  // Urology — exact (not nephrology)
  urology: 'UROLOGY',
  urinary: 'UROLOGY',
  'urinary tract clinic': 'UROLOGY',
  'urological surgery': 'UROLOGY',
  urologist: 'UROLOGY',

  // Dermatology
  dermatology: 'DERMATOLOGY',
  skin: 'DERMATOLOGY',
  'skin clinic': 'DERMATOLOGY',
  dermatologist: 'DERMATOLOGY',
  'skin and vd': 'DERMATOLOGY',
  'skin vd': 'DERMATOLOGY',

  // Rheumatology — not orthopedics
  rheumatology: 'RHEUMATOLOGY',
  'rheumatic diseases': 'RHEUMATOLOGY',
  'arthritis clinic': 'RHEUMATOLOGY',
  'autoimmune clinic': 'RHEUMATOLOGY',

  // Infectious Disease — do NOT auto-map TB clinic here
  'infectious disease': 'INFECTIOUS_DISEASE',
  'infectious diseases': 'INFECTIOUS_DISEASE',
  'infection clinic': 'INFECTIOUS_DISEASE',
  'id clinic': 'INFECTIOUS_DISEASE',
  'tropical medicine': 'INFECTIOUS_DISEASE',

  // TB → Pulmonology (chest/TB clinic preference)
  'tb clinic': 'PULMONOLOGY',
  'tuberculosis clinic': 'PULMONOLOGY',

  // Psychiatry
  psychiatry: 'PSYCHIATRY',
  'mental health': 'PSYCHIATRY',
  psychiatric: 'PSYCHIATRY',
  'behavioral health': 'PSYCHIATRY',
  'behavioural health': 'PSYCHIATRY',

  // OBGYN — before oncology so "Gynecologic Oncology" stays women's health
  obgyn: 'OBGYN',
  'ob gyn': 'OBGYN',
  'ob-gyn': 'OBGYN',
  gynae: 'OBGYN',
  gyne: 'OBGYN',
  gynecology: 'OBGYN',
  gynaecology: 'OBGYN',
  gynecologist: 'OBGYN',
  gynaecologist: 'OBGYN',
  obstetrician: 'OBGYN',
  obstetrics: 'OBGYN',
  'obstetrics and gynecology': 'OBGYN',
  'obstetrics and gynaecology': 'OBGYN',
  'obstetrics & gynecology': 'OBGYN',
  'obstetrics & gynaecology': 'OBGYN',
  'gynecologic oncology': 'OBGYN',
  'gynaecologic oncology': 'OBGYN',
  'maternal-fetal medicine': 'OBGYN',
  antenatal: 'OBGYN',
  urogynecology: 'OBGYN',

  // Oncology — surgical / radiation oncology stay OTHER
  oncology: 'ONCOLOGY',
  'medical oncology': 'ONCOLOGY',
  'cancer clinic': 'ONCOLOGY',
  'cancer center': 'ONCOLOGY',
  'cancer centre': 'ONCOLOGY',
  'surgical oncology': 'OTHER',
  'radiation oncology': 'OTHER',

  // Anesthesiology
  anesthesiology: 'ANESTHESIOLOGY',
  anaesthesiology: 'ANESTHESIOLOGY',
  anesthesia: 'ANESTHESIOLOGY',
  anaesthesia: 'ANESTHESIOLOGY',
  'pre anesthesia clinic': 'ANESTHESIOLOGY',
  'pre anaesthesia clinic': 'ANESTHESIOLOGY',
  'pre-anesthesia clinic': 'ANESTHESIOLOGY',
  'pre-anaesthesia clinic': 'ANESTHESIOLOGY',

  // Emergency Medicine — key is EMERGENCY (not EMERGENCY_MEDICINE)
  emergency: 'EMERGENCY',
  er: 'EMERGENCY',
  ed: 'EMERGENCY',
  'accident and emergency': 'EMERGENCY',
  'a and e': 'EMERGENCY',

  // Neonatology
  'newborn medicine': 'NEONATOLOGY',
  'neonatal clinic': 'NEONATOLOGY',
  nicu: 'NEONATOLOGY',

  // Dental / Oral & Maxillofacial — key is DENTAL (not DENTAL_ORAL_MAXILLOFACIAL)
  dental: 'DENTAL',
  dentistry: 'DENTAL',
  dentist: 'DENTAL',
  'oral surgery': 'DENTAL',
  'oral and maxillofacial': 'DENTAL',
  'oral maxillofacial surgery': 'DENTAL',
  maxillofacial: 'DENTAL',
  'maxillofacial surgery': 'DENTAL',
  omfs: 'DENTAL',
};

/**
 * Ordered pattern rules. Run AFTER exact aliases.
 * First confident match wins. More specific patterns must appear before broader ones.
 * NEVER use bare /\bmedicine\b/ here.
 */
export const SPECIALTY_ALIAS_RULES: Array<{ key: SpecialtyKey; patterns: RegExp[] }> = [
  // OBGYN first — obstetrics / antenatal / pregnancy / gynecologic* must win over oncology / diabetes
  {
    key: 'OBGYN',
    patterns: [
      /\bobgyn\b/,
      /\bob\s*gyn\b/,
      /\bgyne?colog/,
      /\bgynae?cology\b/,
      /\bgynae?\b/,
      /\bobstetrics?\b/,
      /\bantenatal\b/,
      /\bpregnan/,
      /\burogyne?colog/,
    ],
  },
  // Specialist surgery → OTHER (before chest / liver / gastro / cardiac patterns)
  {
    key: 'OTHER',
    patterns: [
      /\bthoracic surg/,
      /\bchest surg/,
      /\bhpb surg/,
      /\bgi surg/,
      /\bhepatobiliary surg/,
      /\bcolorectal surg/,
      /\bliver surg/,
      /\bgastrointestinal surg/,
      /\bgastro surg/,
      /\bcardiac surg/,
      /\bplastic surg/,
      /\bvascular surg/,
    ],
  },
  {
    key: 'PULMONOLOGY',
    patterns: [
      /\brespiratory medicine\b/,
      /\bpulmonary medicine\b/,
      /\bchest medicine\b/,
      /\brespiratory diseases?\b/,
      /\bchest diseases?\b/,
      /\bchest clinic\b/,
      /\blung clinic\b/,
      /\bpulmon/,
      /\bchest\b/,
      /\brespiratory\b/,
      /\blung\b/,
      /\bbronch/,
    ],
  },
  { key: 'CARDIOLOGY', patterns: [/\bcardiac medicine\b/, /\bheart medicine\b/, /\bcardio/, /\bcardiac\b/, /\bheart\b/, /\bcoronary\b/] },
  {
    key: 'HEPATOLOGY',
    patterns: [
      /\bliver medicine\b/,
      /\bhepatic medicine\b/,
      /\bhepatolog/,
      /\bliver clinic\b/,
      /\bhepatic\b/,
      /\bliver\b/,
    ],
  },
  { key: 'PHYSIOTHERAPY', patterns: [/\bphysical medicine\b/, /\bphysio/, /\brehab\b/, /\boccupational therap/, /\bmanual therap/] },
  // Neurosurgery before Neurology — neurosurg / neuro surgery must win over bare neuro
  {
    key: 'NEUROSURGERY',
    patterns: [
      /\bneurosurg/,
      /\bneuro\s*surg/,
      /\bbrain\s*(and\s*)?spine\s*surg/,
      /\bbrain surg/,
      /\bspine surg/,
    ],
  },
  // neurolog before bare neuro; bare neuro must not steal neurosurgery (handled above)
  { key: 'NEUROLOGY', patterns: [/\bneurolog/, /\bneuro\b/] },
  {
    key: 'NEONATOLOGY',
    patterns: [/\bnewborn medicine\b/, /\bneonatal clinic\b/, /\bneonatal medicine\b/, /\bneonat/, /\bnicu\b/],
  },
  { key: 'PEDIATRICS', patterns: [/\bpaediatric medicine\b/, /\bpediatric medicine\b/, /\bchild medicine\b/, /\bchildren'?s? medicine\b/, /\bchildren clinic\b/, /\bpaediat/, /\bpediat/, /\bchild specialist\b/, /\bchild health\b/, /\bchildren/] },
  {
    key: 'GASTROENTEROLOGY',
    patterns: [
      /\bgi medicine\b/,
      /\bgastrointestinal medicine\b/,
      /\bdigestive diseases?\b/,
      /\bdigestive medicine\b/,
      /\bgastro/,
      /\bdigestive\b/,
      /\bendoscop/,
      /\bgi\b/,
    ],
  },
  // Orthopedics before general surgery; orthop only — not rheumatology / sports / physio
  { key: 'ORTHOPEDICS', patterns: [/\borthop/] },
  // General Surgery — avoid bare /\bsurgery\b/ catching specialist surgery
  { key: 'GENERAL_SURGERY', patterns: [/\bgeneral surg/, /\bsurgical clinic\b/] },
  // Nephrology before Urology — renal/kidney must not become Urology
  { key: 'NEPHROLOGY', patterns: [/\bnephrolog/, /\bkidney\b/, /\brenal\b/, /\bdialysis\b/] },
  { key: 'UROLOGY', patterns: [/\burolog/, /\burinary\b/, /\bprostate\b/, /\bstone clinic\b/] },
  { key: 'ENDOCRINOLOGY', patterns: [/\bendocrin/, /\bdiabet/, /\bthyroid\b/, /\bhormone\b/] },
  { key: 'DERMATOLOGY', patterns: [/\bdermat/, /\bskin clinic\b/, /\bskin department\b/, /\bskin\b/] },
  // ENT before dental/oral — carefully avoid audiology / speech / maxillofacial / H&N oncology
  { key: 'ENT', patterns: [/\bent\b/, /\botolaryng/, /\botorhinolaryng/] },
  // Ophthalmology — ophthalm / eye clinic words; optometry is exact→OTHER (no /\boptom/)
  { key: 'OPHTHALMOLOGY', patterns: [/\bophthalm/, /\beye clinic\b/, /\beye department\b/, /\beye specialist\b/, /\beye\b/] },
  // Surgical / radiation oncology exact→OTHER; medical oncology / cancer via patterns
  { key: 'ONCOLOGY', patterns: [/\bmedical oncolo/, /\boncolo/, /\bcancer clinic\b/, /\bcancer cent[re]{2}\b/, /\bcancer\b/, /\bchemotherap/, /\btumo[u]?r\b/] },
  // Rheumatology before bare arthritis stealing orthopedics (ortho already matched via orthop)
  { key: 'RHEUMATOLOGY', patterns: [/\brheumat/, /\brheumatic\b/, /\barthritis clinic\b/, /\bautoimmune clinic\b/] },
  { key: 'PSYCHIATRY', patterns: [/\bpsychiatr/, /\bmental health\b/, /\bbehaviou?ral health\b/, /\bbehavioral\b/] },
  {
    key: 'INFECTIOUS_DISEASE',
    patterns: [/\binfectious diseases?\b/, /\binfection clinic\b/, /\binfection control\b/, /\bid clinic\b/, /\btropical medicine\b/, /\binfectious\b/],
  },
  {
    key: 'ANESTHESIOLOGY',
    patterns: [/\banaesthesiol/, /\banesthesiol/, /\banaesth/, /\banesth/, /\bpre[\s-]?anaesth/, /\bpre[\s-]?anesth/],
  },
  {
    key: 'EMERGENCY',
    patterns: [
      /\bemergency medicine\b/,
      /\baccident and emergency\b/,
      /\ba and e\b/,
      /\bemergency\b/,
      /\bcasualty\b/,
      /\ber\b/,
      /\bed\b/,
    ],
  },
  {
    key: 'DENTAL',
    patterns: [
      /\bdental\b/,
      /\bdentist\b/,
      /\bdentistry\b/,
      /\btooth\b/,
      /\boral surgery\b/,
      /\boral and maxillo/,
      /\boral.?maxillo/,
      /\bmaxillofacial\b/,
      /\bomfs\b/,
    ],
  },
  { key: 'ULTRASOUND', patterns: [/\bultra/, /\bsonolog/, /\busg\b/, /\bdoppler\b/] },
  { key: 'RADIOLOGY', patterns: [/\bradio/, /\bx[\s-]?ray\b/, /\bct\b/, /\bmri\b/, /\bimaging\b/] },
  { key: 'LAB', patterns: [/\bpatholog/, /\bmicrobiolog/, /\bhematolog/, /\bbiochemist/, /\blab consultant\b/] },
  {
    key: 'GENERAL_MEDICINE',
    patterns: [
      /\bgeneral medicine\b/,
      /\binternal medicine\b/,
      /\bmedicine department\b/,
      /\bmedical unit\b/,
      /\bgeneral physician\b/,
      /\bconsultant physician\b/,
      /\bphysician\b/,
      /\bgp\b/,
    ],
  },
];

/** Phrases that contain "medicine" but must stay OTHER (or other keys via exact aliases). */
export const MEDICINE_BLOCKLIST_EXACT = new Set([
  'nuclear medicine',
  'sports medicine',
  'sleep medicine',
]);

/** Normalize free text for alias matching. */
export function normalizeSpecialtyText(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSpecialtyKey(value: string | null | undefined): value is SpecialtyKey {
  return Boolean(value && ALL_SPECIALTY_KEYS.includes(value as SpecialtyKey));
}

/**
 * Resolve a SpecialtyKey from free text.
 * Returns OTHER when blank or no confident alias match.
 *
 * Matching order:
 * 1. Exact SpecialtyKey token
 * 2. Exact alias table (includes exact "medicine")
 * 3. Ordered specific patterns (no bare "medicine" substring)
 * 4. OTHER
 */
export function normalizeSpecialtyKey(raw: string | null | undefined): SpecialtyKey {
  const text = String(raw || '').trim();
  if (!text) {
    return 'OTHER';
  }

  const asKey = text.toUpperCase().replace(/[\s-]+/g, '_');
  if (isSpecialtyKey(asKey)) {
    return asKey;
  }

  const normalized = normalizeSpecialtyText(text);
  if (!normalized) {
    return 'OTHER';
  }

  if (MEDICINE_BLOCKLIST_EXACT.has(normalized)) {
    return 'OTHER';
  }

  const exact = SPECIALTY_EXACT_ALIASES[normalized];
  if (exact) {
    return exact;
  }

  for (const rule of SPECIALTY_ALIAS_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.key;
    }
  }

  return 'OTHER';
}

/** Bridge to legacy prescription specialtySection values. */
export function specialtyKeyToLegacySection(key: SpecialtyKey): string {
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

export function legacySectionToSpecialtyKey(section: string | null | undefined): SpecialtyKey {
  switch (String(section || '').trim()) {
    case 'gynae':
      return 'OBGYN';
    case 'eye':
      return 'OPHTHALMOLOGY';
    case 'ultrasound':
      return 'ULTRASOUND';
    case 'radiology':
      return 'RADIOLOGY';
    case 'dental':
      return 'DENTAL';
    case 'physiotherapy':
      return 'PHYSIOTHERAPY';
    case 'lab':
      return 'LAB';
    case 'general':
      return 'GENERAL_MEDICINE';
    default:
      return normalizeSpecialtyKey(section);
  }
}

export function specialtyDisplayName(key: SpecialtyKey | null | undefined): string {
  if (!key || !isSpecialtyKey(key)) {
    return SPECIALTY_DISPLAY_NAMES.OTHER;
  }
  return SPECIALTY_DISPLAY_NAMES[key];
}

/**
 * Phase E gate documentation helper — which specialties use which UI path.
 */
export type SpecialtyUiPath = 'GENERIC_ENGINE' | 'CUSTOM_LEGACY' | 'OTHER_FALLBACK';

export function specialtyUiPath(key: SpecialtyKey, legacySection?: string | null): SpecialtyUiPath {
  const legacy = String(legacySection || '').trim();
  if (key === 'OBGYN' || legacy === 'gynae') {
    return 'CUSTOM_LEGACY';
  }
  if (key === 'PHYSIOTHERAPY' || legacy === 'physiotherapy') {
    return 'CUSTOM_LEGACY';
  }
  // Ophthalmology hybrid: keep CUSTOM_LEGACY eye grid (key and/or legacy section)
  if (key === 'OPHTHALMOLOGY' || legacy === 'eye') {
    return 'CUSTOM_LEGACY';
  }
  // Dental / OMFS hybrid: keep CUSTOM_LEGACY dental grid (key and/or legacy section)
  if (key === 'DENTAL' || legacy === 'dental') {
    return 'CUSTOM_LEGACY';
  }
  if (['ultrasound', 'radiology', 'lab'].includes(legacy)) {
    return 'CUSTOM_LEGACY';
  }
  if (
    key === 'GENERAL_MEDICINE' ||
    key === 'CARDIOLOGY' ||
    key === 'PEDIATRICS' ||
    key === 'PULMONOLOGY' ||
    key === 'GASTROENTEROLOGY' ||
    key === 'HEPATOLOGY' ||
    key === 'GENERAL_SURGERY' ||
    key === 'ORTHOPEDICS' ||
    key === 'NEUROLOGY' ||
    key === 'NEUROSURGERY' ||
    key === 'ENT' ||
    key === 'ENDOCRINOLOGY' ||
    key === 'NEPHROLOGY' ||
    key === 'UROLOGY' ||
    key === 'DERMATOLOGY' ||
    key === 'RHEUMATOLOGY' ||
    key === 'INFECTIOUS_DISEASE' ||
    key === 'PSYCHIATRY' ||
    key === 'ONCOLOGY' ||
    key === 'ANESTHESIOLOGY' ||
    key === 'EMERGENCY' ||
    key === 'NEONATOLOGY'
  ) {
    return 'GENERIC_ENGINE';
  }
  if (key === 'OTHER') {
    return 'OTHER_FALLBACK';
  }
  // Future specialties: keys exist but templates not yet registered → OTHER fallback UI
  return 'OTHER_FALLBACK';
}

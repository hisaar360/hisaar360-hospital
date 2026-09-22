import { transliterateDoctorNameToUrdu, transliterateLatinToUrdu } from '../../../shared/utils/urdu-transliteration';

const URDU_WORD_MAP: Record<string, string> = {
  dr: 'ڈاکٹر',
  doctor: 'ڈاکٹر',
  consultant: 'کنسلٹنٹ',
  physician: 'فزیشن',
  general: 'جنرل',
  hospital: 'ہسپتال',
  medical: 'میڈیکل',
  city: 'سٹی',
  care: 'کیئر',
  demo: 'ڈیمو',
  medicare: 'میڈی کیئر',
  medilink: 'میڈی لنک',
  main: 'مین',
  boulevard: 'بلیوارڈ',
  road: 'روڈ',
  street: 'سٹریٹ',
  chowk: 'چوک',
  lahore: 'لاہور',
  karachi: 'کراچی',
  islamabad: 'اسلام آباد',
  pakistan: 'پاکستان',
  cardiology: 'کارڈیالوجی',
  cardiologist: 'ماہرِ امراضِ قلب',
  medicine: 'میڈیسن',
  surgery: 'سرجری',
  surgeon: 'سرجن',
  pediatrics: 'اطفال',
  paediatrician: 'ماہرِ اطفال',
  pediatrician: 'ماہرِ اطفال',
  gynecology: 'امراض نسواں',
  gynaecology: 'امراض نسواں',
  gynecologist: 'گائناکالوجسٹ',
  gynaecologist: 'گائناکالوجسٹ',
  gynecologic: 'گائناکولوجک',
  gynaecologic: 'گائناکولوجک',
  oncology: 'آنکالوجی',
  reproductive: ' تولیدی',
  infertility: 'بانجھ پن',
  maternal: 'مادری',
  fetal: 'جنینی',
  obstetrician: 'اوبسٹٹریشن',
  obstetrics: 'زچگی',
  ophthalmologist: 'ماہرِ امراضِ چشم',
  ophthalmology: 'امراض چشم',
  dentist: 'ڈینٹسٹ',
  dental: 'ڈینٹل',
  physiotherapist: 'فزیو تھراپسٹ',
  physiotherapy: 'فزیو تھراپی',
  dermatologist: 'ماہرِ امراضِ جلد',
  dermatology: 'امراض جلد',
  neurologist: 'ماہرِ اعصاب',
  neurology: 'نیورالوجی',
  orthopaedic: 'آرتھوپیڈک',
  orthopedic: 'آرتھوپیڈک',
  ent: 'ای این ٹی',
  mbbs: 'ایم بی بی ایس',
  fcps: 'ایف سی پی ایس',
  mcps: 'ایم سی پی ایس',
  mrcp: 'ایم آر سی پی',
  frcs: 'ایف آر سی ایس',
  md: 'ایم ڈی',
  ms: 'ایم ایس',
  bds: 'بی ڈی ایس',
  uk: 'یو کے',
  usa: 'یو ایس اے',
  uae: 'یو اے ای',
  bahawalpur: 'بہاولپور',
  bahawal: 'بہاول',
  university: 'یونیورسٹی',
  liaquat: 'لیاقت',
  pur: 'پور',
  testin: 'ٹیسٹنگ',
  testing: 'ٹیسٹنگ',
  health: 'ہیلتھ',
  healthcare: 'ہیلتھ کیئر',
  clinic: 'کلینک',
  colony: 'کالونی',
  market: 'مارکیٹ',
  town: 'ٹاؤن',
  block: 'بلاک',
  sector: 'سیکٹر',
  phase: 'فیز',
  nagar: 'نگر',
  multan: 'ملتان',
  faisalabad: 'فیصل آباد',
  rawalpindi: 'راولپنڈی',
  peshawar: 'پشاور',
  quetta: 'کوئٹہ',
  sialkot: 'سیالکوٹ',
  gujranwala: 'گوجرانوالہ',
  hyderabad: 'حیدرآباد',
  sargodha: 'سرگودھا',
  rahim: 'رحیم',
  yar: 'یار',
  khan: 'خان',
  aoun: 'اعون',
  javaid: 'جاوید',
  javid: 'جاوید',
  javeed: 'جاوید',
};

/** Multi-word specialty phrases (checked before word-by-word). */
const URDU_PHRASE_MAP: Array<{ pattern: RegExp; urdu: string }> = [
  { pattern: /gynecologic\s*oncology|gynaecologic\s*oncology/i, urdu: 'گائناکولوجک آنکالوجی' },
  {
    pattern: /reproductive\s*medicine\s*\/?\s*infertility|reproductive\s*medicine|infertility/i,
    urdu: 'تولیدی طب / بانجھ پن',
  },
  { pattern: /maternal[-\s]?fetal\s*medicine/i, urdu: 'مادری و جنینی طب' },
  { pattern: /obstetrician\s*&\s*gynaecologist|gynaecologist\s*&\s*obstetrician/i, urdu: 'گائناکالوجسٹ اینڈ اوبسٹٹریشن' },
  { pattern: /consultant\s*gynaecologist|consultant\s*gynecologist/i, urdu: 'کنسلٹنٹ گائناکالوجسٹ' },
  { pattern: /\bgynecologist\b|\bgynaecologist\b/i, urdu: 'گائناکالوجسٹ' },
  { pattern: /\bophthalmologist\b/i, urdu: 'ماہرِ امراضِ چشم' },
  { pattern: /\bcardiologist\b/i, urdu: 'ماہرِ امراضِ قلب' },
  { pattern: /\bpediatrician\b|\bpaediatrician\b/i, urdu: 'ماہرِ اطفال' },
  { pattern: /\bdermatologist\b/i, urdu: 'ماہرِ امراضِ جلد' },
  { pattern: /\bphysiotherapist\b/i, urdu: 'فزیو تھراپسٹ' },
  { pattern: /\bdentist\b/i, urdu: 'ڈینٹسٹ' },
  { pattern: /consultant\s*physician/i, urdu: 'کنسلٹنٹ فزیشن' },
];

const ENGLISH_WORD_MAP: Record<string, string> = {
  pakistan: 'Pakistan',
  lahore: 'Lahore',
  karachi: 'Karachi',
  islamabad: 'Islamabad',
  bahawalpur: 'Bahawalpur',
  mbbs: 'MBBS',
  fcps: 'FCPS',
  md: 'MD',
  ms: 'MS',
  bds: 'BDS',
  dr: 'Dr.',
  uk: 'UK',
  usa: 'USA',
  uae: 'UAE',
};

const URDU_NAME_MAP: Record<string, string> = {
  ayesha: 'عائشہ',
  aisha: 'عائشہ',
  aoun: 'اعون',
  javaid: 'جاوید',
  javed: 'جاوید',
  khan: 'خان',
  ali: 'علی',
  ahmed: 'احمد',
  ahmad: 'احمد',
  hassan: 'حسن',
  hasan: 'حسن',
  fatima: 'فاطمہ',
  muhammad: 'محمد',
  mohammad: 'محمد',
  maaz: 'معاذ',
  bukhari: 'بخاری',
  sara: 'سارہ',
  usman: 'عثمان',
  bilal: 'بلال',
  zain: 'زین',
  hina: 'حناء',
};

const translateWordToUrdu = (word: string): string => {
  const cleaned = word.replace(/[.,]/g, '');
  const lower = cleaned.toLowerCase();
  if (!lower) {
    return word;
  }

  if (URDU_WORD_MAP[lower]) {
    return URDU_WORD_MAP[lower];
  }

  if (URDU_NAME_MAP[lower]) {
    return URDU_NAME_MAP[lower];
  }

  const transliterated = transliterateLatinToUrdu(cleaned);
  if (transliterated) {
    return transliterated;
  }

  return cleaned;
};

const formatEnglishToken = (token: string): string => {
  const cleaned = token.replace(/[.,]/g, '');
  const lower = cleaned.toLowerCase();
  if (!lower) {
    return token;
  }

  if (ENGLISH_WORD_MAP[lower]) {
    return ENGLISH_WORD_MAP[lower];
  }

  if (/^[A-Z]{2,}$/.test(cleaned)) {
    return cleaned;
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
};

const splitAddressSegments = (value: string): string[] =>
  value
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);

const splitAddressWords = (segment: string): string[] =>
  segment
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

export const formatEnglishOrganizationName = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  return splitAddressWords(raw).map(formatEnglishToken).join(' ');
};

export const formatEnglishAddress = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  return splitAddressSegments(raw)
    .map((segment) => splitAddressWords(segment).map(formatEnglishToken).join(' '))
    .join(', ');
};

export const formatUrduAddress = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  return splitAddressSegments(raw)
    .map((segment) => splitAddressWords(segment).map(translateWordToUrdu).join(' '))
    .join('، ');
};

export const formatUrduOrganizationName = (
  value?: string | null,
  manualUrduName?: string | null
): string => {
  const manual = String(manualUrduName || '').trim();
  if (manual) {
    return manual;
  }

  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  return splitAddressWords(raw).map(translateWordToUrdu).join(' ');
};

export const toPrescriptionUrduText = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  const phraseHit = URDU_PHRASE_MAP.find((entry) => entry.pattern.test(raw));
  if (phraseHit && !/[|,]/.test(raw)) {
    return phraseHit.urdu;
  }

  return raw
    .split(/\s*\|\s*|\s*,\s*/)
    .map((segment) => {
      const trimmed = segment.trim();
      if (!trimmed) {
        return '';
      }
      const hit = URDU_PHRASE_MAP.find((entry) => entry.pattern.test(trimmed));
      if (hit) {
        return hit.urdu;
      }
      return splitAddressWords(trimmed.replace(/\//g, ' / ')).map(translateWordToUrdu).join(' ');
    })
    .filter(Boolean)
    .join(' | ');
};

export const stripDoctorPrefix = (name?: string | null): string =>
  String(name || '')
    .trim()
    .replace(/^dr\.?\s*/i, '')
    .trim();

export const formatEnglishDoctorName = (name?: string | null): string => {
  const plain = stripDoctorPrefix(name);
  return plain ? `Dr. ${plain}` : 'Dr.';
};

export const formatUrduDoctorName = (
  name?: string | null,
  urduName?: string | null
): string => {
  const manualUrdu = String(urduName || '').trim();
  if (manualUrdu) {
    return manualUrdu.startsWith('ڈاکٹر') ? manualUrdu : `ڈاکٹر ${manualUrdu}`;
  }

  const plain = stripDoctorPrefix(name);
  if (!plain) {
    return 'ڈاکٹر';
  }

  return transliterateDoctorNameToUrdu(plain) || 'ڈاکٹر';
};

export const formatEnglishDoctorTitle = (specialization?: string | null): string => {
  const value = String(specialization || '').trim();
  return value || 'Consultant Physician';
};

export const formatUrduDoctorTitle = (specialization?: string | null): string => {
  const value = String(specialization || '').trim();
  if (!value) {
    return 'کنسلٹنٹ فزیشن';
  }
  return toPrescriptionUrduText(value) || 'کنسلٹنٹ فزیشن';
};

export const formatUrduQualification = (qualification?: string | null): string => {
  const value = String(qualification || '').trim();
  if (!value) {
    return 'ایم بی بی ایس، ایف سی پی ایس';
  }

  return value
    .split(/\s*\|\s*|\s*,\s*/)
    .map((segment) => splitAddressWords(segment.trim()).map(translateWordToUrdu).join(' '))
    .filter(Boolean)
    .join(' | ');
};

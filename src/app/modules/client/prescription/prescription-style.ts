export type PrescriptionLogoPosition = 'left' | 'center' | 'right';

export type PrescriptionLayoutColumn = 'left' | 'right' | 'full';

export type PrescriptionLayoutSectionKey =
  | 'header'
  | 'meta'
  | 'patient'
  | 'vitals'
  | 'labs'
  | 'specialty'
  | 'followUp'
  | 'drips'
  | 'medicines'
  | 'instructions'
  | 'signature'
  | 'footer';

export interface PrescriptionLayoutSection {
  key: PrescriptionLayoutSectionKey;
  visible: boolean;
  column: PrescriptionLayoutColumn;
}

export interface PrescriptionStyleSettings {
  englishHeadingMarginLeft: number;
  englishHeadingMarginRight: number;
  urduHeadingMarginLeft: number;
  urduHeadingMarginRight: number;
  englishHeadingFontSize: number;
  urduHeadingFontSize: number;
  englishHeadingLineHeight: number;
  urduHeadingLineHeight: number;
  lineGap: number;
  sectionGap: number;
  pagePaddingTop: number;
  pagePaddingRight: number;
  pagePaddingBottom: number;
  pagePaddingLeft: number;
  logoPosition: PrescriptionLogoPosition;
  logoScale: number;
  logoOffsetX: number;
  logoOffsetY: number;
  medicineRowGap: number;
  medicineFontSize: number;
  showUrduAdvice: boolean;
  showRightNote: boolean;
  showHospitalAddress: boolean;
  patientTableCompact: boolean;
  accentColor: string;
  tableHeaderBg: string;
  tableBorderColor: string;
  metaBarBg: string;
  metaBarText: string;
  sectionTitleColor: string;
  enNameColor: string;
  enQualificationColor: string;
  enSpecialtyColor: string;
  enHospitalColor: string;
  enAddressColor: string;
  urNameColor: string;
  urQualificationColor: string;
  urSpecialtyColor: string;
  urHospitalColor: string;
  urAddressColor: string;
}

export const DEFAULT_PRESCRIPTION_STYLE: PrescriptionStyleSettings = {
  englishHeadingMarginLeft: 0,
  englishHeadingMarginRight: 0,
  urduHeadingMarginLeft: 0,
  urduHeadingMarginRight: 0,
  englishHeadingFontSize: 16,
  urduHeadingFontSize: 15,
  englishHeadingLineHeight: 1.25,
  urduHeadingLineHeight: 1.45,
  lineGap: 2,
  sectionGap: 3,
  pagePaddingTop: 5,
  pagePaddingRight: 6,
  pagePaddingBottom: 4,
  pagePaddingLeft: 6,
  logoPosition: 'center',
  logoScale: 100,
  logoOffsetX: 0,
  logoOffsetY: 0,
  medicineRowGap: 0,
  medicineFontSize: 9,
  showUrduAdvice: true,
  showRightNote: true,
  showHospitalAddress: true,
  patientTableCompact: false,
  accentColor: '#1e3a5f',
  tableHeaderBg: '#e8eef5',
  tableBorderColor: '#8b95a3',
  metaBarBg: '#f1f5f9',
  metaBarText: '#0f172a',
  sectionTitleColor: '#0f172a',
  enNameColor: '#202048',
  enQualificationColor: '#334155',
  enSpecialtyColor: '#475569',
  enHospitalColor: '#334155',
  enAddressColor: '#64748b',
  urNameColor: '#202048',
  urQualificationColor: '#334155',
  urSpecialtyColor: '#475569',
  urHospitalColor: '#334155',
  urAddressColor: '#64748b',
};

export const DEFAULT_PRESCRIPTION_LAYOUT: PrescriptionLayoutSection[] = [
  { key: 'header', visible: true, column: 'full' },
  { key: 'meta', visible: true, column: 'full' },
  { key: 'patient', visible: true, column: 'full' },
  { key: 'vitals', visible: true, column: 'left' },
  { key: 'labs', visible: true, column: 'left' },
  { key: 'specialty', visible: true, column: 'left' },
  { key: 'followUp', visible: true, column: 'left' },
  { key: 'drips', visible: true, column: 'right' },
  { key: 'medicines', visible: true, column: 'right' },
  { key: 'instructions', visible: true, column: 'right' },
  { key: 'signature', visible: true, column: 'full' },
  { key: 'footer', visible: true, column: 'full' },
];

export const PRESCRIPTION_LAYOUT_LABELS: Record<PrescriptionLayoutSectionKey, string> = {
  header: 'Doctor / Hospital Header',
  meta: 'Date / Meta',
  patient: 'Patient Table',
  vitals: 'O/E Vitals',
  labs: 'Labs',
  specialty: 'Specialty Block',
  followUp: 'Follow Up',
  drips: "Drip's",
  medicines: 'Medicines Table',
  instructions: 'Instructions / Notes',
  signature: 'Signature',
  footer: 'Footer',
};

const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
};

const normalizeHexColor = (value: unknown, fallback: string): string => {
  const raw = String(value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    return raw.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const expanded = raw
      .slice(1)
      .split('')
      .map((ch) => ch + ch)
      .join('');
    return `#${expanded}`.toLowerCase();
  }
  return fallback;
};

export function normalizePrescriptionStyle(
  style?: Partial<PrescriptionStyleSettings> | null
): PrescriptionStyleSettings {
  const incoming = style || {};
  const logoPosition = String(incoming.logoPosition || '')
    .trim()
    .toLowerCase() as PrescriptionLogoPosition;

  return {
    englishHeadingMarginLeft: clamp(
      incoming.englishHeadingMarginLeft,
      -40,
      80,
      DEFAULT_PRESCRIPTION_STYLE.englishHeadingMarginLeft
    ),
    englishHeadingMarginRight: clamp(
      incoming.englishHeadingMarginRight,
      -40,
      80,
      DEFAULT_PRESCRIPTION_STYLE.englishHeadingMarginRight
    ),
    urduHeadingMarginLeft: clamp(
      incoming.urduHeadingMarginLeft,
      -40,
      80,
      DEFAULT_PRESCRIPTION_STYLE.urduHeadingMarginLeft
    ),
    urduHeadingMarginRight: clamp(
      incoming.urduHeadingMarginRight,
      -40,
      80,
      DEFAULT_PRESCRIPTION_STYLE.urduHeadingMarginRight
    ),
    englishHeadingFontSize: clamp(
      incoming.englishHeadingFontSize,
      10,
      28,
      DEFAULT_PRESCRIPTION_STYLE.englishHeadingFontSize
    ),
    urduHeadingFontSize: clamp(
      incoming.urduHeadingFontSize,
      10,
      28,
      DEFAULT_PRESCRIPTION_STYLE.urduHeadingFontSize
    ),
    englishHeadingLineHeight: clamp(
      incoming.englishHeadingLineHeight,
      1,
      2.4,
      DEFAULT_PRESCRIPTION_STYLE.englishHeadingLineHeight
    ),
    urduHeadingLineHeight: clamp(
      incoming.urduHeadingLineHeight,
      1,
      2.6,
      DEFAULT_PRESCRIPTION_STYLE.urduHeadingLineHeight
    ),
    lineGap: clamp(incoming.lineGap, 0, 12, DEFAULT_PRESCRIPTION_STYLE.lineGap),
    sectionGap: clamp(incoming.sectionGap, 0, 16, DEFAULT_PRESCRIPTION_STYLE.sectionGap),
    pagePaddingTop: clamp(
      incoming.pagePaddingTop,
      2,
      20,
      DEFAULT_PRESCRIPTION_STYLE.pagePaddingTop
    ),
    pagePaddingRight: clamp(
      incoming.pagePaddingRight,
      2,
      20,
      DEFAULT_PRESCRIPTION_STYLE.pagePaddingRight
    ),
    pagePaddingBottom: clamp(
      incoming.pagePaddingBottom,
      2,
      20,
      DEFAULT_PRESCRIPTION_STYLE.pagePaddingBottom
    ),
    pagePaddingLeft: clamp(
      incoming.pagePaddingLeft,
      2,
      20,
      DEFAULT_PRESCRIPTION_STYLE.pagePaddingLeft
    ),
    logoPosition: (['left', 'center', 'right'] as PrescriptionLogoPosition[]).includes(logoPosition)
      ? logoPosition
      : DEFAULT_PRESCRIPTION_STYLE.logoPosition,
    logoScale: clamp(incoming.logoScale, 50, 200, DEFAULT_PRESCRIPTION_STYLE.logoScale),
    logoOffsetX: clamp(incoming.logoOffsetX, -60, 60, DEFAULT_PRESCRIPTION_STYLE.logoOffsetX),
    logoOffsetY: clamp(incoming.logoOffsetY, -40, 40, DEFAULT_PRESCRIPTION_STYLE.logoOffsetY),
    medicineRowGap: clamp(
      incoming.medicineRowGap,
      0,
      8,
      DEFAULT_PRESCRIPTION_STYLE.medicineRowGap
    ),
    medicineFontSize: clamp(
      incoming.medicineFontSize,
      7,
      14,
      DEFAULT_PRESCRIPTION_STYLE.medicineFontSize
    ),
    showUrduAdvice:
      typeof incoming.showUrduAdvice === 'boolean'
        ? incoming.showUrduAdvice
        : DEFAULT_PRESCRIPTION_STYLE.showUrduAdvice,
    showRightNote:
      typeof incoming.showRightNote === 'boolean'
        ? incoming.showRightNote
        : DEFAULT_PRESCRIPTION_STYLE.showRightNote,
    showHospitalAddress:
      typeof incoming.showHospitalAddress === 'boolean'
        ? incoming.showHospitalAddress
        : DEFAULT_PRESCRIPTION_STYLE.showHospitalAddress,
    patientTableCompact:
      typeof incoming.patientTableCompact === 'boolean'
        ? incoming.patientTableCompact
        : DEFAULT_PRESCRIPTION_STYLE.patientTableCompact,
    accentColor: normalizeHexColor(incoming.accentColor, DEFAULT_PRESCRIPTION_STYLE.accentColor),
    tableHeaderBg: normalizeHexColor(
      incoming.tableHeaderBg,
      DEFAULT_PRESCRIPTION_STYLE.tableHeaderBg
    ),
    tableBorderColor: normalizeHexColor(
      incoming.tableBorderColor,
      DEFAULT_PRESCRIPTION_STYLE.tableBorderColor
    ),
    metaBarBg: normalizeHexColor(incoming.metaBarBg, DEFAULT_PRESCRIPTION_STYLE.metaBarBg),
    metaBarText: normalizeHexColor(incoming.metaBarText, DEFAULT_PRESCRIPTION_STYLE.metaBarText),
    sectionTitleColor: normalizeHexColor(
      incoming.sectionTitleColor,
      DEFAULT_PRESCRIPTION_STYLE.sectionTitleColor
    ),
    enNameColor: normalizeHexColor(incoming.enNameColor, DEFAULT_PRESCRIPTION_STYLE.enNameColor),
    enQualificationColor: normalizeHexColor(
      incoming.enQualificationColor,
      DEFAULT_PRESCRIPTION_STYLE.enQualificationColor
    ),
    enSpecialtyColor: normalizeHexColor(
      incoming.enSpecialtyColor,
      DEFAULT_PRESCRIPTION_STYLE.enSpecialtyColor
    ),
    enHospitalColor: normalizeHexColor(
      incoming.enHospitalColor,
      DEFAULT_PRESCRIPTION_STYLE.enHospitalColor
    ),
    enAddressColor: normalizeHexColor(
      incoming.enAddressColor,
      DEFAULT_PRESCRIPTION_STYLE.enAddressColor
    ),
    urNameColor: normalizeHexColor(incoming.urNameColor, DEFAULT_PRESCRIPTION_STYLE.urNameColor),
    urQualificationColor: normalizeHexColor(
      incoming.urQualificationColor,
      DEFAULT_PRESCRIPTION_STYLE.urQualificationColor
    ),
    urSpecialtyColor: normalizeHexColor(
      incoming.urSpecialtyColor,
      DEFAULT_PRESCRIPTION_STYLE.urSpecialtyColor
    ),
    urHospitalColor: normalizeHexColor(
      incoming.urHospitalColor,
      DEFAULT_PRESCRIPTION_STYLE.urHospitalColor
    ),
    urAddressColor: normalizeHexColor(
      incoming.urAddressColor,
      DEFAULT_PRESCRIPTION_STYLE.urAddressColor
    ),
  };
}

export function normalizePrescriptionLayout(
  layout?: Array<Partial<PrescriptionLayoutSection>> | null
): PrescriptionLayoutSection[] {
  const incoming = Array.isArray(layout) ? layout : [];
  const byKey = new Map(
    incoming
      .filter((item) => item?.key)
      .map((item) => [item.key as PrescriptionLayoutSectionKey, item])
  );

  return DEFAULT_PRESCRIPTION_LAYOUT.map((defaults) => {
    const item = byKey.get(defaults.key);
    const column = (item?.column || defaults.column) as PrescriptionLayoutColumn;
    return {
      key: defaults.key,
      visible: typeof item?.visible === 'boolean' ? item.visible : defaults.visible,
      column: (['left', 'right', 'full'] as PrescriptionLayoutColumn[]).includes(column)
        ? column
        : defaults.column,
    };
  });
}

/** CSS custom properties for classic (and shared) print sheets. */
export function prescriptionStyleToCssVars(
  style: PrescriptionStyleSettings
): Record<string, string> {
  const normalized = normalizePrescriptionStyle(style);
  return {
    '--rx-en-margin-left': `${normalized.englishHeadingMarginLeft}mm`,
    '--rx-en-margin-right': `${normalized.englishHeadingMarginRight}mm`,
    '--rx-ur-margin-left': `${normalized.urduHeadingMarginLeft}mm`,
    '--rx-ur-margin-right': `${normalized.urduHeadingMarginRight}mm`,
    '--rx-en-font-size': `${normalized.englishHeadingFontSize}px`,
    '--rx-ur-font-size': `${normalized.urduHeadingFontSize}px`,
    '--rx-en-line-height': String(normalized.englishHeadingLineHeight),
    '--rx-ur-line-height': String(normalized.urduHeadingLineHeight),
    '--rx-line-gap': `${normalized.lineGap}mm`,
    '--rx-section-gap': `${normalized.sectionGap}mm`,
    '--rx-pad-top': `${normalized.pagePaddingTop}mm`,
    '--rx-pad-right': `${normalized.pagePaddingRight}mm`,
    '--rx-pad-bottom': `${normalized.pagePaddingBottom}mm`,
    '--rx-pad-left': `${normalized.pagePaddingLeft}mm`,
    '--rx-logo-scale': String(normalized.logoScale / 100),
    '--rx-logo-offset-x': `${normalized.logoOffsetX}mm`,
    '--rx-logo-offset-y': `${normalized.logoOffsetY}mm`,
    '--rx-med-row-gap': `${normalized.medicineRowGap}mm`,
    '--rx-med-font-size': `${normalized.medicineFontSize}px`,
    '--rx-accent': normalized.accentColor,
    '--rx-table-header-bg': normalized.tableHeaderBg,
    '--rx-table-border': normalized.tableBorderColor,
    '--rx-meta-bg': normalized.metaBarBg,
    '--rx-meta-text': normalized.metaBarText,
    '--rx-section-title': normalized.sectionTitleColor,
    '--rx-en-name': normalized.enNameColor,
    '--rx-en-qual': normalized.enQualificationColor,
    '--rx-en-spec': normalized.enSpecialtyColor,
    '--rx-en-hosp': normalized.enHospitalColor,
    '--rx-en-addr': normalized.enAddressColor,
    '--rx-ur-name': normalized.urNameColor,
    '--rx-ur-qual': normalized.urQualificationColor,
    '--rx-ur-spec': normalized.urSpecialtyColor,
    '--rx-ur-hosp': normalized.urHospitalColor,
    '--rx-ur-addr': normalized.urAddressColor,
  };
}

export const THEME_COLOR_PRESETS: Array<{
  id: string;
  name: string;
  accentColor: string;
  tableHeaderBg: string;
  tableBorderColor: string;
  metaBarBg: string;
  metaBarText: string;
  sectionTitleColor: string;
}> = [
  {
    id: 'classic-navy',
    name: 'Classic Navy',
    accentColor: '#1e3a5f',
    tableHeaderBg: '#e8eef5',
    tableBorderColor: '#8b95a3',
    metaBarBg: '#f1f5f9',
    metaBarText: '#0f172a',
    sectionTitleColor: '#0f172a',
  },
  {
    id: 'clinical-blue',
    name: 'Clinical Blue',
    accentColor: '#1d4ed8',
    tableHeaderBg: '#dbeafe',
    tableBorderColor: '#60a5fa',
    metaBarBg: '#eff6ff',
    metaBarText: '#1e3a8a',
    sectionTitleColor: '#1e40af',
  },
  {
    id: 'forest',
    name: 'Forest Green',
    accentColor: '#166534',
    tableHeaderBg: '#dcfce7',
    tableBorderColor: '#86efac',
    metaBarBg: '#f0fdf4',
    metaBarText: '#14532d',
    sectionTitleColor: '#166534',
  },
  {
    id: 'burgundy',
    name: 'Burgundy',
    accentColor: '#9f1239',
    tableHeaderBg: '#ffe4e6',
    tableBorderColor: '#fb7185',
    metaBarBg: '#fff1f2',
    metaBarText: '#881337',
    sectionTitleColor: '#9f1239',
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    accentColor: '#334155',
    tableHeaderBg: '#e2e8f0',
    tableBorderColor: '#94a3b8',
    metaBarBg: '#f8fafc',
    metaBarText: '#0f172a',
    sectionTitleColor: '#1e293b',
  },
];

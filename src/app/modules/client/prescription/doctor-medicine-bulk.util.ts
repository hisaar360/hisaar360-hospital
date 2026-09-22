import * as XLSX from 'xlsx';
import { downloadExcelWorkbook } from '../../../core/utils/excel-export.util';

export const DOCTOR_MEDICINE_BULK_MAX_ROWS = 500;
export const DOCTOR_MEDICINE_BULK_CHUNK_SIZE = 25;

export const DOCTOR_MEDICINE_TYPES = [
  'tablet',
  'capsule',
  'syrup',
  'injection',
  'drops',
  'cream',
  'ointment',
  'inhaler',
  'pcs',
] as const;

export type DoctorMedicineBulkDraft = {
  localId: string;
  name: string;
  type: string;
  error: string;
};

const COLUMN_ALIASES: Record<string, 'name' | 'type' | 'ignore'> = {
  'medicine name': 'name',
  medicinename: 'name',
  medicine_name: 'name',
  'product name': 'name',
  productname: 'name',
  name: 'name',
  type: 'type',
  unit: 'type',
  'medicine type': 'type',
  medicinetype: 'type',
};

const normalizeHeader = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cellToString = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(value).trim();
};

const normalizeType = (value: string): string => {
  const raw = value.trim().toLowerCase();
  if (!raw) return 'tablet';
  const match = DOCTOR_MEDICINE_TYPES.find((item) => item === raw);
  return match || raw;
};

export const createEmptyDoctorMedicineBulkRow = (
  defaults?: Partial<DoctorMedicineBulkDraft>
): DoctorMedicineBulkDraft => ({
  localId: `doc-med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  type: 'tablet',
  error: '',
  ...defaults,
});

export const downloadDoctorMedicineBulkTemplate = (): void => {
  downloadExcelWorkbook('hisaar360-doctor-medicines-template.xlsx', [
    {
      name: 'Medicines',
      columns: [
        { header: 'Medicine Name *', key: 'name' },
        { header: 'Type *', key: 'type' },
      ],
      rows: [
        { name: 'Paracetamol 500mg', type: 'tablet' },
        { name: 'Amoxicillin 250mg', type: 'capsule' },
        { name: 'ORS', type: 'pcs' },
      ],
    },
  ]);
};

export const validateDoctorMedicineBulkRows = (
  rows: DoctorMedicineBulkDraft[]
): DoctorMedicineBulkDraft[] => {
  const seen = new Set<string>();
  return rows.map((row) => {
    const name = row.name.trim();
    const type = normalizeType(row.type);
    let error = '';
    if (!name) {
      error = 'Medicine name is required';
    } else if (!type) {
      error = 'Type is required';
    } else {
      const key = `${type.toLowerCase()}::${name.toLowerCase()}`;
      if (seen.has(key)) {
        error = 'Duplicate medicine in file';
      } else {
        seen.add(key);
      }
    }
    return { ...row, name, type, error };
  });
};

export const parseDoctorMedicineBulkFile = async (file: File): Promise<DoctorMedicineBulkDraft[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('No sheet found in the uploaded file');
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!matrix.length) {
    throw new Error('The uploaded file is empty');
  }

  const headerRow = (matrix[0] || []).map(normalizeHeader);
  const nameIndex = headerRow.findIndex((header) => COLUMN_ALIASES[header] === 'name');
  const typeIndex = headerRow.findIndex((header) => COLUMN_ALIASES[header] === 'type');

  if (nameIndex < 0) {
    throw new Error('Missing required column: Medicine Name');
  }

  const drafts: DoctorMedicineBulkDraft[] = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i] || [];
    const name = cellToString(row[nameIndex]);
    const type = cellToString(typeIndex >= 0 ? row[typeIndex] : 'tablet');
    if (!name && !type) continue;
    drafts.push(
      createEmptyDoctorMedicineBulkRow({
        name,
        type: normalizeType(type || 'tablet'),
      })
    );
    if (drafts.length >= DOCTOR_MEDICINE_BULK_MAX_ROWS) break;
  }

  if (!drafts.length) {
    throw new Error('No medicine rows found in the file');
  }

  return validateDoctorMedicineBulkRows(drafts);
};

import { resolveGynaePrintLayout } from './gynae-print-routing';
import { PrescriptionTemplate } from '../../../shared/models/hospital.model';
import { SpecialtyTemplateKey } from './prescription-specialty-print';

export interface ClinicalRxPrintPage {
  isFirstPage: boolean;
  isLastPage: boolean;
  pageNumber: number;
  totalPages: number;
  medicines: Array<Record<string, unknown>>;
  medicineOffset: number;
  gynaeExtendedRows: Array<{ label: string; value: string; wide?: boolean }>;
  showGynaeExtendedTitle: boolean;
}

export interface ClinicalRxPrintLayoutInput {
  medicines: Array<Record<string, unknown>>;
  specialtySection: string;
  prescriptionTemplate?: string;
  gynaeConsultationRows: Array<{ label: string; value: string }>;
  gynaeSidebarRows: Array<{ label: string; value: string; wide?: boolean }>;
  gynaeExtendedRows: Array<{ label: string; value: string; wide?: boolean }>;
  ivFluids: Array<unknown>;
  labTests: Array<unknown>;
  patientNote: string;
}

function usesGynaeWomensHealthPagination(
  specialtySection: string,
  prescriptionTemplate?: string
): boolean {
  return (
    resolveGynaePrintLayout(
      specialtySection as SpecialtyTemplateKey,
      prescriptionTemplate as PrescriptionTemplate
    ) === 'gynae-womens-health'
  );
}

function usesGynaeClinicalPagination(
  specialtySection: string,
  prescriptionTemplate?: string
): boolean {
  return (
    resolveGynaePrintLayout(
      specialtySection as SpecialtyTemplateKey,
      prescriptionTemplate as PrescriptionTemplate
    ) === 'gynae-clinical'
  );
}

function usesGynaeModernPagination(
  specialtySection: string,
  prescriptionTemplate?: string
): boolean {
  return (
    resolveGynaePrintLayout(
      specialtySection as SpecialtyTemplateKey,
      prescriptionTemplate as PrescriptionTemplate
    ) === 'gynae-modern'
  );
}

function buildGynaeModernPrintPages(
  medicines: Array<Record<string, unknown>>,
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>
): ClinicalRxPrintPage[] {
  return buildGynaeCompactPreviewPrintPages(medicines, extendedRows);
}

type GynaeExtendedChunk = {
  rows: Array<{ label: string; value: string; wide?: boolean }>;
  showTitle: boolean;
};

function firstPageMedicineCapacity(input: ClinicalRxPrintLayoutInput): number {
  // Keep typical OPD Rx on page 1; only paginate when content is genuinely long.
  const isGynae = input.specialtySection === 'gynae';
  let capacity = isGynae ? 8 : 10;

  if (isGynae && input.gynaeExtendedRows.length > 10) {
    capacity -= 2;
  }

  if (input.labTests.length > 8) {
    capacity -= 1;
  }

  if (input.ivFluids.length > 3) {
    capacity -= 1;
  }

  if ((input.patientNote || '').length > 220) {
    capacity -= 1;
  }

  return Math.max(5, capacity);
}

function lastPageMedicineCapacity(extendedRowCount: number): number {
  if (extendedRowCount > 10) {
    return 3;
  }

  if (extendedRowCount > 6) {
    return 5;
  }

  if (extendedRowCount > 3) {
    return 6;
  }

  return 8;
}

function extendedRowWeight(row: { label: string; value: string; wide?: boolean }): number {
  if (row.wide) {
    return 4;
  }

  const length = String(row.value || '').trim().length;
  if (length > 100) {
    return 4;
  }

  if (length > 50) {
    return 2;
  }

  return 1;
}

function chunkWeight(rows: Array<{ label: string; value: string; wide?: boolean }>): number {
  return rows.reduce((total, row) => total + extendedRowWeight(row), 0);
}

function chunkGynaeExtendedRows(
  rows: Array<{ label: string; value: string; wide?: boolean }>
): GynaeExtendedChunk[] {
  if (!rows.length) {
    return [];
  }

  const PAGE_WEIGHT = 10;
  const LAST_PAGE_WEIGHT = 7;
  const chunks: GynaeExtendedChunk[] = [];
  let current: Array<{ label: string; value: string; wide?: boolean }> = [];
  let weight = 0;

  const pushCurrent = () => {
    if (!current.length) {
      return;
    }

    chunks.push({
      rows: current,
      showTitle: chunks.length === 0,
    });
    current = [];
    weight = 0;
  };

  rows.forEach((row, rowIndex) => {
    const rowWeight = extendedRowWeight(row);
    const remaining = rows.slice(rowIndex);
    const remainingWeight = chunkWeight(remaining);
    const limit =
      remainingWeight === rowWeight && chunks.length > 0 ? LAST_PAGE_WEIGHT : PAGE_WEIGHT;

    if (current.length > 0 && weight + rowWeight > limit) {
      pushCurrent();
    }

    current.push(row);
    weight += rowWeight;
  });

  pushCurrent();

  while (chunks.length > 1) {
    const lastChunk = chunks[chunks.length - 1];
    if (chunkWeight(lastChunk.rows) <= LAST_PAGE_WEIGHT || lastChunk.rows.length <= 1) {
      break;
    }

    const previousChunk = chunks[chunks.length - 2];
    const movedRow = lastChunk.rows.shift();
    if (!movedRow) {
      break;
    }

    previousChunk.rows.push(movedRow);
  }

  return chunks;
}

function chunkMedicines(
  medicines: Array<Record<string, unknown>>,
  firstCap: number,
  continuationCap: number,
  lastCap: number
): Array<Record<string, unknown>[]> {
  if (!medicines.length) {
    return [[]];
  }

  const chunks: Array<Record<string, unknown>[]> = [];
  let index = 0;

  chunks.push(medicines.slice(0, firstCap));
  index = firstCap;

  while (index < medicines.length) {
    const remaining = medicines.length - index;

    if (remaining <= lastCap) {
      chunks.push(medicines.slice(index));
      break;
    }

    if (remaining <= lastCap + continuationCap) {
      const middleSize = remaining - lastCap;
      if (middleSize > 0) {
        chunks.push(medicines.slice(index, index + middleSize));
        index += middleSize;
      }

      chunks.push(medicines.slice(index));
      break;
    }

    chunks.push(medicines.slice(index, index + continuationCap));
    index += continuationCap;
  }

  return chunks;
}

function medicineOffsetForChunk(chunks: Array<Record<string, unknown>[]>, chunkIndex: number): number {
  return chunks.slice(0, chunkIndex).reduce((total, chunk) => total + chunk.length, 0);
}

function finalizePages(pages: ClinicalRxPrintPage[]): ClinicalRxPrintPage[] {
  const totalPages = pages.length;
  pages.forEach((page, index) => {
    page.pageNumber = index + 1;
    page.totalPages = totalPages;
    page.isLastPage = index === totalPages - 1;
  });

  return pages;
}

function buildMedicinePages(
  medicines: Array<Record<string, unknown>>,
  firstCap: number,
  continuationCap: number,
  lastCap: number
): ClinicalRxPrintPage[] {
  const medicineChunks =
    medicines.length > 0 ? chunkMedicines(medicines, firstCap, continuationCap, lastCap) : [];

  if (!medicineChunks.length) {
    return [
      {
        isFirstPage: true,
        isLastPage: false,
        pageNumber: 1,
        totalPages: 0,
        medicines: [],
        medicineOffset: 0,
        gynaeExtendedRows: [],
        showGynaeExtendedTitle: false,
      },
    ];
  }

  return medicineChunks.map((chunk, index) => ({
    isFirstPage: index === 0,
    isLastPage: false,
    pageNumber: index + 1,
    totalPages: 0,
    medicines: chunk,
    medicineOffset: medicineOffsetForChunk(medicineChunks, index),
    gynaeExtendedRows: [],
    showGynaeExtendedTitle: false,
  }));
}

function distributeGynaeExtendedRows(
  pages: ClinicalRxPrintPage[],
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>,
  medicineCount: number
): ClinicalRxPrintPage[] {
  const extendedChunks = chunkGynaeExtendedRows(extendedRows);

  if (!extendedChunks.length) {
    return pages;
  }

  if (!pages.length) {
    pages.push({
      isFirstPage: true,
      isLastPage: false,
      pageNumber: 1,
      totalPages: 0,
      medicines: [],
      medicineOffset: 0,
      gynaeExtendedRows: [],
      showGynaeExtendedTitle: false,
    });
  }

  const [firstChunk, ...remainingChunks] = extendedChunks;
  pages[0].gynaeExtendedRows = firstChunk.rows;
  pages[0].showGynaeExtendedTitle = firstChunk.showTitle;

  remainingChunks.forEach((chunk) => {
    pages.push({
      isFirstPage: false,
      isLastPage: false,
      pageNumber: pages.length + 1,
      totalPages: 0,
      medicines: [],
      medicineOffset: medicineCount,
      gynaeExtendedRows: chunk.rows,
      showGynaeExtendedTitle: chunk.showTitle,
    });
  });

  return pages;
}

function appendExtendedPages(
  pages: ClinicalRxPrintPage[],
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>,
  medicineCount: number
): ClinicalRxPrintPage[] {
  if (!extendedRows.length) {
    return pages;
  }

  // Keep all OBS/specialty details on one structured continuation page (avoid empty sheets).
  pages.push({
    isFirstPage: false,
    isLastPage: false,
    pageNumber: pages.length + 1,
    totalPages: 0,
    medicines: [],
    medicineOffset: medicineCount,
    gynaeExtendedRows: extendedRows,
    showGynaeExtendedTitle: true,
  });

  return pages;
}

function pruneEmptyPrintPages(pages: ClinicalRxPrintPage[]): ClinicalRxPrintPage[] {
  const pruned = pages.filter(
    (page, index) =>
      page.medicines.length > 0 ||
      page.gynaeExtendedRows.length > 0 ||
      (index === 0 && pages.length === 1)
  );

  return pruned.length ? pruned : pages.slice(0, 1);
}

function buildGynaeCompactPreviewPrintPages(
  medicines: Array<Record<string, unknown>>,
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>
): ClinicalRxPrintPage[] {
  const medicineCap = 12;

  if (medicines.length <= medicineCap) {
    return finalizePages([
      {
        isFirstPage: true,
        isLastPage: true,
        pageNumber: 1,
        totalPages: 1,
        medicines,
        medicineOffset: 0,
        gynaeExtendedRows: extendedRows,
        showGynaeExtendedTitle: extendedRows.length > 0,
      },
    ]);
  }

  const medicineChunks = chunkMedicines(medicines, medicineCap, 10, 12);
  const pages: ClinicalRxPrintPage[] = medicineChunks.map((chunk, index) => ({
    isFirstPage: index === 0,
    isLastPage: false,
    pageNumber: index + 1,
    totalPages: 0,
    medicines: chunk,
    medicineOffset: medicineOffsetForChunk(medicineChunks, index),
    gynaeExtendedRows: index === 0 ? extendedRows : [],
    showGynaeExtendedTitle: index === 0 && extendedRows.length > 0,
  }));

  return finalizePages(pages);
}

function buildGynaeWomensHealthPrintPages(
  medicines: Array<Record<string, unknown>>,
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>
): ClinicalRxPrintPage[] {
  const medicineCap = 10;

  if (medicines.length <= medicineCap) {
    return finalizePages([
      {
        isFirstPage: true,
        isLastPage: true,
        pageNumber: 1,
        totalPages: 1,
        medicines,
        medicineOffset: 0,
        gynaeExtendedRows: extendedRows,
        showGynaeExtendedTitle: extendedRows.length > 0,
      },
    ]);
  }

  const medicineChunks = chunkMedicines(medicines, medicineCap, 10, 12);
  const pages: ClinicalRxPrintPage[] = medicineChunks.map((chunk, index) => ({
    isFirstPage: index === 0,
    isLastPage: false,
    pageNumber: index + 1,
    totalPages: 0,
    medicines: chunk,
    medicineOffset: medicineOffsetForChunk(medicineChunks, index),
    gynaeExtendedRows: index === 0 ? extendedRows : [],
    showGynaeExtendedTitle: index === 0 && extendedRows.length > 0,
  }));

  return finalizePages(pages);
}

function buildGynaeClinicalPrintPages(
  medicines: Array<Record<string, unknown>>,
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>
): ClinicalRxPrintPage[] {
  return buildGynaeCompactPreviewPrintPages(medicines, extendedRows);
}

function buildGynaePrintPages(
  medicines: Array<Record<string, unknown>>,
  extendedRows: Array<{ label: string; value: string; wide?: boolean }>
): ClinicalRxPrintPage[] {
  const firstMedicineCap = 5;
  const extendedWeight = extendedRows.reduce((total, row) => total + extendedRowWeight(row), 0);
  const fitsSinglePage =
    medicines.length <= 6 && extendedRows.length <= 16 && extendedWeight <= 20;

  if (fitsSinglePage) {
    return finalizePages([
      {
        isFirstPage: true,
        isLastPage: true,
        pageNumber: 1,
        totalPages: 1,
        medicines,
        medicineOffset: 0,
        gynaeExtendedRows: extendedRows,
        showGynaeExtendedTitle: extendedRows.length > 0,
      },
    ]);
  }

  const medicineChunks =
    medicines.length > firstMedicineCap
      ? chunkMedicines(medicines, firstMedicineCap, 8, 10)
      : [medicines];

  const pages: ClinicalRxPrintPage[] = medicineChunks.map((chunk, index) => ({
    isFirstPage: index === 0,
    isLastPage: false,
    pageNumber: index + 1,
    totalPages: 0,
    medicines: chunk,
    medicineOffset: medicineOffsetForChunk(medicineChunks, index),
    gynaeExtendedRows: [],
    showGynaeExtendedTitle: false,
  }));

  if (!pages.length) {
    pages.push({
      isFirstPage: true,
      isLastPage: false,
      pageNumber: 1,
      totalPages: 0,
      medicines: [],
      medicineOffset: 0,
      gynaeExtendedRows: [],
      showGynaeExtendedTitle: false,
    });
  }

  return finalizePages(distributeGynaeExtendedRows(pages, extendedRows, medicines.length));
}

export function buildClinicalRxPrintPages(input: ClinicalRxPrintLayoutInput): ClinicalRxPrintPage[] {
  const medicines = input.medicines || [];
  const extendedRows = input.gynaeExtendedRows || [];

  // Prefer 1 page; use page 2 only when medicines overflow OR OBS block is large.
  // Never emit empty sheets.
  const firstCap = firstPageMedicineCapacity(input);
  const continuationCap = 12;
  // Keep room for OBS on last medicine page when packing together.
  const lastCap = Math.max(6, lastPageMedicineCapacity(extendedRows.length));

  const needsDedicatedObsPage =
    input.specialtySection === 'gynae' && extendedRows.length > 8;

  const fitsSinglePage =
    medicines.length <= firstCap &&
    !needsDedicatedObsPage &&
    extendedRows.length <= 8;

  if (fitsSinglePage) {
    return finalizePages([
      {
        isFirstPage: true,
        isLastPage: true,
        pageNumber: 1,
        totalPages: 1,
        medicines,
        medicineOffset: 0,
        gynaeExtendedRows: extendedRows,
        showGynaeExtendedTitle: extendedRows.length > 0,
      },
    ]);
  }

  // Medicines across page(s); OBS either on last medicine page or one dedicated page.
  const medicineChunks = chunkMedicines(
    medicines,
    needsDedicatedObsPage ? firstCap : Math.min(firstCap, lastCap),
    continuationCap,
    needsDedicatedObsPage ? continuationCap : lastCap
  );

  let pages: ClinicalRxPrintPage[] = medicineChunks.map((chunk, index) => ({
    isFirstPage: index === 0,
    isLastPage: false,
    pageNumber: index + 1,
    totalPages: 0,
    medicines: chunk,
    medicineOffset: medicineOffsetForChunk(medicineChunks, index),
    gynaeExtendedRows: [],
    showGynaeExtendedTitle: false,
  }));

  if (!pages.length) {
    pages = [
      {
        isFirstPage: true,
        isLastPage: false,
        pageNumber: 1,
        totalPages: 0,
        medicines: [],
        medicineOffset: 0,
        gynaeExtendedRows: [],
        showGynaeExtendedTitle: false,
      },
    ];
  }

  if (extendedRows.length > 0) {
    if (needsDedicatedObsPage) {
      appendExtendedPages(pages, extendedRows, medicines.length);
    } else {
      pages[pages.length - 1].gynaeExtendedRows = extendedRows;
      pages[pages.length - 1].showGynaeExtendedTitle = true;
    }
  }

  return finalizePages(pruneEmptyPrintPages(pages));
}

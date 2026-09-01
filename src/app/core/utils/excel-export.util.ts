import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
}

export interface ExcelSheet {
  name: string;
  columns: ExcelColumn[];
  rows: Array<Record<string, unknown> | object>;
}

export const downloadExcelWorkbook = (filename: string, sheets: ExcelSheet[]): void => {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const headerRow = sheet.columns.map((column) => column.header);
    const dataRows = sheet.rows.map((row) =>
      sheet.columns.map((column) => (row as Record<string, unknown>)[column.key] ?? '')
    );
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }

  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

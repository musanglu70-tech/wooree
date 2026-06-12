import * as XLSX from "xlsx";

export interface ExcelSheet {
  name: string;
  rows: Record<string, string | number>[];
}

export function formatYmd(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function formatYyyyMm(month: string): string {
  return month.replace("-", "");
}

export function downloadExcel(filename: string, sheets: ExcelSheet[]) {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ name, rows }) => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });

  XLSX.writeFile(workbook, filename);
}

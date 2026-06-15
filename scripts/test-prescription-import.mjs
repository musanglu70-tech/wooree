import * as XLSX from "xlsx";
import {
  parsePrescriptionExcel,
  downloadPrescriptionUploadTemplate,
} from "../lib/excel/prescription-import.ts";

const sheet = XLSX.utils.aoa_to_sheet([
  ["보험코드", "제품명", "단위", "처방횟수", "단가", "총사용량", "총금액"],
  ["합계", "", "", "0", "366", "4,265", "54,900"],
  ["650200400", "레보덴선경2.5mg", "1정", "3", "366", "4,265", "54,900"],
  ["A08503781", "애니탈삼중정(내복)", "1정", "218", "0", "4115", "0"],
]);

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, "처방입력");
const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

const rows = parsePrescriptionExcel(buffer);
if (rows.length !== 2) throw new Error(`expected 2 rows, got ${rows.length}`);
if (rows[0].code !== "650200400" || rows[0].totalAmount !== "54900") {
  throw new Error("row1 mismatch");
}
if (rows[1].code !== "A08503781" || rows[1].prescriptionCount !== "218") {
  throw new Error("row2 mismatch");
}

console.log("OK", rows);

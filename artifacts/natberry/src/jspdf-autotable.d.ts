declare module "jspdf-autotable" {
  import type jsPDF from "jspdf";

  interface AutoTableOptions {
    startY?: number;
    head?: (string | number)[][];
    body?: (string | number)[][];
    styles?: Record<string, unknown>;
    headStyles?: Record<string, unknown>;
    alternateRowStyles?: Record<string, unknown>;
    columnStyles?: Record<number, Record<string, unknown>>;
    margin?: Record<string, number>;
    [key: string]: unknown;
  }

  function autoTable(doc: jsPDF, options: AutoTableOptions): void;
  export default autoTable;
}

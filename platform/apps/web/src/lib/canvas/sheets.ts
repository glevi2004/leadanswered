/**
 * Spreadsheet data for the canvas sheet nodes. Native tables agents keep + you edit.
 * (Google Sheets / Excel import is a documented extension — see RESTRUCTURE / the
 * sheet node comment: a linked sheet would embed docs.google iframe or parse .xlsx.)
 */

export interface SheetData {
  title: string;
  columns: string[];
  rows: string[][];
}

export const SHEET_DATA: Record<string, SheetData> = {
  "finance-sheet": {
    title: "Cash Flow — 2026",
    columns: ["Month", "Invoiced", "Collected", "Expenses", "Net"],
    rows: [
      ["Jan", "$12,400", "$11,900", "$6,300", "$5,600"],
      ["Feb", "$9,800", "$9,800", "$5,100", "$4,700"],
      ["Mar", "$15,200", "$13,700", "$7,400", "$6,300"],
      ["Apr", "$18,600", "$16,100", "$8,050", "$8,050"],
      ["May", "$14,050", "$14,050", "$6,900", "$7,150"],
      ["Jun", "$21,300", "$18,400", "$9,200", "$9,200"],
    ],
  },
};

export const sheetData = (id: string): SheetData | undefined => SHEET_DATA[id];

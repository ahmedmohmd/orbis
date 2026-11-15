import type { Block, Column, ReportData, Row, RowKind } from "./types";

export const kindOf = (r: Row): RowKind | undefined => {
  const k = r.__k;
  return k === "group" || k === "head" || k === "total" ? k : undefined;
};

/** Rows of a table block: the report's own rows, or the template's starting rows when the report has none stored yet. */
export function tableRows(b: Block, data: ReportData): Row[] {
  const raw = data[b.key];
  const rows = Array.isArray(raw) ? (raw as Row[]) : raw === undefined ? b.defaultRows ?? [] : [];
  return rows.filter((r) => r && (kindOf(r) || Object.entries(r).some(([k, x]) => k !== "__k" && x !== "" && x != null)));
}

/** Only real data rows (no group titles / sub-headers) – used by formulas and charts. */
export const dataRows = (rows: Row[]) => rows.filter((r) => { const k = kindOf(r); return k !== "group" && k !== "head"; });

export const alignOf = (c: Column) => c.align ?? (c.type === "number" ? "right" : "left");

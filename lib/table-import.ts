import { slug, type Column, type Row, type RowKind } from "./types";
import type { Cell, Grid } from "./xlsx-read";

export interface ImportedTable {
  columns: Column[];
  rows: Row[];
  /** the sheet starts with its own title / sub-header rows → no separate header row is printed */
  hideHeader: boolean;
}

const has = (c?: Cell) => !!c && c.t.trim() !== "";
const isNum = (c?: Cell) => !!c && (c.num !== undefined || /^-?[\d,]*\.?\d+%?$/.test(c.t.trim()));

/**
 * Turns a sheet / pasted block into a table definition.
 * Recognises: the column header row, group titles (a row with a single filled cell or a merged title),
 * repeated sub-header rows, and bold / "Total…" rows. Numbers keep exactly the look they have in Excel.
 */
export function gridToTable(grid: Grid): ImportedTable {
  // trim empty rows / columns
  let rows = grid.filter((r) => r.some(has));
  const used: number[] = [];
  const width = Math.max(0, ...rows.map((r) => r.length));
  for (let c = 0; c < width; c++) if (rows.some((r) => has(r[c]))) used.push(c);
  rows = rows.map((r) => used.map((c) => r[c] ?? { t: "" }));
  const n = used.length;
  if (!rows.length || !n) return { columns: [], rows: [], hideHeader: false };

  const filled = (r: Cell[]) => r.filter(has).length;
  const isGroup = (r: Cell[]) => n > 1 && (filled(r) === 1 || (!!r[0].span && r[0].span >= Math.max(2, n - 1)));
  const isTextRow = (r: Cell[]) => filled(r) >= Math.min(2, n) && r.filter(has).every((c) => !isNum(c));

  let headerIdx = rows.findIndex((r) => !isGroup(r) && isTextRow(r));
  if (headerIdx < 0) headerIdx = 0;
  const before = rows.slice(0, headerIdx);
  const hideHeader = before.some(isGroup);
  const labels = rows[headerIdx].map((c, i) => c.t.trim() || `Column ${i + 1}`);

  const body = rows.slice(headerIdx + (hideHeader ? 0 : 1));
  const boldShare = body.filter((r) => r.some((c) => c.bold)).length / Math.max(1, body.length);
  const useBold = boldShare < 0.6;

  let prev: RowKind | "row" | undefined = before.length ? "group" : undefined;
  const kinds: (RowKind | undefined)[] = body.map((r, i) => {
    let k: RowKind | undefined;
    if (isGroup(r)) k = "group";
    else if (isTextRow(r) && (prev === "group" || (i === 0 && hideHeader) || (r.filter(has).every((c) => c.fill) && filled(r) > 1))) k = "head";
    else if ((useBold && r.filter(has).every((c) => c.bold)) || /^total\b/i.test(r[0].t.trim())) k = "total";
    prev = k ?? "row";
    return k;
  });
  // with a hidden header the leading rows (before the header) are group titles too
  const leading = hideHeader ? before : [];
  const all: { r: Cell[]; k?: RowKind }[] = [...leading.map((r) => ({ r, k: "group" as RowKind })), ...body.map((r, i) => ({ r, k: kinds[i] }))];
  if (hideHeader) {
    // the header row itself is the first sub-header
    const hi = all.findIndex((x) => x.r === rows[headerIdx]);
    if (hi >= 0) all[hi].k = "head";
  }

  // columns
  const keys: string[] = [];
  labels.forEach((l, i) => {
    let k = slug(l) || `col${i + 1}`, m = 2;
    while (keys.includes(k)) k = `${slug(l)}_${m++}`;
    keys.push(k);
  });
  const plain = all.filter((x) => !x.k || x.k === "total");
  const columns: Column[] = labels.map((label, i) => {
    const cells = plain.map((x) => x.r[i]).filter(has);
    const nums = cells.filter(isNum);
    const numeric = cells.length > 0 && nums.length >= Math.ceil(cells.length * 0.7);
    const uniform = numeric && nums.length === cells.length && nums.every((c) => c.num !== undefined && !c.t.includes("%"));
    const decs = uniform ? nums.map((c) => (c.t.split(".")[1] ?? "").length) : [];
    const avg = cells.length ? cells.reduce((a, c) => a + c.t.length, 0) / cells.length : 8;
    return {
      key: keys[i],
      label,
      type: uniform ? "number" : "text",
      width: Math.round(Math.min(3, Math.max(0.6, avg / 11)) * 10) / 10,
      ...(numeric && !uniform ? { align: "right" as const } : {}),
      ...(uniform ? { decimals: Math.max(...decs) } : {}),
    };
  });

  const out: Row[] = all.map(({ r, k }) => {
    if (k === "group") return { [keys[0]]: (r.find(has)?.t ?? "").trim(), __k: "group" };
    const row: Row = {};
    keys.forEach((key, i) => {
      const c = r[i];
      row[key] = columns[i].type === "number" && c?.num !== undefined ? c.num : (c?.t ?? "").trim();
    });
    if (k) row.__k = k;
    return row;
  });
  return { columns, rows: out, hideHeader };
}

/** Map rows of an imported sheet onto existing columns by position (used when filling a report). */
export function remapRows(imp: ImportedTable, columns: Column[]): Row[] {
  const from = imp.columns.map((c) => c.key);
  return imp.rows.map((r) => {
    if (r.__k === "group") return { [columns[0]?.key ?? from[0]]: r[from[0]], __k: "group" };
    const o: Row = {};
    columns.forEach((c, i) => {
      const v = r[from[i]];
      o[c.key] = c.type === "number" ? (v === "" || v == null ? "" : typeof v === "number" ? v : Number(String(v).replace(/,/g, "")) || "") : v == null ? "" : typeof v === "number" ? String(v) : v;
    });
    if (r.__k) o.__k = r.__k;
    return o;
  });
}

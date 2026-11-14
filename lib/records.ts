import { allBlocks } from "./formula";
import type { Block, RecordField, ReportData, Row, TemplateSchema } from "./types";

export type Entry = Record<string, unknown>;

export const isVisible = (f: RecordField, entry: Entry): boolean =>
  !f.showIf || String(entry[f.showIf.key] ?? "") === f.showIf.equals;

export const visibleFields = (fields: RecordField[], entry: Entry) => fields.filter((f) => isVisible(f, entry));

/** For a records block: the field definitions and entries to use (follows `linkTo`). */
export function resolveRecords(b: Block, t: TemplateSchema, data: ReportData): { fields: RecordField[]; rows: Entry[]; source: Block } {
  let src = b;
  if (b.linkTo) {
    src = allBlocks(t).find((x) => x.key === b.linkTo && x.type === "records") ?? b;
  }
  const raw = data[src.key];
  const rows = (Array.isArray(raw) ? (raw as Entry[]) : []).filter((e) => e && typeof e === "object");
  return { fields: src.fields ?? [], rows, source: src };
}

const text = (v: unknown) => (v == null ? "" : String(v));

/** One-line text for a scalar value of an entry. */
export function scalarText(f: RecordField, v: unknown): string {
  if (f.type === "boolean") return v === true ? "Yes" : v === false ? "No" : "";
  if (f.type === "date") {
    const m = text(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : text(v);
  }
  return text(v);
}

export const imagesOf = (v: unknown): { src: string; caption?: string }[] =>
  (Array.isArray(v) ? v : v && typeof v === "object" ? [v] : []).filter((i): i is { src: string; caption?: string } => !!i && typeof (i as { src?: unknown }).src === "string" && !!(i as { src: string }).src);

export const groupOf = (v: unknown): Entry[] => (Array.isArray(v) ? (v as Entry[]).filter((e) => e && typeof e === "object") : []);

/** Table view of a records block: one row per entry using the scalar fields (+ a list of group members). */
export function recordsTable(fields: RecordField[], rows: Entry[]): { columns: { key: string; label: string }[]; rows: Row[] } {
  const scalars = fields.filter((f) => f.type !== "image" && f.type !== "group");
  const groups = fields.filter((f) => f.type === "group");
  const columns = [
    { key: "__n", label: "#" },
    ...scalars.map((f) => ({ key: f.key, label: f.label })),
    ...groups.map((g) => ({ key: g.key, label: g.label })),
  ];
  const out = rows.map((e, i) => {
    const r: Row = { __n: i + 1 };
    for (const f of scalars) r[f.key] = isVisible(f, e) ? scalarText(f, e[f.key]) : "";
    for (const g of groups) {
      const sub = g.fields ?? [];
      const first = sub.find((f) => f.type === "text") ?? sub[0];
      const pillField = sub.find((f) => f.pill);
      r[g.key] = groupOf(e[g.key])
        .map((m) => `${first ? text(m[first.key]) : ""}${pillField && m[pillField.key] ? ` (${text(m[pillField.key])})` : ""}`.trim())
        .filter(Boolean)
        .join("\n");
    }
    return r;
  });
  return { columns, rows: out };
}

export const hasPhotos = (fields: RecordField[]): boolean => fields.some((f) => f.type === "image" || (f.type === "group" && hasPhotos(f.fields ?? [])));

export function emptyEntry(fields: RecordField[]): Entry {
  const e: Entry = {};
  for (const f of fields) e[f.key] = f.type === "group" ? [] : f.type === "image" ? [] : f.type === "boolean" ? false : "";
  return e;
}

/* ---------------------------- presets ---------------------------- */

export const INDUCTION_FIELDS: RecordField[] = [
  { key: "date", label: "Date", type: "date" },
  { key: "by", label: "Conducted by", type: "text" },
  { key: "doc_photo", label: "Induction document photo", type: "image", maxImages: 1 },
  { key: "group_photo", label: "Induction persons photo", type: "image", maxImages: 1 },
  {
    key: "persons",
    label: "Persons inducted",
    type: "group",
    itemLabel: "person",
    fields: [
      { key: "name", label: "Full name", type: "text" },
      { key: "karm", label: "Worker status", type: "select", options: ["In Karm", "Out of Karm"], pill: true },
      { key: "id_number", label: "National ID number", type: "text", showIf: { key: "karm", equals: "Out of Karm" } },
      { key: "id_front", label: "National ID – front", type: "image", maxImages: 1, showIf: { key: "karm", equals: "Out of Karm" } },
      { key: "id_back", label: "National ID – back", type: "image", maxImages: 1, showIf: { key: "karm", equals: "Out of Karm" } },
    ],
  },
];

export const visitorFieldsPreset: RecordField[] = [
  { key: "date", label: "Date", type: "date" },
  { key: "names", label: "Names", type: "textarea" },
  { key: "reason", label: "Reason", type: "text" },
  { key: "photos", label: "Photos", type: "image" },
];

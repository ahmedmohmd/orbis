/**
 * The whole report is described by a TemplateSchema (stored as JSONB in Postgres).
 * Reports only store *values*, keyed by block.key – so editing the template
 * (add / remove / rename sections and fields) instantly applies to every report.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "percent"
  | "date"
  | "select"
  | "boolean"
  | "list"
  | "table"
  | "records"
  | "image"
  | "computed"
  | "chart"
  | "heading"
  | "annex";

export const FIELD_TYPES: { value: FieldType; label: string; hint: string }[] = [
  { value: "text", label: "Short text", hint: "One line of text" },
  { value: "textarea", label: "Paragraph", hint: "Multi-line text" },
  { value: "number", label: "Number", hint: "Value with optional unit (kWh, L, MW…)" },
  { value: "percent", label: "Percentage", hint: "0–100 %, can be shown as a ring" },
  { value: "date", label: "Date", hint: "A calendar date" },
  { value: "select", label: "Dropdown", hint: "One option from a list" },
  { value: "boolean", label: "Yes / No", hint: "Toggle" },
  { value: "list", label: "Bullet list", hint: "A list of short items" },
  { value: "table", label: "Table", hint: "Rows & columns you define" },
  { value: "records", label: "Entries log", hint: "Add entries over the month – each with its own fields, photos and nested lists" },
  { value: "image", label: "Images", hint: "Photos, scans, permits…" },
  { value: "computed", label: "Calculated", hint: "Formula based on other fields" },
  { value: "chart", label: "Chart", hint: "Chart drawn from a table or from fields" },
  { value: "heading", label: "Sub-heading", hint: "Divider with a title" },
  { value: "annex", label: "Annex", hint: "A numbered annex with its own fields – numbering is automatic and can be referenced from any text" },
];

export type ColumnType = "text" | "number" | "date" | "select" | "status";

export interface Column {
  key: string;
  label: string;
  type: ColumnType;
  options?: string[];
  /** relative width hint (1 = default) */
  width?: number;
}

/** A field inside an "Entries log" entry (or inside a nested list of an entry). */
export type RecordFieldType = "text" | "textarea" | "number" | "date" | "select" | "boolean" | "image" | "group";

export interface RecordField {
  key: string;
  label: string;
  type: RecordFieldType;
  options?: string[];
  /** image: 1 = single photo, otherwise how many (undefined = unlimited) */
  maxImages?: number;
  /** only show (and export) this field when another field of the same entry has this value */
  showIf?: { key: string; equals: string };
  /** group: nested list of sub-entries (e.g. the persons of one induction) */
  fields?: RecordField[];
  /** group: noun used on the "Add" button, e.g. "person" */
  itemLabel?: string;
  /** show as a coloured pill in the exported report (select fields) */
  pill?: boolean;
}

export type ChartKind =
  | "bar"
  | "stackedbar"
  | "hbar"
  | "line"
  | "area"
  | "donut"
  | "gauge"
  | "riskmatrix";

export interface ChartConfig {
  kind: ChartKind;
  title?: string;
  /** where the data comes from */
  source: "table" | "fields";
  /* table source */
  table?: string;
  x?: string;
  series?: { key: string; label?: string; color?: string }[];
  /* fields source – every item value is a formula, e.g. "{pv_energy}" or "{total}-{pv}" */
  items?: { label: string; value: string; color?: string }[];
  max?: number;
  unit?: string;
  height?: number;
  /* risk matrix */
  probKey?: string;
  impactKey?: string;
}

export type BlockWidth = "full" | "half" | "third" | "quarter";
export type BlockDisplay = "inline" | "card" | "ring" | "callout";

export interface Block {
  id: string;
  /** unique machine key – values are stored under this key */
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  unit?: string;
  decimals?: number;
  width?: BlockWidth;
  display?: BlockDisplay;
  options?: string[];
  columns?: Column[];
  /** records: the fields of one entry */
  fields?: RecordField[];
  /** records: noun for the Add button, e.g. "induction" */
  itemLabel?: string;
  /** records: how the export shows them */
  view?: "table" | "cards" | "both";
  /** records: read the entries of another records block (key) instead of having its own data */
  linkTo?: string;
  /** image: 1 = a single photo, undefined = unlimited */
  maxImages?: number;
  /** image / annex: text under the picture or under the title. Supports {{field_key}} and {{annex:key}} */
  caption?: string;
  /** annex: subtitle */
  description?: string;
  /** annex: fields inside the annex */
  children?: Block[];
  /** annex: "end" = collected after the last section (default), "here" = printed right where it is defined */
  placement?: "end" | "here";
  /** image: show a framed empty slot in the export when nothing is attached */
  slot?: boolean;
  compact?: boolean;
  formula?: string;
  chart?: ChartConfig;
  hideInExport?: boolean;
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  pageBreak?: boolean;
  blocks: Block[];
}

export interface Brand {
  companyName: string;
  logoText: string;
  accent: string;
  accent2: string;
  footer: string;
  /** colour theme preset id (see lib/themes.ts) or "custom" */
  theme?: string;
}

/** Layout & export options of the report (edited on the Settings page). */
export interface ReportSettings {
  paper?: "A4" | "Letter";
  coverStyle?: "rays" | "waves" | "clean";
  showToc?: boolean;
  showGlance?: boolean;
  showPageNumbers?: boolean;
  /** header text on every page; empty = "<title> · <period>" */
  headerText?: string;
  /** attach the original photos inside the exported PDF */
  attachPhotos?: boolean;
  /** print the "photos are attached" note and the file names under photos */
  photoNames?: boolean;
}

/** A big number / ring on the "At a glance" page. `value` is a formula, e.g. "{total_energy}" */
export interface Highlight {
  id: string;
  label: string;
  value: string;
  unit?: string;
  decimals?: number;
  look?: "number" | "ring";
  sub?: string;
}

export interface TemplateSchema {
  version: 1;
  /** big numbers on the "At a glance" page (page is skipped when empty) */
  highlights?: Highlight[];
  reportTitle: string;
  brand: Brand;
  settings?: ReportSettings;
  /** fields shown on the cover page */
  cover: Block[];
  sections: Section[];
}

export type Row = Record<string, string | number>;
export interface ImageItem {
  src: string;
  caption?: string;
}
export type ReportData = Record<string, unknown>;

export const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
  ).slice(0, 12);

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "field";

import { allBlocks, blockNumber, formatNumber } from "./formula";
import type { Block, ReportData, Section, TemplateSchema } from "./types";

export interface AnnexInfo {
  block: Block;
  /** 1-based, automatic – follows the order of the annexes in the template */
  number: number;
  section: Section;
  sectionIndex: number;
  placement: "end" | "here";
}

/** All annexes in reading order (section 1 first …). Numbers are assigned here – never stored. */
export function annexList(t: TemplateSchema): AnnexInfo[] {
  const out: AnnexInfo[] = [];
  t.sections.forEach((section, sectionIndex) => {
    for (const block of section.blocks)
      if (block.type === "annex") out.push({ block, number: out.length + 1, section, sectionIndex, placement: block.placement ?? "end" });
  });
  return out;
}

export const annexNumbers = (t: TemplateSchema): Map<string, number> => new Map(annexList(t).map((a) => [a.block.key, a.number]));

const TOKEN = /\{\{\s*([a-z0-9_:]+)\s*\}\}/gi;

/**
 * Resolve {{annex:key}} → "Annex 3" and {{field_key}} → the formatted value of that field.
 * Works in labels, captions and – for annex references only – in all report text, so
 * "see {{annex:daily_checklist}}" always shows the right number, even after annexes are reordered.
 */
export function makeTokenResolver(t: TemplateSchema, data: ReportData) {
  const nums = annexNumbers(t);
  const blocks = new Map(allBlocks(t).map((b) => [b.key, b]));
  const fieldText = (key: string): string | null => {
    const b = blocks.get(key);
    if (!b) return null;
    if (b.type === "number" || b.type === "percent" || b.type === "computed") {
      const n = blockNumber(b, t, data);
      return n === null ? "—" : `${formatNumber(n, b.decimals)}${b.type === "percent" ? "%" : b.unit ? " " + b.unit : ""}`;
    }
    const v = data[key];
    return v == null || v === "" ? "—" : String(v);
  };
  return (text: string, opts: { fields?: boolean } = {}): string =>
    text.replace(TOKEN, (m, ref: string) => {
      if (ref.toLowerCase().startsWith("annex:")) {
        const n = nums.get(ref.slice(6));
        return n ? `Annex ${n}` : "Annex ?";
      }
      if (opts.fields === false) return m;
      return fieldText(ref) ?? m;
    });
}

/**
 * Returns copies of the template and data where every token is resolved,
 * so the renderers (HTML and Word) never have to know about tokens.
 */
export function resolveTokens(t: TemplateSchema, data: ReportData): { t: TemplateSchema; data: ReportData } {
  const r = makeTokenResolver(t, data);
  const mapBlock = (b: Block): Block => ({
    ...b,
    label: r(b.label),
    ...(b.caption ? { caption: r(b.caption) } : {}),
    ...(b.description ? { description: r(b.description) } : {}),
    ...(b.help ? { help: r(b.help) } : {}),
    ...(b.children ? { children: b.children.map(mapBlock) } : {}),
  });
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return v.includes("{{") ? r(v, { fields: false }) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return {
    t: {
      ...t,
      cover: t.cover.map(mapBlock),
      sections: t.sections.map((s) => ({ ...s, title: r(s.title), ...(s.description ? { description: r(s.description) } : {}), blocks: s.blocks.map(mapBlock) })),
      highlights: t.highlights?.map((h) => ({ ...h, label: r(h.label), ...(h.sub ? { sub: r(h.sub) } : {}) })),
    },
    data: walk(data) as ReportData,
  };
}

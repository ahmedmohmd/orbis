/**
 * Tiny .xlsx reader (no dependencies) – runs in the browser (DecompressionStream) and in Node 18+.
 * Returns the cells as they LOOK in Excel (number formats applied) plus bold / fill / merge info,
 * which the table importer uses to recognise group titles, sub-headers and total rows.
 */
export interface Cell {
  t: string;
  /** raw number when the cell holds a number */
  num?: number;
  bold?: boolean;
  fill?: boolean;
  /** merged across this many columns (top-left cell only) */
  span?: number;
}
export type Grid = Cell[][];
export interface Sheet { name: string; grid: Grid }

const dec = new TextDecoder();
const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buf: ArrayBuffer): Promise<Map<string, () => Promise<string>>> {
  const b = new Uint8Array(buf);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("This is not an .xlsx file");
  const count = u16(b, eocd + 10);
  let p = u32(b, eocd + 16);
  const files = new Map<string, () => Promise<string>>();
  for (let n = 0; n < count; n++) {
    if (u32(b, p) !== 0x02014b50) break;
    const method = u16(b, p + 10), csize = u32(b, p + 20), nlen = u16(b, p + 28), xlen = u16(b, p + 30), clen = u16(b, p + 32), local = u32(b, p + 42);
    const name = dec.decode(b.subarray(p + 46, p + 46 + nlen));
    files.set(name, async () => {
      const lh = local + 30 + u16(b, local + 26) + u16(b, local + 28);
      const raw = b.subarray(lh, lh + csize);
      return dec.decode(method === 0 ? raw : await inflateRaw(raw));
    });
    p += 46 + nlen + xlen + clen;
  }
  return files;
}

const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, "&");
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const textOf = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unesc(m[1])).join("");

const colIndex = (ref: string) => {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
};

const BUILTIN: Record<number, string> = { 1: "0", 2: "0.00", 3: "#,##0", 4: "#,##0.00", 9: "0%", 10: "0.00%", 37: "#,##0", 38: "#,##0", 39: "#,##0.00", 40: "#,##0.00" };

/** Apply an Excel number format code to a number (the common cases: decimals, thousands separator, percent). */
export function formatByCode(n: number, code: string | undefined): string {
  const c = (code ?? "General").split(";")[0].replace(/"[^"]*"|\[[^\]]*\]|_.|\\./g, "");
  if (!code || /^general$/i.test(code.trim()) || /[dmyhs]/i.test(c.replace(/e\+?0+/i, "")) && !/[#0]/.test(c)) return String(Math.round(n * 1e10) / 1e10);
  const pct = c.includes("%");
  const v = pct ? n * 100 : n;
  const dec = (c.match(/\.([0#]+)/)?.[1] ?? "").length;
  const out = new Intl.NumberFormat("en-US", { minimumFractionDigits: (c.match(/\.(0+)/)?.[1] ?? "").length, maximumFractionDigits: dec, useGrouping: c.includes(",") }).format(v);
  return out + (pct ? "%" : "");
}

export async function readXlsx(buf: ArrayBuffer): Promise<Sheet[]> {
  const f = await unzip(buf);
  const get = async (name: string) => (f.has(name) ? f.get(name)!() : "");

  const shared = [...(await get("xl/sharedStrings.xml")).matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));

  const styles = await get("xl/styles.xml");
  const fmts = new Map<number, string>();
  for (const m of styles.matchAll(/<numFmt\s[^>]*>/g)) fmts.set(Number(attr(m[0], "numFmtId")), unesc(attr(m[0], "formatCode") ?? ""));
  const fonts = [...(styles.match(/<fonts[\s\S]*?<\/fonts>/)?.[0] ?? "").matchAll(/<font(?:\s[^>]*)?>([\s\S]*?)<\/font>/g)].map((m) => /<b(\s[^>]*)?\/>|<b>/.test(m[1]) && !/<b\s+val="0"/.test(m[1]));
  const fills = [...(styles.match(/<fills[\s\S]*?<\/fills>/)?.[0] ?? "").matchAll(/<fill>([\s\S]*?)<\/fill>/g)].map((m) => /patternType="solid"/.test(m[1]) && !/rgb="(FFFFFFFF|00FFFFFF)"|theme="0"/.test(m[1]));
  const xfsBlock = styles.match(/<cellXfs[\s\S]*?<\/cellXfs>/)?.[0] ?? "";
  const xfs = [...xfsBlock.matchAll(/<xf\s[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g)].map((m) => {
    const id = Number(attr(m[0], "numFmtId") ?? 0);
    return { code: fmts.get(id) ?? BUILTIN[id], bold: !!fonts[Number(attr(m[0], "fontId") ?? 0)], fill: !!fills[Number(attr(m[0], "fillId") ?? 0)] };
  });

  const wb = await get("xl/workbook.xml");
  const rels = await get("xl/_rels/workbook.xml.rels");
  const target = new Map([...rels.matchAll(/<Relationship\s[^>]*>/g)].map((m) => [attr(m[0], "Id")!, attr(m[0], "Target")!]));
  const sheets: Sheet[] = [];
  for (const m of wb.matchAll(/<sheet\s[^>]*>/g)) {
    const rid = attr(m[0], "r:id") ?? "";
    let path = target.get(rid) ?? "";
    path = path.startsWith("/") ? path.slice(1) : "xl/" + path;
    const xml = await get(path);
    if (!xml) continue;
    const grid: Grid = [];
    for (const rm of xml.matchAll(/<row\s[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const r = Number(attr(rm[0], "r") ?? grid.length + 1) - 1;
      const row: Cell[] = (grid[r] = grid[r] ?? []);
      for (const cm of (rm[1] ?? "").matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const tag = cm[1];
        const ci = colIndex(attr(tag, "r") ?? "A");
        const st = xfs[Number(attr(tag, "s") ?? 0)];
        const type = attr(tag, "t");
        const inner = cm[2] ?? "";
        const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let cell: Cell = { t: "" };
        if (type === "s") cell.t = shared[Number(v)] ?? "";
        else if (type === "inlineStr") cell.t = textOf(inner);
        else if (type === "str" || type === "e") cell.t = unesc(v ?? "");
        else if (type === "b") cell.t = v === "1" ? "TRUE" : "FALSE";
        else if (v !== undefined && v !== "") { const n = Number(v); cell = { t: formatByCode(n, st?.code), num: n }; }
        if (st?.bold && cell.t) cell.bold = true;
        if (st?.fill) cell.fill = true;
        row[ci] = cell;
      }
    }
    for (const mm of xml.matchAll(/<mergeCell\s[^>]*>/g)) {
      const [a, b] = (attr(mm[0], "ref") ?? "").split(":");
      if (!b) continue;
      const c = grid[Number(a.replace(/\D/g, "")) - 1]?.[colIndex(a)];
      if (c) c.span = colIndex(b) - colIndex(a) + 1;
    }
    for (let i = 0; i < grid.length; i++) grid[i] = Array.from(grid[i] ?? [], (c) => c ?? { t: "" });
    sheets.push({ name: unesc(attr(m[0], "name") ?? "Sheet"), grid: Array.from(grid, (r) => r ?? []) });
  }
  if (!sheets.length) throw new Error("No sheets found in this file");
  return sheets;
}

/** Text copied from Excel / Sheets (tab separated) or a CSV file. */
export function parseDelimited(text: string): Grid {
  const tab = text.includes("\t");
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  const sep = tab ? "\t" : ",";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"' && cur === "") q = true;
    else if (ch === sep) { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.map((r) => r.map((t) => { const s = t.trim(); const n = Number(s.replace(/,/g, "")); return /^-?[\d,]*\.?\d+$/.test(s) && Number.isFinite(n) ? { t: s, num: n } : { t: s }; }));
}

import "server-only";
import { sql } from "./db";

const RE = /^\/api\/assets\/([0-9a-f-]{36})$/i;

/** Replace /api/assets/<id> photo links with data-URLs so PDF (Chromium) and Word exports are self-contained. */
export async function inlineAssets<T>(value: T): Promise<T> {
  const ids = new Set<string>();
  const collect = (v: unknown) => {
    if (typeof v === "string") { const m = v.match(RE); if (m) ids.add(m[1]); }
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === "object") Object.values(v).forEach(collect);
  };
  collect(value);
  if (!ids.size) return value;
  const rows = await sql`SELECT id, mime, data FROM assets WHERE id IN ${sql([...ids])}`;
  const map = new Map(rows.map((r) => [r.id as string, `data:${r.mime};base64,${(r.data as Buffer).toString("base64")}`]));
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") { const m = v.match(RE); return m && map.has(m[1]) ? map.get(m[1]) : v; }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}

export type PhotoFile = { path: string; name: string; mime: string; data: Buffer; label: string };

/** The original, full-quality files behind every uploaded photo of a report (for the PDF attachments and the ZIP). */
export async function photoFiles(t: import("./types").TemplateSchema, data: import("./types").ReportData): Promise<PhotoFile[]> {
  const { collectPhotos, fileNameOf, pathOf } = await import("./photos");
  const photos = collectPhotos(t, data);
  const ids = [...new Set(photos.map((p) => p.src.match(RE)?.[1]).filter((x): x is string => !!x))];
  if (!ids.length) return [];
  const rows = await sql`SELECT id, mime, data FROM assets WHERE id IN ${sql(ids)}`;
  const byId = new Map<string, { mime: string; data: Buffer }>(rows.map((r) => [r.id as string, r as unknown as { mime: string; data: Buffer }]));
  const out: PhotoFile[] = [];
  for (const p of photos) {
    const r = byId.get(p.src.match(RE)?.[1] ?? "");
    if (!r) continue;
    const mime = r.mime;
    out.push({ path: pathOf(p, mime), name: fileNameOf(p, mime), mime, data: r.data, label: `${p.folder} – ${p.label}` });
  }
  return out;
}

import { allBlocks } from "./formula";
import { groupOf, imagesOf, isVisible, scalarText, type Entry } from "./records";
import type { RecordField, ReportData, TemplateSchema } from "./types";

/** One photo of the report with a meaningful file name, so HSE can drop it straight into their own database. */
export type Photo = { src: string; folder: string; base: string; label: string };

const safe = (s: string) =>
  s.normalize("NFKD").replace(/[\\/:*?"<>|#%\r\n]+/g, " ").replace(/\s+/g, " ").trim().replace(/ /g, "-").slice(0, 60) || "item";

export const extOf = (mime: string) => (/svg/i.test(mime) ? "svg" : /png/i.test(mime) ? "png" : /webp/i.test(mime) ? "webp" : /gif/i.test(mime) ? "gif" : "jpg");
export const mimeOfSrc = (src: string) => src.match(/^data:([^;,]+)/)?.[1] ?? "";

/** Every photo in template order, e.g. `Inductions / 03-Oct-2026_Entry-1_Person-2_Ahmed_ID-front`. */
export function collectPhotos(t: TemplateSchema, data: ReportData): Photo[] {
  const out: Photo[] = [];
  const used = new Set<string>();
  const add = (src: string, folder: string, base: string, label: string) => {
    let b = base, n = 2;
    while (used.has(`${folder}/${b}`)) b = `${base}-${n++}`;
    used.add(`${folder}/${b}`);
    out.push({ src, folder, base: b, label });
  };
  const fromEntry = (fields: RecordField[], e: Entry, folder: string, prefix: string) => {
    for (const f of fields) {
      if (!isVisible(f, e)) continue;
      if (f.type === "image") imagesOf(e[f.key]).forEach((im, i, a) => add(im.src, folder, `${prefix}_${safe(f.label)}${a.length > 1 ? `-${i + 1}` : ""}`, f.label));
      else if (f.type === "group") {
        const sub = f.fields ?? [];
        const nameF = sub.find((x) => x.type === "text");
        groupOf(e[f.key]).forEach((m, j) => fromEntry(sub, m, folder, `${prefix}_${safe(f.itemLabel || "item")}-${j + 1}${nameF && m[nameF.key] ? "_" + safe(String(m[nameF.key])) : ""}`));
      }
    }
  };
  for (const b of allBlocks(t)) {
    const folder = safe(b.label);
    if (b.type === "image") imagesOf(data[b.key]).forEach((im, i, a) => add(im.src, folder, `${folder}${a.length > 1 ? `-${i + 1}` : ""}`, b.label));
    else if (b.type === "records" && !b.linkTo) {
      const fields = b.fields ?? [];
      const raw = data[b.key];
      (Array.isArray(raw) ? (raw as Entry[]) : []).forEach((e, i) => {
        if (!e || typeof e !== "object") return;
        const tf = fields.find((f) => f.type === "date") ?? fields.find((f) => f.type === "text");
        const tag = tf ? safe(scalarText(tf, e[tf.key])) : "";
        fromEntry(fields, e, folder, `${String(i + 1).padStart(2, "0")}${tag && tag !== "item" ? "_" + tag : ""}`);
      });
    }
  }
  return out;
}

export const fileNameOf = (p: Photo, mime: string) => `${p.base}.${extOf(mime)}`;
export const pathOf = (p: Photo, mime: string) => `${p.folder}/${fileNameOf(p, mime)}`;

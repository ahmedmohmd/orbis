import { annexList, resolveTokens, type AnnexInfo } from "./annex";
import { chartSvg } from "./chart-block";
import { esc, ringGauge } from "./charts";
import { blockNumber, formatNumber, safeEval, toNumber } from "./formula";
import { resolveTheme, type ResolvedTheme } from "./themes";
import { collectPhotos, fileNameOf, mimeOfSrc } from "./photos";
import { groupOf, hasPhotos, imagesOf, isVisible, recordsTable, resolveRecords, scalarText, type Entry } from "./records";
import type { Block, BlockWidth, ImageItem, RecordField, ReportData, Row, TemplateSchema } from "./types";

/**
 * Renders a complete, self-contained, LIGHT-themed HTML document for a report.
 * Used by: the live preview (iframe), the PDF export (Chromium) – and the same
 * structure is mirrored by lib/render-docx.ts for Word.
 */

export interface RenderMeta {
  title: string;
  period?: string;
}

const SPAN: Record<BlockWidth, number> = { full: 12, half: 6, third: 4, quarter: 3 };

export function defaultWidth(b: Block): BlockWidth {
  if (b.width) return b.width;
  if (b.type === "number" || b.type === "percent" || b.type === "computed") return b.display === "inline" ? "half" : "quarter";
  if (b.type === "text" || b.type === "date" || b.type === "select" || b.type === "boolean") return "half";
  return "full";
}

export function defaultDisplay(b: Block): "inline" | "card" | "ring" | "callout" {
  if (b.display) return b.display;
  if (b.type === "number" || b.type === "computed") return "card";
  if (b.type === "percent") return "ring";
  return "inline";
}

export function fmtDate(v: unknown): string {
  const s = String(v ?? "");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

export function statusTone(text: string): "ok" | "warn" | "bad" | "info" | "mute" {
  const v = text.trim().toLowerCase();
  if (!v || v === "n/a" || v === "-" || v === "—") return "mute";
  if (/^(done|yes|completed?|closed|in service|low|ok|passed|approved|resolved|compliant|available)/.test(v)) return "ok";
  if (/^(high|no$|failed|overdue|critical|out of service|open|rejected)/.test(v)) return "bad";
  if (/^(medium|moderate|pending|partial|partially|in progress|delayed)/.test(v)) return "warn";
  if (/^(ongoing|planned|scheduled|active|info)/.test(v)) return "info";
  return "info";
}

export function displayValue(b: Block, t: TemplateSchema, data: ReportData): string {
  const raw = data[b.key];
  switch (b.type) {
    case "number":
    case "percent":
    case "computed": {
      const n = blockNumber(b, t, data);
      if (n === null) return "";
      return formatNumber(n, b.decimals) + (b.type === "percent" ? "%" : "");
    }
    case "date":
      return fmtDate(raw);
    case "boolean":
      return raw === true ? "Yes" : raw === false ? "No" : "";
    default:
      return typeof raw === "string" ? raw : raw == null ? "" : String(raw);
  }
}

const rowsOf = (v: unknown): Row[] =>
  (Array.isArray(v) ? (v as Row[]) : []).filter((r) => r && Object.values(r).some((x) => x !== "" && x != null));

/* ------------------------------ entries log ------------------------------ */

let photoNames = new Map<string, string>(); // image src → export file name (set per render)
const fname = (src: string) => photoNames.get(src);

function figures(f: RecordField, v: unknown, cls = ""): string {
  const imgs = imagesOf(v);
  if (!imgs.length) return `<div class="ph-missing"><span>${esc(f.label)}</span>Not attached</div>`;
  return `<div class="figs ${cls}">${imgs.map((i) => `<figure><img src="${esc(i.src)}" alt=""><figcaption>${esc(f.label)}${i.caption && f.maxImages !== 1 ? ` · ${esc(i.caption)}` : ""}${fname(i.src) ? `<span class="fn">⬇ ${esc(fname(i.src)!)}</span>` : ""}</figcaption></figure>`).join("")}</div>`;
}

function entryBody(fields: RecordField[], e: Entry, depth: number): string {
  const vis = fields.filter((f) => isVisible(f, e));
  const scalars = vis.filter((f) => f.type !== "image" && f.type !== "group");
  const images = vis.filter((f) => f.type === "image");
  const groups = vis.filter((f) => f.type === "group");
  const pill = scalars.find((f) => f.pill);
  const kvs = scalars.filter((f) => f !== pill);
  let out = "";
  if (kvs.length || pill)
    out += `<div class="rec-kv">${kvs
      .map((f) => {
        const v = scalarText(f, e[f.key]);
        return `<div class="${f.type === "textarea" ? "wide" : ""}"><span class="k">${esc(f.label)}</span><span class="v">${v ? esc(v) : '<span class="na">—</span>'}</span></div>`;
      })
      .join("")}</div>`;
  if (images.length) {
    // ID-style pairs (front/back) sit side by side, single photos are shown larger
    out += `<div class="rec-photos ${images.length > 1 ? "multi" : ""}">${images.map((f) => figures(f, e[f.key], depth ? "small" : "")).join("")}</div>`;
  }
  for (const g of groups) {
    const members = groupOf(e[g.key]);
    out += `<div class="rec-group"><div class="rec-group-h">${esc(g.label)}<span class="count">${members.length}</span></div>${
      members.length
        ? members
            .map((m, i) => {
              const sub = g.fields ?? [];
              const pf = sub.find((f) => f.pill && isVisible(f, m));
              const nameF = sub.find((f) => f.type === "text");
              return `<div class="rec-member"><div class="rec-member-h"><span class="idx">${i + 1}</span><b>${esc(nameF ? String(m[nameF.key] ?? "") || g.itemLabel || "Item" : g.itemLabel || "Item")}</b>${pf && m[pf.key] ? `<span class="pill ${/out/i.test(String(m[pf.key])) ? "warn" : "ok"}">${esc(String(m[pf.key]))}</span>` : ""}</div>${entryBody(sub.filter((f) => f !== nameF && f !== pf), m, depth + 1)}</div>`;
            })
            .join("")
        : `<div class="empty">None added</div>`
    }</div>`;
  }
  return out;
}

function recordsHtml(b: Block, t: TemplateSchema, data: ReportData): string {
  const { fields, rows } = resolveRecords(b, t, data);
  const view = b.view ?? (hasPhotos(fields) ? "both" : "table");
  const head = `<div class="tbl-title">${esc(b.label)}${rows.length ? `<span class="count">${rows.length}</span>` : ""}</div>`;
  if (!rows.length) return head + `<div class="empty">No entries this period</div>`;
  let out = head;
  if (hasPhotos(fields) && (view === "cards" || view === "both") && photoNames.size && t.settings?.photoNames !== false)
    out += `<div class="dl-note"><b>📎 Original photos are attached to this PDF.</b> Open the <i>Attachments</i> panel (paperclip) of your PDF reader and save them – the file name is printed under every photo.</div>`;
  if (view === "table" || view === "both") {
    const rt = recordsTable(fields, rows);
    out += tableHtml(rt.columns.map((c) => ({ key: c.key, label: c.label, type: "text" as const, width: c.key === "__n" ? 0.35 : 1 })), rt.rows, true);
  }
  if (view === "cards" || view === "both") {
    out += rows
      .map((e, i) => {
        const titleF = fields.find((f) => f.type === "date") ?? fields.find((f) => f.type === "text");
        const title = titleF ? scalarText(titleF, e[titleF.key]) : "";
        const rest = fields.filter((f) => f !== titleF);
        return `<div class="rec-card"><div class="rec-card-h"><span class="idx">${i + 1}</span><b>${esc(b.itemLabel ? b.itemLabel[0].toUpperCase() + b.itemLabel.slice(1) : "Entry")} ${i + 1}${title ? ` · ${esc(title)}` : ""}</b></div>${entryBody(rest, e, 0)}</div>`;
      })
      .join("");
  }
  return out;
}

function tableHtml(cols: { key: string; label: string; type: string; width?: number }[], rows: Row[], compact: boolean): string {
  const total = cols.reduce((a, c) => a + (c.width ?? 1), 0) || 1;
  const colgroup = `<colgroup>${cols.map((c) => `<col style="width:${(((c.width ?? 1) / total) * 100).toFixed(1)}%">`).join("")}</colgroup>`;
  const thead = `<thead><tr>${cols.map((c) => `<th class="${c.type === "number" ? "r" : ""}">${esc(c.label)}</th>`).join("")}</tr></thead>`;
  const tbody = rows
    .map(
      (r) =>
        `<tr>${cols
          .map((c) => {
            const v = r[c.key];
            const s = v == null ? "" : String(v);
            if (c.type === "status") return `<td>${s ? `<span class="pill ${statusTone(s)}">${esc(s)}</span>` : ""}</td>`;
            if (c.type === "number") return `<td class="r">${s === "" ? "" : esc(typeof v === "number" || /^-?[\d,.]+$/.test(s) ? formatNumber(toNumber(v)) : s)}</td>`;
            return `<td>${esc(c.type === "date" ? fmtDate(s) : s)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");
  return `<table class="tbl ${compact ? "compact" : ""}">${colgroup}${thead}<tbody>${tbody}</tbody></table>`;
}

/* ------------------------------------------------------------------ */

function renderBlock(b: Block, t: TemplateSchema, data: ReportData): string {
  const span = SPAN[defaultWidth(b)];
  const wrap = (inner: string, cls = "") => `<div class="blk ${cls}" style="grid-column: span ${span}">${inner}</div>`;
  const raw = data[b.key];

  switch (b.type) {
    case "heading":
      return `<h3 class="h3" style="grid-column: span 12">${esc(b.label)}</h3>`;

    case "number":
    case "percent":
    case "computed":
    case "text":
    case "date":
    case "select":
    case "boolean": {
      const val = displayValue(b, t, data);
      const mode = defaultDisplay(b);
      const numeric = b.type === "number" || b.type === "percent" || b.type === "computed";
      if (numeric && mode === "ring") {
        const n = blockNumber(b, t, data);
        if (n === null) return "";
        return wrap(
          `<div class="ring">${ringGauge({ value: n, max: 100, size: 92, color: t.brand.accent, text: `${formatNumber(n, b.decimals ?? (Number.isInteger(n) ? 0 : 1))}${b.type === "percent" || !b.unit || b.unit === "%" ? "%" : ""}` })}<div class="stat-label">${esc(b.label)}</div>${b.unit && b.type !== "percent" && b.unit !== "%" ? `<div class="unit">${esc(b.unit)}</div>` : ""}</div>`,
          "card",
        );
      }
      if ((numeric || b.display === "card") && mode === "card") {
        return wrap(
          `<div class="stat-label">${esc(b.label)}</div><div class="stat-value">${val ? esc(val) : "—"}${val && b.unit ? `<span class="unit">${esc(b.unit)}</span>` : ""}</div>`,
          "card stat",
        );
      }
      const shown = val ? esc(val) + (numeric && b.unit ? ` <span class="unit">${esc(b.unit)}</span>` : "") : `<span class="na">—</span>`;
      return wrap(`<div class="kv"><span class="k">${esc(b.label)}</span><span class="v">${shown}</span></div>`);
    }

    case "textarea": {
      const v = typeof raw === "string" ? raw.trim() : "";
      const body = v ? esc(v) : `<span class="na">N/A</span>`;
      return wrap(
        `${defaultDisplay(b) === "callout" || b.label ? `<div class="p-label">${esc(b.label)}</div>` : ""}<p class="para ${defaultDisplay(b) === "callout" ? "callout" : ""}">${body}</p>`,
      );
    }

    case "list": {
      const items = (Array.isArray(raw) ? (raw as string[]) : []).filter((x) => String(x).trim());
      return wrap(
        `<div class="p-label">${esc(b.label)}</div>` +
          (items.length ? `<ul class="bul">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : `<p class="para"><span class="na">N/A</span></p>`),
      );
    }

    case "table": {
      const cols = b.columns ?? [];
      const rows = rowsOf(raw);
      const head = `<div class="tbl-title">${esc(b.label)}${rows.length ? `<span class="count">${rows.length}</span>` : ""}</div>`;
      if (!rows.length) return wrap(head + `<div class="empty">No records this period</div>`);
      return wrap(head + tableHtml(cols, rows, !!b.compact), "tblwrap");
    }

    case "records": {
      return `<div class="blk recwrap" style="grid-column: span 12">${recordsHtml(b, t, data)}</div>`;
    }

    case "image": {
      const imgs = (Array.isArray(raw) ? (raw as ImageItem[]) : []).filter((i) => i?.src);
      // single-picture field (e.g. the best-day curve): large framed "hero" figure, or a framed empty slot
      if (b.maxImages === 1) {
        if (!imgs.length) {
          if (b.slot === false) return "";
          return wrap(`<div class="slot"><svg viewBox="0 0 120 56" aria-hidden="true"><path d="M4 48 C 24 48, 30 14, 52 14 S 84 46, 116 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4 52 H116" stroke="currentColor" stroke-opacity=".35" stroke-width="1.2"/></svg><b>${esc(b.label)}</b><span>${esc(b.caption || "SVG or PNG")}</span></div>`);
        }
        const cap = b.caption || imgs[0].caption || "";
        return wrap(`<figure class="hero-fig"><div class="hero-head"><i></i>${esc(b.label)}</div><img src="${esc(imgs[0].src)}" alt="">${cap ? `<figcaption>${esc(cap)}</figcaption>` : ""}</figure>`);
      }
      const head = `<div class="tbl-title">${esc(b.label)}${imgs.length ? `<span class="count">${imgs.length}</span>` : ""}</div>`;
      if (!imgs.length) return wrap(head + `<div class="empty">No files attached</div>`);
      return wrap(
        head + `<div class="gallery">${imgs.map((i) => `<figure><img src="${esc(i.src)}" alt="">${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ""}</figure>`).join("")}</div>`,
      );
    }

    case "chart": {
      const svg = chartSvg(b, t, data, 640);
      if (!svg) return "";
      const isGauge = b.chart?.kind === "gauge";
      return wrap(
        `${b.chart?.title || b.label ? `<div class="chart-title">${esc(b.chart?.title || b.label)}</div>` : ""}<div class="chart ${isGauge ? "center" : ""}">${svg}</div>`,
        "card chartcard",
      );
    }

    case "annex": {
      // printed at the end (default): leave a small automatic reference where it is defined
      const info = annexList(t).find((a) => a.block.id === b.id);
      if (!info || info.placement === "here") return "";
      return `<a class="annex-ref" style="grid-column: span 12" href="#annex-${info.number}"><span class="ar-ico">A${info.number}</span><span class="ar-t"><b>Annex ${info.number} · ${esc(b.label)}</b></span><span class="ar-go">at the end of the report ›</span></a>`;
    }
  }
  return "";
}

/* ------------------------------------------------------------------ */
/* page furniture                                                      */

const pad2 = (n: number) => String(n).padStart(2, "0");

function bannerArt(id: string): string {
  return `<svg class="b-art" viewBox="0 0 600 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
    <defs><radialGradient id="g${id}" cx="1" cy="0" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="560" cy="10" r="190" fill="url(#g${id})"/>
    ${[70, 110, 150, 190].map((r) => `<circle cx="560" cy="10" r="${r}" fill="none" stroke="#fff" stroke-opacity=".14"/>`).join("")}
    <path d="M0 170 C 120 120, 220 205, 340 150 S 520 110, 600 150 L600 200 L0 200 Z" fill="#fff" fill-opacity=".05"/>
  </svg>`;
}

function banner(kind: "section" | "annex", eyebrow: string, ghost: string, title: string, desc: string | undefined, chips: { text: string; annex?: boolean }[], id: string): string {
  return `<header class="banner ${kind}">${bannerArt(id)}<div class="ghost">${esc(ghost)}</div>
    <div class="b-in"><div class="b-eyebrow"><span>${esc(eyebrow)}</span></div><h2>${esc(title)}</h2>${desc ? `<p>${esc(desc)}</p>` : ""}
    ${chips.length ? `<div class="chips">${chips.map((c) => `<span class="chip ${c.annex ? "a" : ""}">${esc(c.text)}</span>`).join("")}</div>` : ""}</div></header>`;
}

function gridOf(blocks: Block[], t: TemplateSchema, data: ReportData): string {
  const html = blocks.filter((b) => !b.hideInExport).map((b) => renderBlock(b, t, data)).join("");
  return html.trim() ? `<div class="grid">${html}</div>` : "";
}

function annexPage(a: AnnexInfo, t: TemplateSchema, data: ReportData): string {
  const b = a.block;
  const chips = (b.children ?? []).filter((c) => c.type === "heading").map((c) => ({ text: c.label }));
  return `<section class="annex" id="annex-${a.number}">${banner("annex", `Annex ${pad2(a.number)}`, `A${a.number}`, b.label, b.description, chips, `a${a.number}`)}${gridOf(b.children ?? [], t, data)}</section>`;
}

/* ------------------------------------------------------------------ */

const cssString = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");

export function renderReportHtml(t0: TemplateSchema, data0: ReportData, meta: RenderMeta): string {
  const { t, data } = resolveTokens(t0, data0); // {{annex:key}} → "Annex 3", {{field}} → value
  photoNames = t0.settings?.photoNames === false ? new Map() : new Map(collectPhotos(t0, data0).map((p) => [p.src, fileNameOf(p, mimeOfSrc(p.src))]));
  const { brand } = t;
  const sections = t.sections;
  const annexes = annexList(t);
  const period = meta.period || (typeof data.period === "string" ? data.period : "");

  const st = t.settings ?? {};
  const cs = st.coverStyle ?? "rays";
  const coverMeta = t.cover
    .filter((b) => b.key !== "period" && !b.hideInExport && b.type !== "heading")
    .map((b) => ({ label: b.label, value: displayValue(b, t, data) }))
    .filter((x) => x.value);

  const cover = `
  <section class="cover">
    <svg class="cover-art" viewBox="0 0 794 1123" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="${brand.accent2}" stop-opacity=".55"/><stop offset="1" stop-color="${brand.accent2}" stop-opacity="0"/></radialGradient>
        <linearGradient id="wv" x1="0" x2="1"><stop offset="0" stop-color="${brand.accent}" stop-opacity="0"/><stop offset=".5" stop-color="${brand.accent2}" stop-opacity=".85"/><stop offset="1" stop-color="${brand.accent}" stop-opacity="0"/></linearGradient>
        <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#fff" fill-opacity=".16"/></pattern>
      </defs>
      ${cs === "clean" ? "" : `<rect x="0" y="0" width="794" height="520" fill="url(#dots)"/>`}
      ${cs === "clean" ? "" : `<circle cx="650" cy="240" r="270" fill="url(#sun)"/>`}
      ${cs === "rays" ? `${[120, 180, 240, 300, 360, 420].map((r, i) => `<circle cx="650" cy="240" r="${r}" fill="none" stroke="#fff" stroke-opacity="${0.2 - i * 0.027}" stroke-width="1.2"/>`).join("")}
      ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<line x1="${650 + Math.cos(a) * 130}" y1="${240 + Math.sin(a) * 130}" x2="${650 + Math.cos(a) * 190}" y2="${240 + Math.sin(a) * 190}" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>`; }).join("")}
      ` : ""}
      ${cs === "clean" ? "" : `${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M-20 ${790 + i * 24} C 160 ${720 + i * 16}, 300 ${890 + i * 10}, 480 ${800 + i * 20} S 760 ${730 + i * 22}, 840 ${810 + i * 18}" fill="none" stroke="url(#wv)" stroke-width="${1.8 - i * 0.14}" opacity="${0.95 - i * 0.1}"/>`).join("")}`}
    </svg>
    <div class="cover-in">
      <div class="cover-top"><div class="logo">${esc(brand.logoText)}</div><div><div class="company">${esc(brand.companyName)}</div><div class="company-sub">${esc(brand.footer.split("·")[1]?.trim() || "")}</div></div></div>
      <div class="cover-main">
        <div class="eyebrow"><i></i>${esc(t.reportTitle)}</div>
        <h1>${esc(meta.title)}</h1>
        ${period ? `<div class="period"><span></span>${esc(period)}</div>` : ""}
      </div>
      <div class="cover-meta">
        ${coverMeta.map((m) => `<div class="m"><div class="ml">${esc(m.label)}</div><div class="mv">${esc(m.value)}</div></div>`).join("")}
      </div>
    </div>
  </section>`;

  /* ---------- table of contents ---------- */
  const hl = (t.highlights ?? []).filter((h) => h.label);
  const toc = `
  <section class="toc">
    <div class="eyebrow dark"><i></i>Contents</div>
    <h2 class="toc-h">Table of contents</h2>
    <div class="toc-list">
      ${hl.length ? `<a class="toc-item glance" href="#glance"><span class="num star">★</span><span class="tt"><b>At a glance</b><em>The month in numbers</em></span></a>` : ""}
      ${sections
        .map((s, i) => {
          const subs = s.blocks.filter((b) => b.type === "heading").map((b) => b.label);
          const ax = annexes.filter((a) => a.sectionIndex === i);
          return `<a class="toc-item" href="#sec-${s.id}"><span class="num">${pad2(i + 1)}</span><span class="tt"><b>${esc(s.title)}</b>${subs.length ? `<em>${subs.map(esc).join(" · ")}</em>` : ""}${ax.length ? `<em class="ax">${ax.map((a) => `Annex ${a.number}`).join(" · ")}</em>` : ""}</span></a>`;
        })
        .join("")}
    </div>
    ${annexes.length ? `<div class="toc-annex-h">Annexes</div><div class="toc-list two">${annexes.map((a) => `<a class="toc-item annex" href="#annex-${a.number}"><span class="num a">A${a.number}</span><span class="tt"><b>${esc(a.block.label)}</b><em>Section ${pad2(a.sectionIndex + 1)} · ${esc(a.section.title)}</em></span></a>`).join("")}</div>` : ""}
  </section>`;

  /* ---------- at a glance ---------- */
  const glance = hl.length
    ? `<section class="glance-page" id="glance">
    ${banner("section", "At a glance", "★", "The month in numbers", `${meta.title}${period ? " · " + period : ""}`, [], "gl")}
    <div class="tiles t${hl.length <= 4 ? 2 : 3}">
      ${hl
        .map((h, i) => {
          const v = safeEval(h.value, t, data);
          const txt = v === null ? "—" : formatNumber(v, h.decimals);
          const ring = h.look === "ring" && v !== null;
          return `<div class="tile ${ring ? "ring-tile" : ""} c${i % 6}">${
            ring ? `<div class="tile-ring">${ringGauge({ value: v!, max: 100, size: 124, color: t.brand.accent, text: `${formatNumber(v!, h.decimals ?? (Number.isInteger(v!) ? 0 : 1))}%` })}</div>` : `<div class="tile-v">${esc(txt)}${h.unit ? `<span>${esc(h.unit)}</span>` : ""}</div>`
          }<div class="tile-l">${esc(h.label)}</div>${h.sub ? `<div class="tile-s">${esc(h.sub)}</div>` : ""}</div>`;
        })
        .join("")}
    </div></section>`
    : "";

  /* ---------- sections (every one starts on a new page) ---------- */
  const body = sections
    .map((s, i) => {
      const blocks = s.blocks.filter((b) => !b.hideInExport);
      const chips = [
        ...blocks.filter((b) => b.type === "heading").map((b) => ({ text: b.label })),
        ...blocks.filter((b) => b.type === "annex").map((b) => ({ text: `Annex ${annexes.find((a) => a.block.id === b.id)?.number} · ${b.label}`, annex: true })),
      ];
      // annexes printed "here" split the flow: content before → annex page → content after
      let out = "";
      let buf: Block[] = [];
      for (const b of blocks) {
        const a = b.type === "annex" ? annexes.find((x) => x.block.id === b.id) : undefined;
        if (a && a.placement === "here") {
          out += gridOf(buf, t, data) + annexPage(a, t, data);
          buf = [];
        } else buf.push(b);
      }
      out += gridOf(buf, t, data);
      return `<section class="sec" id="sec-${s.id}">${banner("section", `Section ${pad2(i + 1)}`, pad2(i + 1), s.title, s.description, chips, `s${i}`)}${out}</section>`;
    })
    .join("");

  const endAnnexes = annexes.filter((a) => a.placement === "end").map((a) => annexPage(a, t, data)).join("");

  const headerText = (t.settings?.headerText ?? "").trim() || `${meta.title}${period ? "  ·  " + period : ""}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(meta.title)}${period ? " — " + esc(period) : ""}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${css(resolveTheme(brand), { paper: st.paper === "Letter" ? "Letter" : "A4", pageNumbers: st.showPageNumbers !== false }, `${brand.companyName}${brand.footer ? " · " + brand.footer : ""}`, headerText, brand.companyName)}</style></head>
<body><main class="doc">${cover}${st.showToc === false ? "" : toc}${st.showGlance === false ? "" : glance}${body}${endAnnexes}</main></body></html>`;
}

/* ------------------------------------------------------------------ */

function css(th: ResolvedTheme, o: { paper: string; pageNumbers: boolean }, footer: string, header: string, company: string): string {
  const { accent, accent2, deep, mid } = th;
  return `
:root{--accent:${accent};--accent2:${accent2};--ink:#0b1b3a;--text:#16233f;--muted:#64748b;--line:#e3e9f2;--soft:#f6f8fc;--tint:color-mix(in srgb,var(--accent) 7%,#fff);--navy:${deep};--mid:${mid};--shadow:none;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Inter,"Segoe UI","Helvetica Neue",Helvetica,Arial,sans-serif;color:var(--text);font-size:12.5px;line-height:1.5;background:#fff;font-feature-settings:"tnum" 1,"cv11" 1}
@page{size:${o.paper};margin:21mm 14mm 19mm 14mm;
  @top-left{content:"${cssString(header)}";font:600 8pt Inter,"Segoe UI",Arial,sans-serif;color:#8a97ad;letter-spacing:.04em;border-bottom:.6pt solid #e3e9f2;padding-bottom:3mm;vertical-align:bottom}
  @top-right{content:"${cssString(company.toUpperCase())}";font:700 7.5pt Inter,"Segoe UI",Arial,sans-serif;color:${accent};letter-spacing:.18em;border-bottom:.6pt solid #e3e9f2;padding-bottom:3mm;vertical-align:bottom}
  @bottom-left{content:"${cssString(footer)}";font:500 8pt Inter,"Segoe UI",Arial,sans-serif;color:#94a3b8}
  @bottom-right{content:${o.pageNumbers ? "counter(page)" : "none"};font:700 9pt Inter,"Segoe UI",Arial,sans-serif;color:${accent}}}
@page cover{margin:0;@top-left{content:none;border:0}@top-right{content:none;border:0}@bottom-left{content:none}@bottom-right{content:none}}

/* ---------- cover ---------- */
.cover{page:cover;position:relative;width:${o.paper === "Letter" ? "215.9mm" : "210mm"};height:${o.paper === "Letter" ? "279.4mm" : "297mm"};overflow:hidden;color:#fff;break-after:page;
  background:radial-gradient(900px 640px at 88% 6%,color-mix(in srgb,var(--accent2) 42%,transparent),transparent 62%),
  linear-gradient(165deg,${deep} 0%,${mid} 50%,color-mix(in srgb,var(--accent) 72%,${mid}) 100%)}
.cover-art{position:absolute;inset:0;width:100%;height:100%}
.cover-in{position:relative;height:100%;padding:22mm 18mm 20mm;display:flex;flex-direction:column;justify-content:space-between}
.cover-top{display:flex;align-items:center;gap:14px}
.logo{width:50px;height:50px;border-radius:15px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:grid;place-items:center;font-weight:800;font-size:18px;letter-spacing:.5px;box-shadow:none}
.company{font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:13px}
.company-sub{font-size:10.5px;opacity:.65;letter-spacing:.06em;margin-top:2px}
.eyebrow{display:flex;align-items:center;gap:12px;font-size:12px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:color-mix(in srgb,var(--accent2) 72%,#fff)}
.eyebrow i{display:block;width:34px;height:2px;background:currentColor;border-radius:2px}
.eyebrow.dark{color:var(--accent)}
.cover h1{font-size:58px;line-height:1.02;font-weight:800;letter-spacing:-.03em;margin:16px 0 26px;max-width:160mm}
.period{display:inline-flex;align-items:center;gap:12px;font-size:21px;font-weight:600;padding:10px 22px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(4px)}
.period span{width:10px;height:10px;border-radius:50%;background:var(--accent2);box-shadow:none}
.cover-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.cover-meta .m{background:linear-gradient(180deg,rgba(255,255,255,.13),rgba(255,255,255,.06));border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:12px 15px}
.ml{font-size:9.5px;text-transform:uppercase;letter-spacing:.14em;opacity:.7}
.mv{font-size:14px;font-weight:600;margin-top:4px}

/* ---------- toc ---------- */
.toc{break-after:page;padding-top:2mm}
.toc-h{font-size:32px;font-weight:800;letter-spacing:-.025em;margin:6px 0 16px;color:var(--ink)}
.toc-list{display:flex;flex-direction:column;gap:7px}${o.paper === "Letter" ? ".toc{padding-top:0}.toc-list{gap:4px}.toc-item{padding:5px 12px!important;border-radius:11px}" : ""}
.toc-list.two{flex-direction:row;flex-wrap:wrap}.toc-list.two>.toc-item{width:calc(50% - 4px)}
.toc-item{display:flex;gap:14px;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:14px;padding:8px 13px;background:#fff;box-shadow:var(--shadow);break-inside:avoid}
.toc-item .tt{display:flex;flex-direction:column;min-width:0}
.toc-item b{font-size:14px;color:var(--ink)}
.toc-item em{font-style:normal;color:var(--muted);font-size:10px;margin-top:1px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.toc-item em.ax{color:#0f766e;font-weight:700}
.toc-item.glance{background:linear-gradient(90deg,var(--tint),#fff)}
.toc-annex-h{margin:16px 0 8px;font-size:11px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:#0f766e}
.num{flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:11px;color:#fff;font-weight:800;font-size:14px;background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:none}
.num.a{background:linear-gradient(135deg,#0f766e,#14b8a6);font-size:12.5px}
.num.star{background:linear-gradient(135deg,#f59e0b,#fbbf24);font-size:16px}
.toc-item.annex{padding:7px 11px}.toc-item.annex .num{width:30px;height:30px;border-radius:9px}.toc-item.annex b{font-size:12px}

/* ---------- banners (section / annex / glance) ---------- */
.glance-page,section.sec,section.annex{break-before:page}
.banner{position:relative;overflow:hidden;border-radius:20px;color:#fff;padding:20px 26px 18px;margin-bottom:16px;min-height:36mm;
  background:radial-gradient(520px 260px at 100% 0%,color-mix(in srgb,var(--accent2) 55%,transparent),transparent 70%),linear-gradient(120deg,var(--navy) 0%,var(--mid) 55%,color-mix(in srgb,var(--accent) 78%,var(--mid)) 100%);
  box-shadow:none}
.banner.annex{background:radial-gradient(520px 260px at 100% 0%,rgba(45,212,191,.5),transparent 70%),linear-gradient(120deg,#0b4a55 0%,#12808a 55%,#17a398 100%)}
.b-art{position:absolute;inset:0;width:100%;height:100%}
.ghost{position:absolute;right:20px;bottom:-26px;font-size:128px;line-height:1;font-weight:900;letter-spacing:-.05em;color:transparent;-webkit-text-stroke:1.6px rgba(255,255,255,.22)}
.b-in{position:relative;max-width:150mm}
.b-eyebrow{display:flex;align-items:center;margin-bottom:8px}
.b-eyebrow span{font-size:10px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;padding:4px 12px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.24)}
.banner h2{font-size:31px;line-height:1.1;font-weight:800;letter-spacing:-.025em}
.banner p{margin-top:6px;font-size:12.5px;opacity:.82;max-width:120mm}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}
.chip{font-size:10px;font-weight:600;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:#e7eefc}
.chip.a{background:rgba(45,212,191,.22);border-color:rgba(94,234,212,.5);color:#d5fbf4}

/* ---------- content ---------- */
.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:11px 12px;align-items:stretch}
.grid+.grid{margin-top:12px}
.blk{min-width:0}
.h3{display:flex;align-items:center;gap:10px;font-size:12.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin:14px 0 0;color:var(--ink);break-after:avoid}
.h3::before{content:"";flex:none;width:9px;height:9px;border-radius:3px;background:linear-gradient(135deg,var(--accent),var(--accent2));transform:rotate(45deg)}
.h3::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--line),transparent)}
.card{border:1px solid var(--line);border-radius:16px;background:#fff;padding:13px 15px;break-inside:avoid;box-shadow:var(--shadow)}
.stat{position:relative;overflow:hidden;background:linear-gradient(160deg,var(--tint),#fff 70%)}
.stat::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:linear-gradient(180deg,var(--accent),var(--accent2))}
.stat::after{content:"";position:absolute;right:-18px;top:-18px;width:62px;height:62px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--accent2) 22%,transparent),transparent 70%)}
.stat-label{font-size:9.5px;color:var(--muted);font-weight:700;letter-spacing:.09em;text-transform:uppercase;line-height:1.3}
.stat-value{font-size:24px;font-weight:800;letter-spacing:-.025em;margin-top:5px;line-height:1.05;color:var(--ink)}
.unit{font-size:11px;font-weight:600;color:var(--muted);margin-left:4px;letter-spacing:0;text-transform:none}
.ring{display:flex;flex-direction:column;align-items:center;text-align:center;gap:5px}
.ring svg{width:92px;height:92px}
.kv{display:flex;flex-direction:column;border-bottom:1px solid var(--line);padding:6px 2px}
.kv .k{font-size:9.5px;color:var(--muted);font-weight:700;letter-spacing:.09em;text-transform:uppercase}
.kv .v{font-weight:600;font-size:13px;color:var(--ink)}
.na{color:#94a3b8;font-style:italic;font-weight:400}
.p-label{font-size:9.5px;color:var(--muted);font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px}
.para{white-space:pre-wrap;line-height:1.7}
.callout{position:relative;background:linear-gradient(135deg,var(--tint),#fff);border:1px solid color-mix(in srgb,var(--accent) 14%,#fff);border-left:5px solid var(--accent);border-radius:4px 14px 14px 4px;padding:13px 16px}
.bul{list-style:none;display:grid;gap:6px}
.bul li{position:relative;padding-left:22px}
.bul li::before{content:"";position:absolute;left:3px;top:.45em;width:8px;height:8px;border-radius:3px;transform:rotate(45deg);background:linear-gradient(135deg,var(--accent),var(--accent2))}
.tbl-title{display:flex;align-items:center;gap:8px;font-weight:800;font-size:13px;margin:6px 0 7px;color:var(--ink);break-after:avoid}
.count{font-size:10px;font-weight:800;background:var(--tint);color:var(--accent);border-radius:999px;padding:1px 9px;border:1px solid color-mix(in srgb,var(--accent) 18%,#fff)}
.tbl{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:11px;table-layout:fixed;box-shadow:var(--shadow)}
.tbl thead{display:table-header-group}
.tbl th{background:linear-gradient(100deg,var(--navy),var(--mid) 60%,color-mix(in srgb,var(--accent) 85%,var(--mid)));color:#fff;text-align:left;font-weight:700;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;padding:9px 10px}
.tbl td{padding:8px 10px;border-top:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere;white-space:pre-line}
.tbl tbody tr:nth-child(even) td{background:var(--soft)}
.tbl tr{break-inside:avoid}
.tbl .r{text-align:right;font-variant-numeric:tabular-nums}
.tbl.compact{font-size:9.5px}.tbl.compact td{padding:5px 8px}.tbl.compact th{padding:7px 8px}
.pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap}
.pill.ok{background:#dcfce7;color:#166534}.pill.warn{background:#fef3c7;color:#92400e}.pill.bad{background:#fee2e2;color:#991b1b}.pill.info{background:#dbeafe;color:#1e40af}.pill.mute{background:#f1f5f9;color:#64748b}
.empty{border:1px dashed #cbd5e1;border-radius:14px;padding:13px;text-align:center;color:#94a3b8;font-size:11px;background:var(--soft)}
.chartcard{padding:14px 16px 10px}
.chart-title{font-weight:800;font-size:13px;margin-bottom:6px;color:var(--ink)}
.chart svg{width:100%;height:auto;display:block}
.chart.center{display:flex;justify-content:center}.chart.center svg{width:160px}
.gallery{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.gallery figure{break-inside:avoid;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--soft)}
.gallery img{width:100%;display:block;object-fit:contain;max-height:150mm}
.gallery figcaption{font-size:10.5px;color:var(--muted);padding:6px 10px}

/* hero figure (best-day curve) + empty slot */
.hero-fig{break-inside:avoid;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#fff;box-shadow:var(--shadow)}
.hero-head{display:flex;align-items:center;gap:9px;padding:11px 16px;font-weight:800;font-size:12.5px;color:var(--ink);background:linear-gradient(90deg,var(--tint),#fff);border-bottom:1px solid var(--line)}
.hero-head i{width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:none}
.hero-fig img{display:block;width:100%;max-height:92mm;object-fit:contain;background:#fff;padding:8px 10px}
.hero-fig figcaption{padding:8px 16px;font-size:10.5px;color:var(--muted);font-weight:600;background:var(--soft);border-top:1px solid var(--line)}
.slot{break-inside:avoid;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:62mm;border:1.5px dashed color-mix(in srgb,var(--accent) 40%,#cbd5e1);border-radius:18px;color:color-mix(in srgb,var(--accent) 55%,#94a3b8);
  background:repeating-linear-gradient(135deg,transparent 0 12px,color-mix(in srgb,var(--accent) 3.5%,transparent) 12px 24px),linear-gradient(180deg,var(--tint),#fff)}
.slot svg{width:96px;height:48px;margin-bottom:6px}
.slot b{font-size:13px;color:var(--ink)}.slot span{font-size:10.5px;color:var(--muted)}

/* annex reference (printed where the annex is defined) */
.annex-ref{display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit;border:1px dashed #5eead4;background:linear-gradient(90deg,#f0fdfa,#fff);border-radius:12px;padding:6px 12px;break-inside:avoid}
.ar-ico{flex:none;display:grid;place-items:center;min-width:28px;height:28px;padding:0 6px;border-radius:9px;font-weight:800;font-size:12px;color:#fff;background:linear-gradient(135deg,#0f766e,#14b8a6)}
.ar-t{display:flex;flex-direction:column;flex:1;min-width:0}.ar-t b{font-size:12.5px;color:#134e4a}.ar-t em{font-style:normal;font-size:10.5px;color:var(--muted)}
.ar-go{font-size:10px;font-weight:700;color:#0f766e;white-space:nowrap}

/* ---------- at a glance ---------- */
.tiles{display:grid;gap:14px}.tiles.t2{grid-template-columns:repeat(2,1fr)}.tiles.t3{grid-template-columns:repeat(3,1fr)}
.tile{position:relative;overflow:hidden;border-radius:22px;padding:22px 22px 20px;border:1px solid var(--line);background:linear-gradient(160deg,var(--tint),#fff 75%);box-shadow:var(--shadow);min-height:44mm;break-inside:avoid;display:flex;flex-direction:column;justify-content:flex-end}
.tile::before{content:"";position:absolute;left:0;top:0;right:0;height:5px;background:linear-gradient(90deg,var(--accent),var(--accent2))}
.tile::after{content:"";position:absolute;right:-30px;top:-30px;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--accent2) 22%,transparent),transparent 70%)}
.tile.c1::before{background:linear-gradient(90deg,#f59e0b,#fbbf24)}.tile.c2::before{background:linear-gradient(90deg,#10b981,#34d399)}.tile.c3::before{background:linear-gradient(90deg,#8b5cf6,#a78bfa)}.tile.c4::before{background:linear-gradient(90deg,#f43f5e,#fb7185)}.tile.c5::before{background:linear-gradient(90deg,#14b8a6,#2dd4bf)}
.tile-v{font-size:34px;font-weight:800;letter-spacing:-.035em;line-height:1;color:var(--ink)}
.tile-v span{display:block;font-size:13px;font-weight:700;color:var(--muted);margin:5px 0 0;letter-spacing:.02em}
.tile-l{margin-top:10px;font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.tile-s{margin-top:3px;font-size:11px;color:var(--muted)}
.ring-tile{align-items:center;text-align:center;justify-content:center}.ring-tile .tile-l{margin-top:6px}.tile-ring svg{width:124px;height:124px}

/* ---------- entries log ---------- */
.rec-card{border:1px solid var(--line);border-radius:16px;margin:11px 0;padding:13px 15px;background:#fff;box-shadow:var(--shadow)}
.rec-card-h,.rec-member-h{display:flex;align-items:center;gap:9px;margin-bottom:9px;break-after:avoid;color:var(--ink)}
.idx{flex:none;display:grid;place-items:center;width:23px;height:23px;border-radius:8px;color:#fff;font-weight:800;font-size:11px;background:linear-gradient(135deg,var(--accent),var(--accent2))}
.rec-kv{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 14px;margin-bottom:8px}
.rec-kv .wide{grid-column:1/-1}.rec-kv>div{display:flex;flex-direction:column;border-bottom:1px solid var(--line);padding-bottom:3px}
.rec-kv .k{font-size:9px;color:var(--muted);font-weight:700;letter-spacing:.08em;text-transform:uppercase}.rec-kv .v{font-weight:600;font-size:12px;white-space:pre-line;color:var(--ink)}
.rec-photos{display:flex;gap:10px;margin:6px 0;align-items:flex-start}
.figs{display:flex;gap:8px}.figs figure{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--soft);break-inside:avoid}
.figs img{display:block;width:100%;max-height:105mm;object-fit:contain;background:#fff}
.fn{display:block;margin-top:1px;font-size:6.5px;color:var(--muted);font-weight:500;word-break:break-all}.dl-note{margin:2mm 0 3mm;padding:2mm 3mm;border:1px dashed color-mix(in srgb,var(--accent) 45%,#fff);border-radius:6px;background:var(--tint);font-size:8px;color:var(--text)}
.figs figcaption{font-size:9.5px;color:var(--muted);padding:4px 8px;font-weight:600}
.rec-photos>.figs{flex:1 1 0;min-width:0}.rec-photos:not(.multi)>.figs{max-width:62%}
.figs.small img{max-height:46mm}
.ph-missing{flex:1;border:1px dashed #cbd5e1;border-radius:12px;padding:10px;text-align:center;color:#94a3b8;font-size:10px;background:var(--soft)}
.ph-missing span{display:block;font-weight:700;color:var(--muted);margin-bottom:2px}
.rec-group{margin-top:10px}.rec-group-h{display:flex;align-items:center;gap:8px;font-weight:800;font-size:11.5px;margin-bottom:6px;break-after:avoid;color:var(--ink)}
.rec-member{border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:12px;padding:9px 11px;margin-bottom:8px;background:var(--soft);break-inside:avoid}
.recwrap{min-width:0}

/* ---------- screen preview ---------- */
@media screen{
  body{background:#e6ebf3}
  .doc{padding:24px 0}
  .doc>*{width:210mm;max-width:calc(100% - 24px);margin:0 auto 24px;background:#fff;box-shadow:0 14px 44px rgba(11,27,58,.16);border-radius:8px}
  .doc>.toc,.doc>.sec,.doc>section.annex,.doc>.glance-page{padding:16mm 14mm}
  .cover{height:297mm;border-radius:8px}
}
@media print{.doc>*{box-shadow:none}}
`;
}

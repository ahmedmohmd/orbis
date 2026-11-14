import {
  AlignmentType,
  BorderStyle,
  Bookmark,
  Document,
  Footer,
  Header,
  HeightRule,
  ImageRun,
  InternalHyperlink,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";
import sharp from "sharp";
import { noHash, resolveTheme } from "./themes";
import { annexList, resolveTokens, type AnnexInfo } from "./annex";
import { chartSvg } from "./chart-block";
import { ringGauge } from "./charts";
import { blockNumber, formatNumber, safeEval, toNumber } from "./formula";
import { groupOf, hasPhotos, imagesOf, isVisible, recordsTable, resolveRecords, scalarText, type Entry } from "./records";
import { defaultDisplay, defaultWidth, displayValue, fmtDate, statusTone, type RenderMeta } from "./render-html";
import type { Block, Column, ImageItem, RecordField, ReportData, Row, TemplateSchema } from "./types";

const CONTENT_W = 9906; // A4 width (11906) minus 2 × 1000 twips margins
const hex = (c: string) => c.replace("#", "").toUpperCase();
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const dashed = (c: string) => ({ style: BorderStyle.DASHED, size: 8, color: c });
const line = (c = "E2E8F0", size = 4) => ({ style: BorderStyle.SINGLE, size, color: c });
const TONE: Record<string, { fg: string; bg: string }> = {
  ok: { fg: "166534", bg: "DCFCE7" },
  warn: { fg: "92400E", bg: "FEF3C7" },
  bad: { fg: "991B1B", bg: "FEE2E2" },
  info: { fg: "1E40AF", bg: "DBEAFE" },
  mute: { fg: "64748B", bg: "F1F5F9" },
};

const run = (text: string, o: { size?: number; bold?: boolean; color?: string; italics?: boolean; caps?: boolean } = {}) =>
  new TextRun({ text, size: o.size ?? 20, bold: o.bold, color: o.color ?? "0F172A", italics: o.italics, allCaps: o.caps });

const p = (children: ParagraphChild[] | string, o: ConstructorParameters<typeof Paragraph>[0] = {}) =>
  new Paragraph({ ...(o as object), children: typeof children === "string" ? [run(children)] : children } as ConstructorParameters<typeof Paragraph>[0]);

const multiline = (text: string, o: Parameters<typeof run>[1] = {}) =>
  String(text)
    .split("\n")
    .map((l) => p([run(l, o)], { spacing: { after: 40 } }));

async function svgPng(svg: string, maxW = 620) {
  const w = +(svg.match(/width="(\d+(?:\.\d+)?)"/)?.[1] ?? 640);
  const h = +(svg.match(/height="(\d+(?:\.\d+)?)"/)?.[1] ?? 280);
  const data = await sharp(Buffer.from(svg), { density: 216 }).png().toBuffer();
  const k = Math.min(1, maxW / w);
  return { data, width: Math.round(w * k), height: Math.round(h * k) };
}

const img = (d: { data: Buffer; width: number; height: number }, type: "png" | "jpg" = "png") =>
  new ImageRun({ type, data: d.data, transformation: { width: d.width, height: d.height }, altText: { title: "", description: "", name: "" } });

function cell(children: (Paragraph | Table)[], width: number, o: { fill?: string; borders?: object; valign?: "top" | "center" | "bottom"; margin?: number; span?: number } = {}) {
  const m = o.margin ?? 100;
  return new TableCell({
    children: children.length ? children : [new Paragraph("")],
    width: { size: width, type: WidthType.DXA },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
    borders: (o.borders as never) ?? NO_BORDERS,
    verticalAlign: o.valign ?? "top",
    margins: { top: m, bottom: m, left: m + 20, right: m + 20 },
    columnSpan: o.span,
  });
}

const table = (rows: TableRow[], widths: number[]) =>
  new Table({ rows, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, borders: { ...NO_BORDERS, insideHorizontal: NONE, insideVertical: NONE } });

const gap = (after = 120) => p([], { spacing: { after } });

/* ------------------------------------------------------------------ */

export async function renderReportDocx(t0: TemplateSchema, data0: ReportData, meta: RenderMeta): Promise<Buffer> {
  const { t, data } = resolveTokens(t0, data0); // {{annex:key}} → "Annex 3", {{field}} → value
  const annexes = annexList(t);
  const rt = resolveTheme(t.brand);
  const st = t.settings ?? {};
  const A = hex(t.brand.accent);
  const A2 = hex(t.brand.accent2);
  const TINT = "EFF6FF";
  const period = meta.period || (typeof data.period === "string" ? data.period : "");

  /* ------------------------------ cover ------------------------------ */
  const coverMeta = t.cover.filter((b) => b.key !== "period" && !b.hideInExport && b.type !== "heading").map((b) => ({ label: b.label, value: displayValue(b, t, data) })).filter((m) => m.value);

  const coverBand = table(
    [
      new TableRow({
        height: { value: 8200, rule: HeightRule.ATLEAST },
        children: [
          cell(
            [
              p([run(`${t.brand.logoText}  ·  ${t.brand.companyName}`, { size: 24, bold: true, color: "FFFFFF" })], { spacing: { after: 2600 } }),
              p([run(t.reportTitle.toUpperCase(), { size: 24, bold: true, color: A2 })], { spacing: { after: 120 } }),
              p([run(meta.title, { size: 88, bold: true, color: "FFFFFF" })], { spacing: { after: 240 } }),
              ...(period ? [p([run(period, { size: 40, bold: true, color: "FFFFFF" })])] : []),
            ],
            CONTENT_W,
            { fill: noHash(rt.deep), margin: 360, valign: "top" },
          ),
        ],
      }),
    ],
    [CONTENT_W],
  );
  const mw = Math.floor(CONTENT_W / 2);
  const metaRows: TableRow[] = [];
  for (let i = 0; i < coverMeta.length; i += 2) {
    metaRows.push(
      new TableRow({
        children: [0, 1].map((j) => {
          const m = coverMeta[i + j];
          return cell(m ? [p([run(m.label.toUpperCase(), { size: 15, color: "64748B", bold: true })]), p([run(m.value, { size: 22, bold: true })])] : [], mw, {
            fill: m ? TINT : undefined,
            borders: { top: line("FFFFFF", 24), bottom: line("FFFFFF", 24), left: line("FFFFFF", 24), right: line("FFFFFF", 24) },
            margin: 140,
          });
        }),
      }),
    );
  }

  /* ------------------------------- toc ------------------------------- */
  const num = (i: number) => String(i + 1).padStart(2, "0");
  const hl = (t.highlights ?? []).filter((h) => h.label);
  const toc: Paragraph[] = [
    p([run("CONTENTS", { size: 20, bold: true, color: A })], { spacing: { after: 60 } }),
    p([run("Table of contents", { size: 52, bold: true })], { spacing: { after: 240 } }),
    ...(hl.length ? [p([run("★   ", { size: 26, bold: true, color: "F59E0B" }), run("At a glance", { size: 26, bold: true })], { spacing: { before: 120, after: 20 } }), p([run("The month in numbers", { size: 17, color: "64748B" })], { indent: { left: 560 }, spacing: { after: 40 } })] : []),
    ...t.sections.flatMap((s, i) => {
      const subs = s.blocks.filter((b) => b.type === "heading").map((b) => b.label);
      const ax = annexes.filter((a) => a.sectionIndex === i).map((a) => `Annex ${a.number}`);
      return [
        p([new InternalHyperlink({ anchor: `sec_${i}`, children: [run(`${num(i)}   `, { size: 26, bold: true, color: A }), run(s.title, { size: 26, bold: true })] })], { spacing: { before: 120, after: 20 } }),
        ...(subs.length ? [p([run(subs.join(" · "), { size: 16, color: "64748B" })], { indent: { left: 560 }, spacing: { after: 20 } })] : []),
        ...(ax.length ? [p([run(ax.join(" · "), { size: 16, bold: true, color: "0F766E" })], { indent: { left: 560 }, spacing: { after: 40 } })] : []),
      ];
    }),
    ...(annexes.length
      ? [
          p([run("ANNEXES", { size: 18, bold: true, color: "0F766E" })], { spacing: { before: 280, after: 80 } }),
          ...annexes.map((a) => p([new InternalHyperlink({ anchor: `annex_${a.number}`, children: [run(`A${a.number}   `, { size: 22, bold: true, color: "0F766E" }), run(a.block.label, { size: 22, bold: true }), run(`   ·   Section ${num(a.sectionIndex)} ${a.section.title}`.replace(/Section \d+/, `Section ${num(a.sectionIndex)}`), { size: 16, color: "64748B" })] })], { spacing: { after: 50 } })),
        ]
      : []),
  ];

  /* ------------------------------ blocks ----------------------------- */
  const out: (Paragraph | Table)[] = [];

  const isGridCard = (b: Block) =>
    (b.type === "number" || b.type === "percent" || b.type === "computed") && ["card", "ring"].includes(defaultDisplay(b));
  const isKv = (b: Block) => ["text", "date", "select", "boolean"].includes(b.type) && defaultDisplay(b) !== "card" || ((b.type === "number" || b.type === "percent" || b.type === "computed") && defaultDisplay(b) === "inline");

  async function cardGrid(bs: Block[]) {
    const per = defaultWidth(bs[0]) === "third" ? 3 : defaultWidth(bs[0]) === "half" ? 2 : 4;
    const w = Math.floor(CONTENT_W / per);
    const rows: TableRow[] = [];
    for (let i = 0; i < bs.length; i += per) {
      const cells: TableCell[] = [];
      for (let j = 0; j < per; j++) {
        const b = bs[i + j];
        if (!b) {
          cells.push(cell([], w));
          continue;
        }
        const n = blockNumber(b, t, data);
        const val = displayValue(b, t, data);
        const kids: (Paragraph | Table)[] = [];
        if (defaultDisplay(b) === "ring" && n !== null) {
          const svg = ringGauge({ value: n, size: 92, color: t.brand.accent, text: `${formatNumber(n, b.decimals ?? (Number.isInteger(n) ? 0 : 1))}%` });
          kids.push(p([img(await svgPng(svg, 70))], { alignment: AlignmentType.CENTER }));
          kids.push(p([run(b.label.toUpperCase(), { size: 14, bold: true, color: "64748B" })], { alignment: AlignmentType.CENTER }));
        } else {
          kids.push(p([run(b.label.toUpperCase(), { size: 14, bold: true, color: "64748B" })], { spacing: { after: 40 } }));
          kids.push(p([run(val || "—", { size: 40, bold: true, color: "0F172A" }), ...(val && b.unit ? [run(`  ${b.unit}`, { size: 18, bold: true, color: "64748B" })] : [])]));
        }
        cells.push(cell(kids, w, { fill: "F8FAFC", borders: { top: line("FFFFFF", 36), bottom: line("FFFFFF", 36), left: j === 0 ? line("FFFFFF", 36) : line("FFFFFF", 36), right: line("FFFFFF", 36) }, margin: 110 }));
      }
      rows.push(new TableRow({ cantSplit: true, children: cells }));
    }
    out.push(table(rows, Array(per).fill(w)), gap(80));
  }

  function kvGrid(bs: Block[]) {
    const w = Math.floor(CONTENT_W / 2);
    const rows: TableRow[] = [];
    for (let i = 0; i < bs.length; i += 2) {
      rows.push(
        new TableRow({
          cantSplit: true,
          children: [0, 1].map((j) => {
            const b = bs[i + j];
            if (!b) return cell([], w);
            const v = displayValue(b, t, data);
            return cell([p([run(b.label.toUpperCase(), { size: 14, bold: true, color: "64748B" })]), p([run(v ? v + (b.unit ? ` ${b.unit}` : "") : "—", { size: 21, bold: true, color: v ? "0F172A" : "94A3B8" })])], w, {
              borders: { ...NO_BORDERS, bottom: line() },
              margin: 70,
            });
          }),
        }),
      );
    }
    out.push(table(rows, [w, w]), gap(80));
  }

  async function renderTable(b: Block, override?: { cols: Column[]; rows: Row[] }) {
    const cols = override?.cols ?? b.columns ?? [];
    const rows = (override?.rows ?? (Array.isArray(data[b.key]) ? (data[b.key] as Row[]) : [])).filter((r) => Object.values(r).some((v) => v !== "" && v != null));
    if (!override) out.push(p([run(b.label, { size: 23, bold: true }), run(rows.length ? `   ${rows.length}` : "", { size: 17, bold: true, color: A })], { spacing: { before: 120, after: 80 }, keepNext: true }));
    if (!rows.length) {
      out.push(p([run("No records this period", { size: 18, italics: true, color: "94A3B8" })], { spacing: { after: 140 } }));
      return;
    }
    const total = cols.reduce((a, c) => a + (c.width ?? 1), 0) || 1;
    const widths = cols.map((c) => Math.floor(((c.width ?? 1) / total) * CONTENT_W));
    const fs = b.compact ? 15 : 17;
    const head = new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: cols.map((c, i) => cell([p([run(c.label.toUpperCase(), { size: 14, bold: true, color: "FFFFFF" })], { alignment: c.type === "number" ? AlignmentType.RIGHT : AlignmentType.LEFT })], widths[i], { fill: A, margin: 70 })),
    });
    const body = rows.map(
      (r, ri) =>
        new TableRow({
          cantSplit: true,
          children: cols.map((c, i) => {
            const v = r[c.key];
            const s = v == null ? "" : String(v);
            const borders = { ...NO_BORDERS, bottom: line() };
            const fill = ri % 2 ? "F8FAFC" : undefined;
            if (c.type === "status") {
              const tn = TONE[statusTone(s)];
              return cell(s ? [p([run(s, { size: fs, bold: true, color: tn.fg })])] : [], widths[i], { fill: s ? tn.bg : fill, borders: { ...borders, left: line("FFFFFF", 12), right: line("FFFFFF", 12) }, margin: 60 });
            }
            if (c.type === "number")
              return cell([p([run(s === "" ? "" : /^-?[\d,.]+$/.test(s) ? formatNumber(toNumber(v)) : s, { size: fs })], { alignment: AlignmentType.RIGHT })], widths[i], { fill, borders, margin: 60 });
            return cell(multiline(c.type === "date" ? fmtDate(s) : s, { size: fs }), widths[i], { fill, borders, margin: 60 });
          }),
        }),
    );
    out.push(table([head, ...body], widths), gap(140));
  }


  /* ---------------------------- entries log ---------------------------- */
  async function loadPhoto(src: string, maxW: number, maxH: number) {
    try {
      const buf = Buffer.from(src.replace(/^data:[^,]+,/, ""), "base64");
      const jpg = await sharp(buf, { density: 220 }).rotate().flatten({ background: "#ffffff" }).jpeg({ quality: 88 }).toBuffer();
      const m = await sharp(jpg).metadata();
      const k = Math.min(1, maxW / (m.width ?? maxW), maxH / (m.height ?? maxH));
      return { data: jpg, width: Math.round((m.width ?? maxW) * k), height: Math.round((m.height ?? maxH) * k) };
    } catch {
      return null;
    }
  }

  async function photoParas(f: RecordField, v: unknown, maxW: number, maxH: number): Promise<Paragraph[]> {
    const imgs = imagesOf(v);
    if (!imgs.length) return [p([run(`${f.label}: not attached`, { size: 16, italics: true, color: "94A3B8" })], { alignment: AlignmentType.CENTER })];
    const res: Paragraph[] = [];
    for (const it of imgs) {
      const ph = await loadPhoto(it.src, maxW, maxH);
      if (ph) res.push(p([img(ph, "jpg")], { alignment: AlignmentType.CENTER, spacing: { after: 20 } }));
      res.push(p([run(`${f.label}${it.caption && f.maxImages !== 1 ? " · " + it.caption : ""}`, { size: 15, bold: true, color: "64748B" })], { alignment: AlignmentType.CENTER, spacing: { after: 80 } }));
    }
    return res;
  }

  async function entryDocx(fields: RecordField[], e: Entry, depth: number) {
    const vis = fields.filter((f) => isVisible(f, e));
    const scalars = vis.filter((f) => f.type !== "image" && f.type !== "group");
    const images = vis.filter((f) => f.type === "image");
    const groups = vis.filter((f) => f.type === "group");
    if (scalars.length) {
      const per = 3;
      const w = Math.floor(CONTENT_W / per);
      const rows: TableRow[] = [];
      for (let i = 0; i < scalars.length; i += per)
        rows.push(
          new TableRow({
            cantSplit: true,
            children: Array.from({ length: per }, (_, j) => {
              const f = scalars[i + j];
              if (!f) return cell([], w);
              const v = scalarText(f, e[f.key]);
              return cell([p([run(f.label.toUpperCase(), { size: 14, bold: true, color: "64748B" })]), ...(v ? multiline(v, { size: 20, bold: true }) : [p([run("—", { size: 20, color: "94A3B8" })])])], w, { borders: { ...NO_BORDERS, bottom: line() }, margin: 60 });
            }),
          }),
        );
      out.push(table(rows, Array(per).fill(w)), gap(60));
    }
    if (images.length) {
      const n = Math.min(images.length, 3);
      const w = Math.floor(CONTENT_W / (images.length === 1 ? 2 : n));
      const maxW = Math.round((w / 20) * 0.9);
      const maxH = depth ? 150 : 260;
      for (let i = 0; i < images.length; i += n) {
        const slice = images.slice(i, i + n);
        const cells: TableCell[] = [];
        for (const f of slice) cells.push(cell(await photoParas(f, e[f.key], maxW, maxH), w, { borders: { top: line("E2E8F0"), bottom: line("E2E8F0"), left: line("E2E8F0"), right: line("E2E8F0") }, margin: 80 }));
        out.push(table([new TableRow({ cantSplit: true, children: cells })], Array(slice.length).fill(w)), gap(80));
      }
    }
    for (const g of groups) {
      const members = groupOf(e[g.key]);
      out.push(p([run(g.label, { size: 21, bold: true, color: A }), run(`   ${members.length}`, { size: 16, bold: true, color: "64748B" })], { spacing: { before: 120, after: 60 }, keepNext: true }));
      if (!members.length) out.push(p([run("None added", { size: 17, italics: true, color: "94A3B8" })]));
      const sub = g.fields ?? [];
      const nameF = sub.find((f) => f.type === "text");
      const pf = sub.find((f) => f.pill && isVisible(f, members[0] ?? {}));
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const pill = sub.find((f) => f.pill && isVisible(f, m));
        const status = pill ? String(m[pill.key] ?? "") : "";
        out.push(
          new Paragraph({
            keepNext: true,
            shading: { type: ShadingType.CLEAR, fill: "F1F5F9", color: "auto" },
            border: { left: { style: BorderStyle.SINGLE, size: 24, color: /out/i.test(status) ? "F59E0B" : A, space: 6 } },
            spacing: { before: 80, after: 60 },
            indent: { left: 120 },
            children: [run(`${i + 1}.  ${(nameF ? String(m[nameF.key] ?? "") : "") || g.itemLabel || "Item"}`, { size: 21, bold: true }), ...(status ? [run(`    ${status}`, { size: 17, bold: true, color: /out/i.test(status) ? "92400E" : "166534" })] : [])],
          }),
        );
        await entryDocx(sub.filter((f) => f !== nameF && f !== pill), m, depth + 1);
      }
      void pf;
    }
  }

  async function renderRecords(b: Block) {
    const { fields, rows } = resolveRecords(b, t, data);
    const view = b.view ?? (hasPhotos(fields) ? "both" : "table");
    out.push(p([run(b.label, { size: 23, bold: true }), run(rows.length ? `   ${rows.length}` : "", { size: 17, bold: true, color: A })], { spacing: { before: 120, after: 80 }, keepNext: true }));
    if (!rows.length) {
      out.push(p([run("No entries this period", { size: 18, italics: true, color: "94A3B8" })], { spacing: { after: 140 } }));
      return;
    }
    if (view === "table" || view === "both") {
      const rt = recordsTable(fields, rows);
      await renderTable({ ...b, compact: true }, { cols: rt.columns.map((c) => ({ key: c.key, label: c.label, type: "text" as const, width: c.key === "__n" ? 0.35 : 1 })), rows: rt.rows });
    }
    if (view === "cards" || view === "both") {
      const titleF = fields.find((f) => f.type === "date") ?? fields.find((f) => f.type === "text");
      for (let i = 0; i < rows.length; i++) {
        const e = rows[i];
        const title = titleF ? scalarText(titleF, e[titleF.key]) : "";
        const noun = b.itemLabel ? b.itemLabel[0].toUpperCase() + b.itemLabel.slice(1) : "Entry";
        out.push(
          new Paragraph({
            pageBreakBefore: i > 0 && hasPhotos(fields),
            keepNext: true,
            spacing: { before: 200, after: 80 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: A, space: 3 } },
            children: [run(`${noun} ${i + 1}${title ? "  ·  " + title : ""}`, { size: 25, bold: true, color: A })],
          }),
        );
        await entryDocx(fields.filter((f) => f !== titleF), e, 0);
      }
    }
  }

  const pageStart = () => new Paragraph({ pageBreakBefore: true, spacing: { before: 0, after: 0, line: 20 }, children: [run("", { size: 2 })] });

  function docBanner(kind: "section" | "annex", eyebrow: string, title: string, desc: string | undefined, bookmark: string) {
    const fill = kind === "annex" ? "12808A" : noHash(rt.mid);
    return table(
      [
        new TableRow({
          cantSplit: true,
          children: [
            cell(
              [
                p([run(eyebrow.toUpperCase(), { size: 16, bold: true, color: kind === "annex" ? "5EEAD4" : A2 })], { spacing: { after: 60 } }),
                new Paragraph({ heading: "Heading1", keepNext: true, spacing: { after: 40 }, children: [new Bookmark({ id: bookmark, children: [run(title, { size: 54, bold: true, color: "FFFFFF" })] })] }),
                ...(desc ? [p([run(desc, { size: 19, color: "C7D6F0" })])] : []),
              ],
              CONTENT_W,
              { fill, margin: 260 },
            ),
          ],
        }),
      ],
      [CONTENT_W],
    );
  }

  async function emitAnnex(a: AnnexInfo) {
    out.push(pageStart(), docBanner("annex", `Annex ${num(a.number - 1)}`, a.block.label, a.block.description, `annex_${a.number}`), gap(140));
    await emit((a.block.children ?? []).filter((c) => !c.hideInExport));
  }

  async function emit(blocks: Block[]) {
    for (let i = 0; i < blocks.length; ) {
      const b = blocks[i];
      if (isGridCard(b)) {
        const grp: Block[] = [];
        while (i < blocks.length && isGridCard(blocks[i])) grp.push(blocks[i++]);
        await cardGrid(grp);
        continue;
      }
      if (isKv(b) && defaultWidth(b) !== "full") {
        const grp: Block[] = [];
        while (i < blocks.length && isKv(blocks[i]) && defaultWidth(blocks[i]) !== "full") grp.push(blocks[i++]);
        kvGrid(grp);
        continue;
      }
      i++;
      const raw = data[b.key];
      switch (b.type) {
        case "heading":
          out.push(p([run(b.label, { size: 26, bold: true, color: A })], { heading: "Heading2", spacing: { before: 240, after: 100 }, keepNext: true, border: { left: { style: BorderStyle.SINGLE, size: 24, color: A, space: 8 } }, indent: { left: 120 } }));
          break;
        case "text":
        case "date":
        case "select":
        case "boolean":
          kvGrid([b]);
          break;
        case "number":
        case "percent":
        case "computed":
          kvGrid([b]);
          break;
        case "textarea": {
          const v = typeof raw === "string" ? raw.trim() : "";
          out.push(p([run(b.label.toUpperCase(), { size: 14, bold: true, color: "64748B" })], { spacing: { after: 30 }, keepNext: true }));
          if (!v) out.push(p([run("N/A", { size: 19, italics: true, color: "94A3B8" })], { spacing: { after: 120 } }));
          else if (defaultDisplay(b) === "callout")
            out.push(new Paragraph({ children: [run(v, { size: 20 })], shading: { type: ShadingType.CLEAR, fill: TINT, color: "auto" }, border: { left: { style: BorderStyle.SINGLE, size: 24, color: A, space: 8 } }, spacing: { before: 40, after: 160, line: 320 }, indent: { left: 160, right: 120 } }));
          else out.push(...v.split("\n").map((l) => p([run(l, { size: 20 })], { spacing: { after: 80, line: 320 } })), gap(60));
          break;
        }
        case "list": {
          const items = (Array.isArray(raw) ? (raw as string[]) : []).filter((x) => String(x).trim());
          out.push(p([run(b.label.toUpperCase(), { size: 14, bold: true, color: "64748B" })], { spacing: { after: 30 }, keepNext: true }));
          if (!items.length) out.push(p([run("N/A", { size: 19, italics: true, color: "94A3B8" })]));
          items.forEach((it) => out.push(new Paragraph({ bullet: { level: 0 }, children: [run(it, { size: 20 })], spacing: { after: 40 } })));
          out.push(gap(80));
          break;
        }
        case "table":
          await renderTable(b);
          break;
        case "records":
          await renderRecords(b);
          break;
        case "image": {
          const imgs = (Array.isArray(raw) ? (raw as ImageItem[]) : []).filter((x) => x?.src);
          if (b.maxImages === 1) {
            // single picture (e.g. best-day curve): large framed figure, or an empty framed slot
            out.push(p([run(b.label, { size: 23, bold: true })], { spacing: { before: 120, after: 80 }, keepNext: true }));
            if (!imgs.length) {
              if (b.slot !== false)
                out.push(
                  table([new TableRow({ height: { value: 3200, rule: HeightRule.ATLEAST }, children: [cell([p([run(b.label, { size: 22, bold: true, color: "334155" })], { alignment: AlignmentType.CENTER, spacing: { before: 700, after: 40 } }), p([run(b.caption || "SVG or PNG", { size: 17, color: "94A3B8" })], { alignment: AlignmentType.CENTER })], CONTENT_W, { fill: TINT, borders: { top: dashed(A), bottom: dashed(A), left: dashed(A), right: dashed(A) } })] })], [CONTENT_W]),
                  gap(120),
                );
              break;
            }
            const ph = await loadPhoto(imgs[0].src, 600, 330);
            if (ph) out.push(p([img(ph, "jpg")], { alignment: AlignmentType.CENTER, spacing: { after: 40 } }));
            const cap = b.caption || imgs[0].caption;
            if (cap) out.push(p([run(cap, { size: 17, bold: true, color: "64748B" })], { alignment: AlignmentType.CENTER, spacing: { after: 140 } }));
            break;
          }
          out.push(p([run(b.label, { size: 23, bold: true }), run(imgs.length ? `   ${imgs.length}` : "", { size: 17, bold: true, color: A })], { spacing: { before: 120, after: 80 }, keepNext: true }));
          if (!imgs.length) out.push(p([run("No files attached", { size: 18, italics: true, color: "94A3B8" })], { spacing: { after: 120 } }));
          for (const it of imgs) {
            const ph = await loadPhoto(it.src, 560, 640);
            if (ph) out.push(p([img(ph, "jpg")], { alignment: AlignmentType.CENTER, spacing: { after: 40 } }));
            if (it.caption) out.push(p([run(it.caption, { size: 17, color: "64748B" })], { alignment: AlignmentType.CENTER, spacing: { after: 120 } }));
          }
          break;
        }
        case "chart": {
          const svg = chartSvg(b, t, data, 640);
          if (!svg) break;
          const title = b.chart?.title || b.label;
          if (title) out.push(p([run(title, { size: 22, bold: true })], { spacing: { before: 120, after: 60 }, keepNext: true }));
          out.push(p([img(await svgPng(svg))], { alignment: b.chart?.kind === "gauge" ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 160 } }));
          break;
        }
        case "annex": {
          const info = annexes.find((a) => a.block.id === b.id);
          if (!info) break;
          if (info.placement === "here") await emitAnnex(info);
          else
            out.push(
              new Paragraph({
                shading: { type: ShadingType.CLEAR, fill: "F0FDFA", color: "auto" },
                border: { left: { style: BorderStyle.SINGLE, size: 24, color: "14B8A6", space: 6 } },
                spacing: { before: 100, after: 120 },
                indent: { left: 140 },
                children: [new InternalHyperlink({ anchor: `annex_${info.number}`, children: [run(`Annex ${info.number} · ${b.label}`, { size: 20, bold: true, color: "134E4A" }), run("    at the end of the report ›", { size: 16, bold: true, color: "0F766E" })] })],
              }),
            );
          break;
        }
      }
    }
  }

  for (let si = 0; si < t.sections.length; si++) {
    const s = t.sections[si];
    // every section starts on a new page
    out.push(pageStart(), docBanner("section", `Section ${num(si)}`, s.title, s.description, `sec_${si}`), gap(140));
    await emit(s.blocks.filter((b) => !b.hideInExport));
  }
  for (const a of annexes.filter((x) => x.placement === "end")) await emitAnnex(a);

  /* ---------------------------- at a glance ---------------------------- */
  const glance: (Paragraph | Table)[] = [];
  if (hl.length) {
    const per = hl.length <= 4 ? 2 : 3;
    const w = Math.floor(CONTENT_W / per);
    const rows: TableRow[] = [];
    for (let i = 0; i < hl.length; i += per) {
      const cells: TableCell[] = [];
      for (let j = 0; j < per; j++) {
        const h = hl[i + j];
        if (!h) { cells.push(cell([], w)); continue; }
        const v = safeEval(h.value, t, data);
        const kids: (Paragraph | Table)[] = [];
        if (h.look === "ring" && v !== null) {
          kids.push(p([img(await svgPng(ringGauge({ value: v, size: 124, color: t.brand.accent, text: `${formatNumber(v, h.decimals ?? (Number.isInteger(v) ? 0 : 1))}%` }), 110))], { alignment: AlignmentType.CENTER, spacing: { before: 120 } }));
          kids.push(p([run(h.label.toUpperCase(), { size: 15, bold: true, color: "64748B" })], { alignment: AlignmentType.CENTER }));
        } else {
          kids.push(p([run(v === null ? "—" : formatNumber(v, h.decimals), { size: 60, bold: true })], { spacing: { before: 360 } }));
          if (h.unit) kids.push(p([run(h.unit, { size: 20, bold: true, color: "64748B" })], { spacing: { after: 40 } }));
          kids.push(p([run(h.label.toUpperCase(), { size: 15, bold: true, color: "64748B" })]));
        }
        if (h.sub) kids.push(p([run(h.sub, { size: 16, color: "94A3B8" })], { alignment: h.look === "ring" ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 100 } }));
        cells.push(cell(kids, w, { fill: "F8FAFC", borders: { top: { style: BorderStyle.SINGLE, size: 30, color: A }, bottom: line("FFFFFF", 36), left: line("FFFFFF", 36), right: line("FFFFFF", 36) }, margin: 160 }));
      }
      rows.push(new TableRow({ cantSplit: true, height: { value: 2600, rule: HeightRule.ATLEAST }, children: cells }));
    }
    glance.push(docBanner("section", "At a glance", "The month in numbers", `${meta.title}${period ? " · " + period : ""}`, "glance"), gap(160), table(rows, Array(per).fill(w)));
  }

  const footerText = `${t.brand.companyName}${t.brand.footer ? " · " + t.brand.footer : ""}`;
  const letter = st.paper === "Letter";
  const PAGE = letter ? { width: 12240, height: 15840 } : { width: 11906, height: 16838 };
  const side = 1000 + (PAGE.width - 11906) / 2; // keep the content width identical for both paper sizes
  const margins = { top: 1100, bottom: 1000, left: side, right: side, header: 500, footer: 450 };

  const doc = new Document({
    creator: t.brand.companyName,
    title: `${meta.title} ${period}`.trim(),
    styles: {
      default: { document: { run: { font: "Calibri", size: 20 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 40, bold: true, color: A }, paragraph: { outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, color: A }, paragraph: { outlineLevel: 1 } },
      ],
    },
    sections: [
      { properties: { page: { size: PAGE, margin: { ...margins, top: 700, bottom: 700 } } }, children: [coverBand, gap(200), table(metaRows, [mw, mw])] },
      {
        properties: { page: { size: PAGE, margin: margins } },
        headers: {
          default: new Header({ children: [p([run((st.headerText ?? "").trim() || `${meta.title}${period ? " — " + period : ""}`, { size: 16, color: "94A3B8", bold: true })], { alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 4 } } })] }),
        },
        footers: {
          default: new Footer({ children: [p([run(footerText, { size: 16, color: "94A3B8" }), ...(st.showPageNumbers === false ? [] : [run("\tPage ", { size: 16, color: "94A3B8" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "94A3B8" })])], { tabStops: [{ type: "right", position: CONTENT_W }] })] }),
        },
        children: [...(st.showToc === false ? [] : [...toc, new Paragraph({ children: [new PageBreak()] })]), ...(st.showGlance === false ? [] : glance), ...out],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

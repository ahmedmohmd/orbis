import { guard } from "@/lib/auth";
import { getBrowser } from "@/lib/browser";
import { fontCss } from "@/lib/fonts";
import { fileResponse } from "@/lib/stream";
import { getReportWithTemplate } from "@/lib/data";
import { renderReportHtml } from "@/lib/render-html";
import { fileSafe } from "@/lib/utils";
import { inlineAssets, photoFiles } from "@/lib/assets";
import { PDFDocument, PDFName } from "pdf-lib";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const __u = await guard();
  if (__u instanceof Response) return __u;
  const { id } = await params;
  const row = await getReportWithTemplate(id);
  if (!row) return new Response("Not found", { status: 404 });
  const html0 = renderReportHtml(row.template.schema, await inlineAssets(row.report.data), { title: row.report.title, period: row.report.period });
  const html = html0.replace("<style>", `<style>${fontCss()}</style><style>`);
  try {
    const page = await (await getBrowser()).newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 45_000 });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    await page.close();
    // attach every original photo to the PDF itself (paperclip / Attachments panel of any PDF reader)
    let out: Uint8Array = pdf;
    const files = await photoFiles(row.template.schema, row.report.data);
    if (files.length && row.template.schema.settings?.attachPhotos !== false) {
      const doc = await PDFDocument.load(pdf);
      for (const f of files) await doc.attach(new Uint8Array(f.data), f.path.replace(/\//g, " - "), { mimeType: f.mime, description: f.label });
      doc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseAttachments")); // open the Attachments panel
      out = await doc.save();
    }
    return fileResponse(out, "application/pdf", `${fileSafe(row.report.title + " " + row.report.period)}.pdf`);
  } catch (e) {
    return new Response(`PDF export failed: ${(e as Error).message}\n(Local: run \"npm run setup:pdf\" once. Vercel: see README, \"Deploying to Vercel\".)`, { status: 500 });
  }
}

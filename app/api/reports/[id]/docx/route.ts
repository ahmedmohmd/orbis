import { guard } from "@/lib/auth";
import { getReportWithTemplate } from "@/lib/data";
import { renderReportDocx } from "@/lib/render-docx";
import { fileSafe } from "@/lib/utils";
import { inlineAssets } from "@/lib/assets";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const __u = await guard();
  if (__u instanceof Response) return __u;
  const { id } = await params;
  const row = await getReportWithTemplate(id);
  if (!row) return new Response("Not found", { status: 404 });
  const buf = await renderReportDocx(row.template.schema, await inlineAssets(row.report.data), { title: row.report.title, period: row.report.period });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileSafe(row.report.title + " " + row.report.period)}.docx"`,
    },
  });
}

import { guard } from "@/lib/auth";
import { getReportWithTemplate } from "@/lib/data";
import { photoFiles } from "@/lib/assets";
import { makeZip } from "@/lib/zip";
import { fileSafe } from "@/lib/utils";

export const runtime = "nodejs";

/** All original photos of the report (documents, persons, national IDs, PTWs…) in one ZIP, grouped in folders. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const __u = await guard();
  if (__u instanceof Response) return __u;
  const { id } = await params;
  const row = await getReportWithTemplate(id);
  if (!row) return new Response("Not found", { status: 404 });
  const files = await photoFiles(row.template.schema, row.report.data);
  if (!files.length) return new Response("This report has no photos yet.", { status: 404 });
  const zip = makeZip(files.map((f) => ({ path: f.path, data: f.data })));
  return new Response(new Uint8Array(zip), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${fileSafe(row.report.title + " photos")}.zip"` },
  });
}

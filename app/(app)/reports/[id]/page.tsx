import { notFound } from "next/navigation";
import { getReportWithTemplate } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { ReportEditor } from "@/components/report-editor";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const row = await getReportWithTemplate(id);
  if (!row) notFound();
  return (
    <ReportEditor
      id={row.report.id}
      initialTitle={row.report.title}
      initialStatus={row.report.status}
      initialData={row.report.data}
      template={row.template.schema}
      templateId={row.template.id}
      canEditTemplate={user.role === "admin"}
    />
  );
}

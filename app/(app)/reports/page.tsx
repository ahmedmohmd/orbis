import { ensureSeed, listReports, listTemplates } from "@/lib/data";
import { ReportsList } from "@/components/reports-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  await ensureSeed();
  const [reports, templates, sp] = await Promise.all([listReports(), listTemplates(), searchParams]);
  return (
    <ReportsList
      initialOpen={sp.new === "1"}
      reports={reports.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }))}
      templates={templates.map((t) => ({ id: t.id, name: t.name }))}
    />
  );
}

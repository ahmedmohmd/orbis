import { requireAdmin } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getTemplate } from "@/lib/data";
import { TemplateBuilder } from "@/components/template-builder";

export const dynamic = "force-dynamic";

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const t = await getTemplate(id);
  if (!t) notFound();
  return <TemplateBuilder id={t.id} initialName={t.name} initialSchema={t.schema} />;
}

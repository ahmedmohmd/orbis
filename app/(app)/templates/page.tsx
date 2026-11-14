import { requireAdmin } from "@/lib/auth";
import { listTemplates } from "@/lib/data";
import { TemplateList } from "@/components/template-list";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireAdmin();
  const t = await listTemplates();
  return <TemplateList templates={t.map((x) => ({ id: x.id, name: x.name, description: x.description, sections: x.schema.sections.length, fields: x.schema.sections.reduce((a, s) => a + s.blocks.length, 0), accent: x.schema.brand.accent, accent2: x.schema.brand.accent2 }))} />;
}

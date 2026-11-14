import { SettingsPage } from "@/components/settings-page";
import { requireAdmin } from "@/lib/auth";
import { ensureSeed, getTemplate, listTemplates } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await requireAdmin();
  await ensureSeed();
  const [all, sp] = await Promise.all([listTemplates(), searchParams]);
  const t = (sp.t && (await getTemplate(sp.t))) || (all[0] && (await getTemplate(all[0].id)));
  if (!t) return <p className="p-10 text-muted-foreground">No template yet – create one in Templates.</p>;
  return <SettingsPage key={t.id} templates={all.map((x) => ({ id: x.id, name: x.name }))} templateId={t.id} initialName={t.name} initialSchema={t.schema} />;
}

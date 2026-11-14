"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, LayoutTemplate, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

type T = { id: string; name: string; description: string; sections: number; fields: number; accent: string; accent2: string };

export function TemplateList({ templates }: { templates: T[] }) {
  const router = useRouter();
  async function create(body: object) {
    const res = await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const row = await res.json();
    router.push(`/templates/${row.id}`);
  }
  async function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (!res.ok) alert((await res.json()).error);
    router.refresh();
  }
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <PageHeader title="Templates" icon={<LayoutTemplate className="size-6" />} description="A template defines the sections, fields, tables and charts of a report. Change it and every report using it updates." actions={<><Button variant="outline" onClick={() => create({ name: "Blank template", blank: true })}><Plus className="size-4" />Blank template</Button><Button onClick={() => create({ name: "Station report (latest starter)" })}><Plus className="size-4" />New from latest starter</Button></>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id} className="relative flex flex-col gap-3 overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/5">
            <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})` }} />
            <Link href={`/templates/${t.id}`} className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})` }}><LayoutTemplate className="size-5" /></span>
              <div><div className="font-semibold">{t.name}</div><div className="text-sm text-muted-foreground">{t.sections} sections · {t.fields} fields</div></div>
            </Link>
            {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
            <div className="mt-auto flex gap-2 border-t pt-3">
              <Button size="sm" asChild><Link href={`/templates/${t.id}`}>Edit</Link></Button>
              <Button size="sm" variant="outline" asChild><Link href={`/settings?t=${t.id}`}>Settings</Link></Button>
              <Button size="sm" variant="outline" onClick={() => create({ name: `${t.name} (copy)`, duplicateOf: t.id })}><Copy className="size-3.5" />Duplicate</Button>
              <Button size="xs" variant="ghost" className="ml-auto" onClick={() => remove(t.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

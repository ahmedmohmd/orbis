"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarDays, Copy, FileDown, FileText, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type R = { id: string; title: string; period: string; status: string; updatedAt: string; templateName: string };
type T = { id: string; name: string };

export const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  review: { label: "In review", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  sent: { label: "Sent", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
};
export const StatusPill = ({ status }: { status: string }) => {
  const s = STATUS[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", s.cls)}><i className="size-1.5 rounded-full bg-current" />{s.label}</span>;
};

export function ReportsList({ reports, templates, initialOpen = false }: { reports: R[]; templates: T[]; initialOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState({ templateId: templates[0]?.id ?? "", title: reports[0]?.title ?? "Station", period: "", copyFrom: reports[0]?.id ?? "" });

  const shown = useMemo(() => reports.filter((r) => (status === "all" || r.status === status) && `${r.title} ${r.period} ${r.templateName}`.toLowerCase().includes(q.toLowerCase())), [reports, q, status]);

  async function create() {
    setBusy(true);
    const res = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, copyFrom: form.copyFrom || undefined }) });
    const row = await res.json();
    router.push(`/reports/${row.id}`);
  }
  async function remove(id: string) {
    if (!confirm("Delete this report permanently?")) return;
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <PageHeader title="Reports" icon={<FileText className="size-6" />} description="Create the monthly report, fill it in over time, then export it to PDF or Word." actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" />New report</Button>} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search reports…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {["all", "draft", "review", "sent"].map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors", status === s ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>{s === "all" ? "All" : STATUS[s].label}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((r) => (
          <Card key={r.id} className="group relative flex flex-col gap-4 overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/5">
            <span className="brand-gradient absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity group-hover:opacity-100" />
            <Link href={`/reports/${r.id}`} className="flex items-start gap-4">
              <span className="brand-gradient grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg shadow-blue-500/20"><FileText className="size-5" /></span>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{r.title}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="size-3.5" />{r.period || "No period"}</div>
                <div className="truncate text-xs text-muted-foreground/80">{r.templateName}</div>
              </div>
            </Link>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <StatusPill status={r.status} />
              <span>Updated {new Date(r.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 border-t pt-3">
              <Button size="sm" variant="outline" asChild><a href={`/api/reports/${r.id}/pdf`}><FileDown className="size-3.5" />PDF</a></Button>
              <Button size="sm" variant="outline" asChild><a href={`/api/reports/${r.id}/docx`}><FileDown className="size-3.5" />Word</a></Button>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { setForm((f) => ({ ...f, copyFrom: r.id, title: r.title })); setOpen(true); }}><Copy className="size-3.5" />Next month</Button>
              <Button size="xs" variant="ghost" onClick={() => remove(r.id)} aria-label="Delete"><Trash2 className="size-3.5 text-destructive" /></Button>
            </div>
          </Card>
        ))}
        {!shown.length && (
          <Card className="col-span-full grid place-items-center gap-3 p-14 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground"><FileText className="size-6" /></span>
            <div className="font-semibold">{reports.length ? "No report matches your search" : "No reports yet"}</div>
            <p className="max-w-sm text-sm text-muted-foreground">{reports.length ? "Try another word or clear the filter." : "Create your first monthly report – you can start from last month so only the changes need typing."}</p>
            {!reports.length && <Button onClick={() => setOpen(true)}><Plus className="size-4" />New report</Button>}
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="New report" description="Optionally start from a previous month so you only change what is different.">
          <div className="grid gap-3">
            <div className="grid gap-1"><Label>Template</Label>
              <Select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></div>
            <div className="grid gap-1"><Label>Report title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid gap-1"><Label>Reporting period</Label><Input placeholder="e.g. Nov 2026" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
            <div className="grid gap-1"><Label>Copy data from</Label>
              <Select value={form.copyFrom} onChange={(e) => setForm({ ...form, copyFrom: e.target.value })}>
                <option value="">Empty report</option>
                {reports.map((r) => <option key={r.id} value={r.id}>{r.title} – {r.period}</option>)}
              </Select></div>
            <Button disabled={busy || !form.templateId || !form.period} onClick={create}>{busy ? "Creating…" : "Create report"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, FileDown, Images, Save, History, Loader2, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldInput } from "@/components/field-input";
import { renderReportHtml } from "@/lib/render-html";
import { annexNumbers } from "@/lib/annex";
import type { ReportData, TemplateSchema } from "@/lib/types";

export function ReportEditor({ id, initialTitle, initialStatus, initialData, template, templateId, canEditTemplate = false }: {
  id: string; initialTitle: string; initialStatus: string; initialData: ReportData; template: TemplateSchema; templateId: string; canEditTemplate?: boolean;
}) {
  const [data, setData] = useState<ReportData>(initialData);
  const [title, setTitleState] = useState(initialTitle);
  const [status, setStatusState] = useState(initialStatus);
  const [saving, setSaving] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [recovered, setRecovered] = useState(false);

  /* ---- safe incremental saving ----
     Only the fields you touched are sent (merged into the stored JSON on the server),
     failed saves are retried and mirrored to localStorage so nothing is lost. */
  const pending = useRef<Record<string, unknown>>({});
  const meta = useRef<{ title?: string; status?: string }>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inflight = useRef(false);
  const backupKey = `report-draft:${id}`;
  const hasPending = () => Object.keys(pending.current).length > 0 || Object.keys(meta.current).length > 0;

  const backup = useCallback(() => {
    try {
      if (hasPending()) localStorage.setItem(backupKey, JSON.stringify({ changes: pending.current, meta: meta.current }));
      else localStorage.removeItem(backupKey);
    } catch {}
  }, [backupKey]);

  const flush = useCallback(async () => {
    if (inflight.current || !hasPending()) return;
    const changes = pending.current;
    const m = meta.current;
    pending.current = {};
    meta.current = {};
    inflight.current = true;
    setSaving("saving");
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changes, ...m }) });
      if (!res.ok) throw new Error(String(res.status));
      inflight.current = false;
      if (hasPending()) { void flush(); } else { setSaving("saved"); }
      backup();
    } catch {
      pending.current = { ...changes, ...pending.current }; // newer edits win
      meta.current = { ...m, ...meta.current };
      inflight.current = false;
      setSaving("error");
      backup();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 5000); // retry
    }
  }, [id, backup]);

  const schedule = useCallback((ms = 700) => {
    setSaving("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), ms);
  }, [flush]);

  const set = (key: string, v: unknown) => {
    setData((d) => ({ ...d, [key]: v }));
    pending.current[key] = v;
    backup();
    schedule();
  };
  const setTitle = (v: string) => { setTitleState(v); meta.current.title = v; backup(); schedule(); };
  const setStatus = (v: string) => { setStatusState(v); meta.current.status = v; backup(); schedule(0); };

  // recover edits that never reached the server (tab closed offline, crash…)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(backupKey);
      if (!raw) return;
      const { changes, meta: m } = JSON.parse(raw);
      if (changes && Object.keys(changes).length) { setData((d) => ({ ...d, ...changes })); pending.current = changes; setRecovered(true); }
      if (m?.title) setTitleState(m.title);
      if (m?.status) setStatusState(m.status);
      meta.current = m ?? {};
      if (hasPending()) schedule(300);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); clearTimeout(timer.current); void flush(); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [flush]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (hasPending() || inflight.current) { e.preventDefault(); e.returnValue = ""; } };
    const hide = () => { if (document.visibilityState === "hidden") void flush(); };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("visibilitychange", hide);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("visibilitychange", hide); };
  }, [flush]);

  const period = typeof data.period === "string" ? data.period : "";
  const [previewHtml, setPreviewHtml] = useState("");
  const [tab, setTab] = useState("edit");
  useEffect(() => {
    if (tab !== "preview") return;
    const h = setTimeout(() => setPreviewHtml(renderReportHtml(template, data, { title, period })), 150);
    return () => clearTimeout(h);
  }, [tab, data, title, period, template]);

  const nav = useMemo(() => [{ id: "cover", title: "Cover" }, ...template.sections.map((s) => ({ id: s.id, title: s.title }))], [template]);

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="sticky top-14 z-30 lg:top-0 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
          <Input className="max-w-xs font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select className="w-32" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Draft</option><option value="review">In review</option><option value="sent">Sent</option>
          </Select>
          <TabsList><TabsTrigger value="edit">Edit</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger></TabsList>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {saving === "saving" || saving === "dirty" ? <><Loader2 className="size-3 animate-spin" />Saving…</> : saving === "saved" ? <><Check className="size-3 text-emerald-500" />All changes saved</> : saving === "error" ? <span className="text-destructive">Not saved yet – retrying (kept safely in this browser)</span> : null}
          </span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant={saving === "saved" || saving === "idle" ? "outline" : "default"} onClick={() => { clearTimeout(timer.current); void flush(); }} disabled={saving === "saving"}>
              {saving === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : saving === "saved" || saving === "idle" ? <Check className="size-3.5 text-emerald-500" /> : <Save className="size-3.5" />}
              {saving === "saved" || saving === "idle" ? "Saved" : "Save"}
            </Button>
            <HistoryButton id={id} />
            {canEditTemplate && <Button size="sm" variant="outline" asChild><Link href={`/templates/${templateId}`}><Settings2 className="size-3.5" />Edit template</Link></Button>}
            <Button size="sm" asChild><a href={`/api/reports/${id}/pdf`}><FileDown className="size-3.5" />PDF</a></Button>
            <Button size="sm" variant="secondary" asChild><a href={`/api/reports/${id}/docx`}><FileDown className="size-3.5" />Word</a></Button>
            <Button size="sm" variant="secondary" asChild title="All original photos (documents, persons, national IDs, PTWs…) in one ZIP"><a href={`/api/reports/${id}/photos`}><Images className="size-3.5" />Photos ZIP</a></Button>
          </div>
        </div>
      </div>

      {recovered && <div className="bg-amber-500/15 px-4 py-2 text-center text-xs text-amber-600 dark:text-amber-400">Recovered edits that had not been saved last time – they are being saved now.</div>}
      <TabsContent value="edit">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <nav className="sticky top-32 grid gap-0.5 text-sm">
              {nav.map((n, i) => (
                <a key={n.id} href={`#${n.id}`} className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <span className="mr-2 text-xs tabular-nums opacity-60">{i ? String(i).padStart(2, "0") : "··"}</span>{n.title}
                </a>
              ))}
            </nav>
          </aside>
          <div className="grid min-w-0 gap-6">
            <Card id="cover" className="scroll-mt-32 p-5">
              <h2 className="mb-4 text-lg font-semibold">Cover page</h2>
              <Fields blocks={template.cover} template={template} data={data} set={set} />
            </Card>
            {template.sections.map((s, i) => (
              <Card key={s.id} id={s.id} className="scroll-mt-32 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white">{String(i + 1).padStart(2, "0")}</span>
                  <div><h2 className="text-lg font-semibold leading-tight">{s.title}</h2>{s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}</div>
                </div>
                <Fields blocks={s.blocks} template={template} data={data} set={set} />
              </Card>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="preview">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <p className="mb-2 text-xs text-muted-foreground">Exports always use this light layout, whatever theme the app is in.</p>
          <iframe title="Report preview" className="h-[calc(100vh-10rem)] w-full rounded-lg border bg-white" srcDoc={previewHtml} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

const SPAN: Record<string, string> = { full: "md:col-span-12", half: "md:col-span-6", third: "md:col-span-4", quarter: "md:col-span-3" };
function Fields({ blocks, template, data, set }: { blocks: TemplateSchema["cover"]; template: TemplateSchema; data: ReportData; set: (k: string, v: unknown) => void }) {
  const nums = annexNumbers(template);
  return (
    <div className="grid grid-cols-12 gap-4">
      {blocks.map((b) => {
        if (b.type === "annex")
          return (
            <div key={b.id} className="col-span-12 rounded-xl border-2 border-teal-500/40 bg-teal-500/5 p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-8 min-w-10 place-items-center rounded-lg bg-gradient-to-br from-teal-700 to-teal-500 px-2 text-sm font-bold text-white">A{nums.get(b.key)}</span>
                <div><div className="font-semibold leading-tight">Annex {nums.get(b.key)} · {b.label}</div>{b.description && <div className="text-xs text-muted-foreground">{b.description}</div>}</div>
              </div>
              {(b.children ?? []).length ? <Fields blocks={b.children ?? []} template={template} data={data} set={set} /> : <p className="text-xs text-muted-foreground">This annex has no fields yet – add them in the template builder.</p>}
            </div>
          );
        const wide = ["table", "records", "textarea", "list", "image", "heading", "chart"].includes(b.type);
        const w = wide ? "full" : b.width === "quarter" || b.width === "third" ? b.width : "half";
        return (
          <div key={b.id} className={`col-span-12 ${SPAN[w]}`}>
            <FieldInput block={b} template={template} data={data} value={data[b.key]} onChange={(v) => set(b.key, v)} />
          </div>
        );
      })}
    </div>
  );
}

type Revision = { id: string; title: string; created_at: string; bytes: number };

/** Version history: every ≤30 min a snapshot is stored; restoring never destroys the current state. */
function HistoryButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Revision[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setRows(null);
    setErr("");
    fetch(`/api/reports/${id}/history`).then((r) => r.json()).then(setRows).catch(() => setErr("Could not load the history."));
  }, [open, id]);

  async function restore(revisionId: string) {
    if (!confirm("Restore this version? The current version is saved to the history first, so you can undo this.")) return;
    setBusy(revisionId);
    try {
      const r = await fetch(`/api/reports/${id}/history`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ revisionId }) });
      if (!r.ok) throw new Error();
      try { localStorage.removeItem(`report-draft:${id}`); } catch { /* ignore */ }
      location.reload();
    } catch {
      setErr("Restore failed – nothing was changed.");
      setBusy(null);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><History className="size-3.5" />History</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Version history" description="Automatic snapshots of this report. Restoring is always reversible.">
          {err && <p className="mb-2 text-sm text-destructive">{err}</p>}
          {rows === null && !err && <p className="text-sm text-muted-foreground"><Loader2 className="mr-1 inline size-3 animate-spin" />Loading…</p>}
          {rows?.length === 0 && <p className="text-sm text-muted-foreground">No snapshots yet – they appear automatically while you edit.</p>}
          <ul className="grid gap-2">
            {rows?.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm">
                <div>
                  <div className="font-medium">{new Date(r.created_at).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{r.title} · {(Number(r.bytes) / 1024).toFixed(1)} KB</div>
                </div>
                <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => restore(r.id)}>
                  {busy === r.id ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}Restore
                </Button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Check, Eye, FileOutput, FileText, Image as ImageIcon, LayoutTemplate, Loader2, Palette, Save, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { renderReportHtml } from "@/lib/render-html";
import { THEMES, resolveTheme } from "@/lib/themes";
import type { ReportSettings, TemplateSchema } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tpl = { id: string; name: string };
const TABS = [
  { id: "appearance", label: "Appearance", hint: "Colour theme", icon: Palette },
  { id: "company", label: "Company", hint: "Name, header, footer", icon: Building2 },
  { id: "layout", label: "Cover & layout", hint: "Paper, cover, pages", icon: LayoutTemplate },
  { id: "export", label: "Export & photos", hint: "PDF, Word, attachments", icon: FileOutput },
  { id: "preview", label: "Live preview", hint: "See the whole report", icon: Eye },
] as const;
type TabId = (typeof TABS)[number]["id"];

const Row = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-4 border-b py-4 last:border-0">
    <div className="min-w-0 max-w-md"><div className="text-sm font-semibold">{title}</div>{hint && <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</div>}</div>
    <div className="shrink-0">{children}</div>
  </div>
);
const Section = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <Card className="mb-6 p-6"><h2 className="text-lg font-bold">{title}</h2>{desc && <p className="mb-2 mt-1 text-sm text-muted-foreground">{desc}</p>}<div className="mt-2">{children}</div></Card>
);

/** Little report-shaped swatch that shows exactly how a theme looks on cover, banner, table and chart. */
function ThemeSwatch({ accent, accent2, deep, mid }: { accent: string; accent2: string; deep: string; mid: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="h-16" style={{ background: `linear-gradient(135deg, ${deep}, ${mid} 55%, ${accent})` }}><div className="m-3 size-5 rounded-full opacity-90" style={{ background: accent2, boxShadow: `0 0 18px ${accent2}` }} /></div>
      <div className="grid gap-1.5 p-2.5">
        <div className="h-2 rounded" style={{ background: `linear-gradient(90deg, ${deep}, ${accent})` }} />
        <div className="flex h-8 items-end gap-1">{[40, 62, 48, 80, 66, 92].map((h, i) => <i key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `linear-gradient(${accent}, ${accent2})`, opacity: 0.55 + i * 0.09 }} />)}</div>
      </div>
    </div>
  );
}

export function SettingsPage({ templates, templateId, initialName, initialSchema }: { templates: Tpl[]; templateId: string; initialName: string; initialSchema: TemplateSchema }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("appearance");
  const [schema, setSchema] = useState(initialSchema);
  const [state, setState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [preview, setPreview] = useState("");
  const first = useRef(true);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(schema);
  latest.current = schema;

  const st: ReportSettings = schema.settings ?? {};
  const setSt = (p: Partial<ReportSettings>) => setSchema((s) => ({ ...s, settings: { ...(s.settings ?? {}), ...p } }));
  const setBrand = (p: Partial<TemplateSchema["brand"]>) => setSchema((s) => ({ ...s, brand: { ...s.brand, ...p } }));
  const theme = resolveTheme(schema.brand);

  const saveNow = useCallback(async () => {
    clearTimeout(timer.current);
    setState("saving");
    const sent = latest.current;
    try {
      const res = await fetch(`/api/templates/${templateId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: initialName, schema: sent }) });
      if (!res.ok) throw new Error();
      if (latest.current === sent) { dirty.current = false; setState("saved"); } else void saveNow();
    } catch {
      setState("error");
      timer.current = setTimeout(() => void saveNow(), 5000);
    }
  }, [templateId, initialName]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    dirty.current = true;
    setState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveNow(), 800);
    return () => clearTimeout(timer.current);
  }, [schema, saveNow]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void saveNow(); } };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("keydown", key); };
  }, [saveNow]);

  useEffect(() => {
    if (tab !== "preview") return;
    setPreview(renderReportHtml(schema, { period: "Sample period" }, { title: initialName, period: "Sample period" }));
  }, [tab, schema, initialName]);

  const isPreset = (id: string) => schema.brand.theme === id && THEMES.find((x) => x.id === id)?.accent === schema.brand.accent;
  const custom = !THEMES.some((p) => isPreset(p.id));
  const saved = state === "saved" || state === "idle";

  const Toggle = ({ k, def = true }: { k: keyof ReportSettings; def?: boolean }) => <Switch checked={(st[k] as boolean | undefined) ?? def} onCheckedChange={(v) => setSt({ [k]: v } as Partial<ReportSettings>)} />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <PageHeader
        title="Settings"
        icon={<SettingsIcon className="size-6" />}
        description="Everything about how the exported report looks. Changes are saved automatically and apply to every report that uses this template."
        actions={
          <>
            {templates.length > 1 && <Select className="w-52" value={templateId} onChange={(e) => router.push(`/settings?t=${e.target.value}`)}>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>}
            <Button variant={saved ? "outline" : "default"} disabled={state === "saving"} onClick={() => void saveNow()}>
              {state === "saving" ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4 text-emerald-500" /> : <Save className="size-4" />}
              {state === "error" ? "Retry save" : saved ? "Saved" : "Save"}
            </Button>
          </>
        }
      />
      {state === "error" && <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">Could not reach the server – your changes are kept here and will be retried automatically.</p>}

      <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
        <nav className="lg:sticky lg:top-6 lg:self-start">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {TABS.map((t) => (
              <li key={t.id}>
                <button onClick={() => setTab(t.id)} className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all", tab === t.id ? "border-primary/40 bg-accent shadow-sm" : "border-transparent hover:bg-muted")}>
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tab === t.id ? "brand-gradient text-white shadow-md shadow-blue-500/25" : "bg-muted text-muted-foreground")}><t.icon className="size-[18px]" /></span>
                  <span className="min-w-0"><span className="block text-sm font-semibold">{t.label}</span><span className="block truncate text-xs text-muted-foreground">{t.hint}</span></span>
                </button>
              </li>
            ))}
          </ul>
          <Link href={`/templates/${templateId}`} className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Sparkles className="size-4" />Edit sections & fields in the template builder</Link>
        </nav>

        <div className="min-w-0">
          {tab === "appearance" && (
            <>
              <Section title="Colour theme" desc="Pick a ready-made look. The report is always printed on a light page; the theme colours the cover, section banners, table headers, charts and annexes.">
                <div className="grid gap-4 sm:grid-cols-2">
                  {THEMES.map((p) => {
                    const on = isPreset(p.id);
                    const r = resolveTheme({ ...p, theme: p.id });
                    return (
                      <button key={p.id} onClick={() => setBrand({ theme: p.id, accent: p.accent, accent2: p.accent2 })} className={cn("relative grid gap-3 rounded-2xl border-2 p-3 text-left transition-all", on ? "border-primary shadow-lg shadow-blue-500/10" : "border-border hover:border-primary/40")}>
                        {on && <span className="brand-gradient absolute right-3 top-3 z-10 grid size-6 place-items-center rounded-full text-white"><Check className="size-3.5" /></span>}
                        <ThemeSwatch {...r} />
                        <div><div className="font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">{p.blurb}</div></div>
                      </button>
                    );
                  })}
                </div>
              </Section>
              <Section title="Custom brand colours" desc="Use your company colours instead. Banners and covers are derived from the main colour automatically.">
                <div className="grid items-center gap-6 sm:grid-cols-[1fr_200px]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {([["accent", "Main colour"], ["accent2", "Accent colour"]] as const).map(([k, l]) => (
                      <div key={k} className="grid gap-1.5">
                        <Label>{l}</Label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={schema.brand[k]} onChange={(e) => setBrand({ [k]: e.target.value, theme: "custom" })} className="h-10 w-14 cursor-pointer rounded-lg border bg-card p-1" />
                          <Input value={schema.brand[k]} onChange={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && setBrand({ [k]: e.target.value, theme: "custom" })} className="font-mono uppercase" maxLength={7} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={cn("rounded-2xl border-2 p-2", custom ? "border-primary" : "border-transparent")}><ThemeSwatch {...theme} /><div className="mt-2 text-center text-xs text-muted-foreground">{custom ? "Custom colours in use" : "Preview of current theme"}</div></div>
                </div>
              </Section>
            </>
          )}

          {tab === "company" && (
            <Section title="Company & wording" desc="Texts printed on the cover and on every page.">
              <div className="grid gap-5">
                <div className="grid gap-1.5"><Label>Company name</Label><Input value={schema.brand.companyName} onChange={(e) => setBrand({ companyName: e.target.value })} /><span className="text-xs text-muted-foreground">Printed on the cover and in the page footer.</span></div>
                <div className="grid gap-1.5"><Label>Footer text</Label><Input value={schema.brand.footer} onChange={(e) => setBrand({ footer: e.target.value })} placeholder="e.g. Confidential – for internal use" /><span className="text-xs text-muted-foreground">Appears after the company name at the bottom of every page.</span></div>
                <div className="grid gap-1.5"><Label>Page header text</Label><Input value={st.headerText ?? ""} onChange={(e) => setSt({ headerText: e.target.value })} placeholder="Leave empty for “Report title · Period”" /><span className="text-xs text-muted-foreground">Small text at the top of every page.</span></div>
              </div>
            </Section>
          )}

          {tab === "layout" && (
            <>
              <Section title="Cover style" desc="The artwork on the first page.">
                <div className="grid gap-3 sm:grid-cols-3">
                  {([["rays", "Sunrise", "Sun, rings and waves"], ["waves", "Waves", "Soft glow and waves"], ["clean", "Clean", "Plain gradient"]] as const).map(([k, l, d]) => {
                    const on = (st.coverStyle ?? "rays") === k;
                    return (
                      <button key={k} onClick={() => setSt({ coverStyle: k })} className={cn("grid gap-2 rounded-2xl border-2 p-3 text-left transition-all", on ? "border-primary shadow-lg shadow-blue-500/10" : "border-border hover:border-primary/40")}>
                        <div className="relative h-24 overflow-hidden rounded-lg" style={{ background: `linear-gradient(135deg, ${theme.deep}, ${theme.mid} 55%, ${theme.accent})` }}>
                          {k !== "clean" && <i className="absolute right-3 top-3 size-8 rounded-full opacity-90" style={{ background: theme.accent2, boxShadow: `0 0 30px ${theme.accent2}` }} />}
                          {k === "rays" && <><i className="absolute right-[-6px] top-[-6px] size-[52px] rounded-full border border-white/30" /><i className="absolute right-[-18px] top-[-18px] size-[76px] rounded-full border border-white/20" /></>}
                          {k !== "clean" && <svg viewBox="0 0 100 30" className="absolute inset-x-0 bottom-0 w-full" preserveAspectRatio="none"><path d="M0 18 C 20 8, 35 26, 55 16 S 85 10, 100 18 V30 H0Z" fill="#fff" opacity=".18" /></svg>}
                        </div>
                        <div><div className="text-sm font-semibold">{l}</div><div className="text-xs text-muted-foreground">{d}</div></div>
                      </button>
                    );
                  })}
                </div>
              </Section>
              <Section title="Pages">
                <Row title="Paper size" hint="Used by both PDF and Word."><Select className="w-40" value={st.paper ?? "A4"} onChange={(e) => setSt({ paper: e.target.value as "A4" | "Letter" })}><option value="A4">A4 (210 × 297 mm)</option><option value="Letter">US Letter</option></Select></Row>
                <Row title="Page numbers" hint="Show the page counter in the footer."><Toggle k="showPageNumbers" /></Row>
                <Row title="Table of contents" hint="The contents page after the cover, with the annex list."><Toggle k="showToc" /></Row>
                <Row title="“At a glance” page" hint="The key-number tiles and gauges page. Edit the tiles in the template builder."><Toggle k="showGlance" /></Row>
                <Row title="Every section on a new page" hint="Always on – each section starts on its own page."><span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Always</span></Row>
              </Section>
            </>
          )}

          {tab === "export" && (
            <Section title="Photos & export" desc="What HSE and your manager receive.">
              <Row title="Attach original photos inside the PDF" hint="Induction documents, persons, national IDs, PTWs… are embedded at full quality. Open the PDF reader’s Attachments panel to save them."><Toggle k="attachPhotos" /></Row>
              <Row title="All photos as one ZIP" hint="Always available from the report page (button “Photos ZIP”), grouped in folders per section."><span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ImageIcon className="size-4" />Report page</span></Row>
              <Row title="Word export" hint="Uses the same colours, paper size, header, footer and page numbers. Photos are embedded in the Word file."><span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><FileText className="size-4" />Follows these settings</span></Row>
            </Section>
          )}

          {tab === "preview" && (
            <Card className="p-3">
              <p className="mb-2 px-1 text-xs text-muted-foreground">Layout preview with sample data. Change anything on the other tabs and it updates here.</p>
              <iframe title="Report preview" className="h-[calc(100vh-12rem)] min-h-[520px] w-full rounded-xl border bg-white" srcDoc={preview} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

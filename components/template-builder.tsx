"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, Copy, Eye, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlockEditor } from "@/components/block-editor";
import { renderReportHtml } from "@/lib/render-html";
import { FIELD_TYPES, slug, uid, type Block, type FieldType, type Highlight, type Section, type TemplateSchema } from "@/lib/types";
import { allBlocks, validateFormula } from "@/lib/formula";
import { annexNumbers } from "@/lib/annex";
import { INDUCTION_FIELDS } from "@/lib/records";

const move = <T,>(arr: T[], i: number, d: -1 | 1): T[] => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const c = [...arr];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
};

export function TemplateBuilder({ id, initialName, initialSchema }: { id: string; initialName: string; initialSchema: TemplateSchema }) {
  const [schema, setSchema] = useState(initialSchema);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [editing, setEditing] = useState<{ scope: "cover" | string; blockId: string } | null>(null);
  const [adding, setAdding] = useState<"cover" | string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState("build");
  const [previewHtml, setPreviewHtml] = useState("");
  const first = useRef(true);
  const [wiz, setWiz] = useState<null | { title: string; desc: string; text: boolean; numbers: boolean; photos: "none" | "one" | "many"; table: boolean; log: boolean }>(null);

  const latest = useRef({ name, schema });
  latest.current = { name, schema };
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveNow = useCallback(async () => {
    clearTimeout(timer.current);
    setSaving("saving");
    const sent = latest.current;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sent) });
      if (!res.ok) throw new Error();
      if (latest.current.schema === sent.schema && latest.current.name === sent.name) { dirty.current = false; setSaving("saved"); } else void saveNow();
    } catch {
      setSaving("error");
      timer.current = setTimeout(() => void saveNow(), 5000);
    }
  }, [id]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    dirty.current = true;
    setSaving("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveNow(), 800);
    return () => clearTimeout(timer.current);
  }, [schema, name, saveNow]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void saveNow(); } };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("keydown", key); };
  }, [saveNow]);

  useEffect(() => {
    if (tab !== "preview") return;
    // preview shows the template with sample placeholders (empty data) so layout & charts structure are visible
    setPreviewHtml(renderReportHtml(schema, { period: "Sample period" }, { title: name, period: "Sample period" }));
  }, [tab, schema, name]);

  const patch = (p: Partial<TemplateSchema>) => setSchema((s) => ({ ...s, ...p }));
  const patchSection = (sid: string, p: Partial<Section>) => setSchema((s) => ({ ...s, sections: s.sections.map((x) => (x.id === sid ? { ...x, ...p } : x)) }));
  // scopes: "cover" | <sectionId> | "annex:<annexBlockId>" (the fields inside an annex)
  const findAnnex = (id: string) => schema.sections.flatMap((s) => s.blocks).find((b) => b.id === id && b.type === "annex");
  const blocksOf = (scope: string): Block[] =>
    scope === "cover" ? schema.cover : scope.startsWith("annex:") ? findAnnex(scope.slice(6))?.children ?? [] : schema.sections.find((s) => s.id === scope)?.blocks ?? [];
  const setBlocks = (scope: string, blocks: Block[]) => {
    if (scope === "cover") return patch({ cover: blocks });
    if (scope.startsWith("annex:")) {
      const id = scope.slice(6);
      return patch({ sections: schema.sections.map((s) => ({ ...s, blocks: s.blocks.map((b) => (b.id === id ? { ...b, children: blocks } : b)) })) });
    }
    return patchSection(scope, { blocks });
  };
  const nums = annexNumbers(schema);

  function uniqueKey(label: string) {
    const used = new Set(allBlocks(schema).map((b) => b.key));
    const base = slug(label);
    let k = base, n = 2;
    while (used.has(k)) k = `${base}_${n++}`;
    return k;
  }

  function addInductionPreset(scope: string) {
    const b: Block = { id: uid(), key: uniqueKey("inductions"), label: "Induction register", type: "records", itemLabel: "induction", view: "both", fields: structuredClone(INDUCTION_FIELDS) };
    setBlocks(scope, [...blocksOf(scope), b]);
    setAdding(null);
    setEditing({ scope, blockId: b.id });
  }

  function createSection() {
    if (!wiz) return;
    const used = new Set(allBlocks(schema).map((b) => b.key));
    const mk = (label: string, type: FieldType, extra: Partial<Block> = {}): Block => {
      const base = slug(label);
      let k = base, n = 2;
      while (used.has(k)) k = `${base}_${n++}`;
      used.add(k);
      return { id: uid(), key: k, label, type, ...extra };
    };
    const blocks: Block[] = [];
    if (wiz.numbers) blocks.push(mk("Key number 1", "number", { display: "card", width: "quarter" }), mk("Key number 2", "number", { display: "card", width: "quarter" }));
    if (wiz.text) blocks.push(mk("Notes", "textarea"));
    if (wiz.table) blocks.push(mk("Table", "table", { columns: [{ key: "col1", label: "Column 1", type: "text" }, { key: "col2", label: "Column 2", type: "text" }, { key: "col3", label: "Column 3", type: "text" }] }));
    if (wiz.log) blocks.push(mk("Entries", "records", { itemLabel: "entry", view: "both", fields: [{ key: "date", label: "Date", type: "date" }, { key: "details", label: "Details", type: "textarea" }, { key: "photos", label: "Photos", type: "image" }] }));
    if (wiz.photos !== "none") blocks.push(mk("Photos", "image", wiz.photos === "one" ? { maxImages: 1 } : {}));
    const sec: Section = { id: uid(), title: wiz.title || "New section", description: wiz.desc || undefined, blocks };
    patch({ sections: [...schema.sections, sec] });
    setWiz(null);
    setOpen((o) => ({ ...o, [sec.id]: true }));
  }

  function addBlock(scope: string, type: FieldType, label: string) {
    const b: Block = {
      id: uid(), key: uniqueKey(label), label, type,
      ...(type === "table" && { columns: [{ key: "col1", label: "Column 1", type: "text" as const }, { key: "col2", label: "Column 2", type: "text" as const }] }),
      ...(type === "select" && { options: ["Option 1", "Option 2"] }),
      ...(type === "computed" && { formula: "0", display: "card" as const }),
      ...(type === "number" && { display: "card" as const, width: "quarter" as const }),
      ...(type === "percent" && { display: "ring" as const, width: "quarter" as const }),
      ...(type === "records" && { itemLabel: "entry", view: "both" as const, fields: [{ key: "date", label: "Date", type: "date" as const }, { key: "notes", label: "Notes", type: "textarea" as const }, { key: "photos", label: "Photos", type: "image" as const }] }),
      ...(type === "annex" && { children: [] as Block[], placement: "end" as const, description: "" }),
      ...(type === "chart" && { chart: { kind: "bar" as const, source: "fields" as const, items: [{ label: "Item", value: "0" }] } }),
    };
    setBlocks(scope, [...blocksOf(scope), b]);
    setAdding(null);
    setEditing({ scope, blockId: b.id });
  }

  const editingBlock = editing ? blocksOf(editing.scope).find((b) => b.id === editing.blockId) : null;

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="sticky top-14 z-30 lg:top-0 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-2.5">
          <Input className="max-w-xs font-semibold" value={name} onChange={(e) => setName(e.target.value)} />
          <TabsList><TabsTrigger value="build">Builder</TabsTrigger><TabsTrigger value="glance">At a glance</TabsTrigger><TabsTrigger value="preview"><Eye className="mr-1 inline size-3.5" />Layout preview</TabsTrigger></TabsList>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {saving === "saving" || saving === "dirty" ? <><Loader2 className="size-3 animate-spin" />Saving…</> : saving === "saved" ? <><Check className="size-3 text-emerald-500" />Saved</> : saving === "error" ? <span className="text-destructive">Save failed</span> : null}
          </span>
          <Button size="sm" className="ml-auto" variant={saving === "saved" || saving === "idle" ? "outline" : "default"} onClick={() => void saveNow()} disabled={saving === "saving"}>
            {saving === "saved" || saving === "idle" ? <Check className="size-3.5 text-emerald-500" /> : <Save className="size-3.5" />}{saving === "saved" || saving === "idle" ? "Saved" : "Save"}
          </Button>
          <Button size="sm" variant="outline" asChild><Link href={`/settings?t=${id}`}>Colours & settings</Link></Button>
          <Button size="sm" variant="outline" asChild><Link href="/templates">All templates</Link></Button>
        </div>
      </div>

      <TabsContent value="build">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 py-6">
          <p className="rounded-lg border border-dashed bg-muted/50 p-3 text-xs text-muted-foreground">
            Add, rename, reorder or delete sections and fields. Changes save automatically and apply to every report that uses this template. Values are stored by field <b>key</b>, so renaming a label never loses data.
          </p>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Cover page fields</h2><Button size="sm" variant="outline" onClick={() => setAdding("cover")}><Plus className="size-3.5" />Add field</Button></div>
            <BlockList scope="cover" blocks={schema.cover} setBlocks={(b) => setBlocks("cover", b)} onEdit={(bid) => setEditing({ scope: "cover", blockId: bid })} />
          </Card>

          {schema.sections.map((s, si) => {
            const isOpen = open[s.id] ?? true;
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-center gap-2">
                  <Button size="xs" variant="ghost" onClick={() => setOpen({ ...open, [s.id]: !isOpen })}>{isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</Button>
                  <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-bold text-white">{String(si + 1).padStart(2, "0")}</span>
                  <Input className="max-w-sm font-semibold" value={s.title} onChange={(e) => patchSection(s.id, { title: e.target.value })} />
                  <Badge>{s.blocks.length} fields</Badge>
                  <div className="ml-auto flex items-center">
                    <Button size="xs" variant="ghost" onClick={() => patch({ sections: move(schema.sections, si, -1) })}><ArrowUp className="size-4" /></Button>
                    <Button size="xs" variant="ghost" onClick={() => patch({ sections: move(schema.sections, si, 1) })}><ArrowDown className="size-4" /></Button>
                    <Button size="xs" variant="ghost" title="Duplicate section" onClick={() => {
                      const copy: Section = { ...structuredClone(s), id: uid(), title: s.title + " (copy)" };
                      const used = new Set(allBlocks(schema).map((b) => b.key));
                      copy.blocks = copy.blocks.map((b) => { let k = b.key + "_2", n = 3; while (used.has(k)) k = `${b.key}_${n++}`; used.add(k); return { ...b, id: uid(), key: b.type === "heading" ? b.key : k }; });
                      patch({ sections: [...schema.sections.slice(0, si + 1), copy, ...schema.sections.slice(si + 1)] });
                    }}><Copy className="size-4" /></Button>
                    <Button size="xs" variant="ghost" onClick={() => confirm(`Delete section “${s.title}” and its ${s.blocks.length} fields?`) && patch({ sections: schema.sections.filter((x) => x.id !== s.id) })}><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                </div>
                {isOpen && (
                  <div className="mt-3 grid gap-3">
                    <Input placeholder="Optional description shown under the section title" value={s.description ?? ""} onChange={(e) => patchSection(s.id, { description: e.target.value })} />
                    <BlockList
                      scope={s.id}
                      blocks={s.blocks}
                      setBlocks={(b) => setBlocks(s.id, b)}
                      onEdit={(bid) => setEditing({ scope: s.id, blockId: bid })}
                      annexNums={nums}
                      renderNested={(b) =>
                        b.type === "annex" ? (
                          <div className="mb-2 ml-5 mt-1 grid gap-2 border-l-2 border-teal-500/60 pl-3">
                            <BlockList scope={`annex:${b.id}`} blocks={b.children ?? []} setBlocks={(c) => setBlocks(`annex:${b.id}`, c)} onEdit={(bid) => setEditing({ scope: `annex:${b.id}`, blockId: bid })} annexNums={nums} />
                            <Button size="sm" variant="outline" className="w-fit" onClick={() => setAdding(`annex:${b.id}`)}><Plus className="size-3.5" />Add field to Annex {nums.get(b.key)}</Button>
                          </div>
                        ) : null
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setAdding(s.id)}><Plus className="size-3.5" />Add field</Button>
                      <Button size="sm" variant="outline" className="border-teal-500/50 text-teal-600 dark:text-teal-400" onClick={() => addBlock(s.id, "annex", "New annex")}><Plus className="size-3.5" />Add annex</Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
          <Button variant="outline" className="w-fit" onClick={() => setWiz({ title: "", desc: "", text: true, numbers: false, photos: "none", table: false, log: false })}><Plus className="size-4" />Add section</Button>
        </div>
      </TabsContent>

      <TabsContent value="glance">
        <div className="mx-auto grid max-w-3xl gap-3 px-4 py-6">
          <p className="rounded-lg border border-dashed bg-muted/50 p-3 text-xs text-muted-foreground">
            The “At a glance” page shows the big numbers of the month right after the table of contents. Each tile is a formula, e.g. <code>{"{total_energy}"}</code> or <code>{"{loss_kwh}/{lv_sold}*100"}</code>. Leave the list empty to skip the page.
          </p>
          {(schema.highlights ?? []).map((h, i, arr) => {
            const upd = (p: Partial<Highlight>) => patch({ highlights: arr.map((x) => (x.id === h.id ? { ...x, ...p } : x)) });
            const err = validateFormula(h.value, schema);
            return (
              <Card key={h.id} className="grid gap-2 p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_1.2fr_100px_90px]">
                  <Input placeholder="Label" value={h.label} onChange={(e) => upd({ label: e.target.value })} />
                  <Input className="font-mono" placeholder="{field} or formula" value={h.value} onChange={(e) => upd({ value: e.target.value })} />
                  <Input placeholder="Unit" value={h.unit ?? ""} onChange={(e) => upd({ unit: e.target.value })} />
                  <Input type="number" min={0} max={4} placeholder="Decimals" value={h.decimals ?? ""} onChange={(e) => upd({ decimals: e.target.value === "" ? undefined : Number(e.target.value) })} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select className="w-44" value={h.look ?? "number"} onChange={(e) => upd({ look: e.target.value as Highlight["look"] })}><option value="number">Big number</option><option value="ring">Progress ring (0–100)</option></Select>
                  <Input className="min-w-48 flex-1" placeholder="Small caption (optional)" value={h.sub ?? ""} onChange={(e) => upd({ sub: e.target.value })} />
                  <Button size="xs" variant="ghost" disabled={i === 0} onClick={() => patch({ highlights: move(arr, i, -1) })}><ArrowUp className="size-4" /></Button>
                  <Button size="xs" variant="ghost" disabled={i === arr.length - 1} onClick={() => patch({ highlights: move(arr, i, 1) })}><ArrowDown className="size-4" /></Button>
                  <Button size="xs" variant="ghost" onClick={() => patch({ highlights: arr.filter((x) => x.id !== h.id) })}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
                {err && <p className="text-xs text-destructive">{err}</p>}
              </Card>
            );
          })}
          <Button variant="outline" className="w-fit" onClick={() => patch({ highlights: [...(schema.highlights ?? []), { id: uid(), label: "New tile", value: "0", look: "number" }] })}><Plus className="size-4" />Add tile</Button>
          <p className="text-xs text-muted-foreground">Tip: 4 tiles or fewer use a 2×2 layout, more use 3 columns.</p>
        </div>
      </TabsContent>

      <TabsContent value="preview">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <p className="mb-2 text-xs text-muted-foreground">Empty-data preview of the template layout. Open a report to see real values.</p>
          <iframe title="Template preview" className="h-[calc(100vh-10rem)] w-full rounded-lg border bg-white" srcDoc={previewHtml} />
        </div>
      </TabsContent>


      {/* add-section wizard */}
      <Dialog open={!!wiz} onOpenChange={(o) => !o && setWiz(null)}>
        <DialogContent title="Add a section" description="Choose what this section should contain. You can change everything afterwards, field by field.">
          {wiz && (
            <div className="grid gap-4">
              <div className="grid gap-1"><Label>Section title</Label><Input autoFocus value={wiz.title} onChange={(e) => setWiz({ ...wiz, title: e.target.value })} placeholder="e.g. Environmental monitoring" /></div>
              <div className="grid gap-1"><Label>Short description (optional)</Label><Input value={wiz.desc} onChange={(e) => setWiz({ ...wiz, desc: e.target.value })} /></div>
              <div className="grid gap-2">
                <Label>What goes into it?</Label>
                {([
                  ["text", "Text notes", "A paragraph you type each month"],
                  ["numbers", "Key numbers", "Values shown as stat cards (units, formulas and rings possible)"],
                  ["table", "A table", "Columns you define – or create it from an Excel sheet"],
                  ["log", "Entries log with photos", "Add entries on different days; each has a date, details and photos"],
                ] as const).map(([k, t, d]) => (
                  <label key={k} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted">
                    <input type="checkbox" className="mt-1" checked={wiz[k]} onChange={(e) => setWiz({ ...wiz, [k]: e.target.checked })} />
                    <span><span className="block text-sm font-medium">{t}</span><span className="text-xs text-muted-foreground">{d}</span></span>
                  </label>
                ))}
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="flex-1"><span className="block text-sm font-medium">Photos</span><span className="text-xs text-muted-foreground">Attach pictures directly to the section</span></span>
                  <Select className="w-44" value={wiz.photos} onChange={(e) => setWiz({ ...wiz, photos: e.target.value as "none" | "one" | "many" })}>
                    <option value="none">No photos</option><option value="one">One photo</option><option value="many">Several photos</option>
                  </Select>
                </div>
              </div>
              <Button onClick={createSection} disabled={!wiz.title.trim()}>Create section</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* add-field picker */}
      <Dialog open={adding !== null} onOpenChange={(o) => !o && setAdding(null)}>
        <DialogContent title="Add a field" description="Choose what kind of content to add." className="max-w-2xl">
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={() => adding && addInductionPreset(adding)} className="rounded-lg border border-primary/50 bg-accent/50 p-3 text-left transition-colors hover:border-primary hover:bg-accent sm:col-span-2">
              <div className="text-sm font-medium">★ Induction register (preset)</div>
              <div className="text-xs text-muted-foreground">Entries with document photo + persons photo + list of persons (In / Out of Karm; national-ID front &amp; back photos only for Out of Karm)</div>
            </button>
            {FIELD_TYPES.filter((t) => !(t.value === "annex" && adding?.startsWith("annex:"))).map((t) => (
              <button key={t.value} onClick={() => adding && addBlock(adding, t.value, t.label === "Sub-heading" ? "New heading" : `New ${t.label.toLowerCase()}`)} className="rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-accent">
                <div className="text-sm font-medium">{t.label}</div><div className="text-xs text-muted-foreground">{t.hint}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* field editor */}
      <Dialog open={!!editingBlock} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title="Edit field" description="Changes apply to all reports using this template." className="max-w-2xl">
          {editingBlock && editing && (
            <BlockEditor
              block={editingBlock}
              schema={schema}
              onChange={(b) => setBlocks(editing.scope, blocksOf(editing.scope).map((x) => (x.id === b.id ? b : x)))}
              onDelete={() => { setBlocks(editing.scope, blocksOf(editing.scope).filter((x) => x.id !== editingBlock.id)); setEditing(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

function BlockList({ blocks, setBlocks, onEdit, annexNums, renderNested }: { scope: string; blocks: Block[]; setBlocks: (b: Block[]) => void; onEdit: (id: string) => void; annexNums?: Map<string, number>; renderNested?: (b: Block) => React.ReactNode }) {
  if (!blocks.length) return <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">No fields yet</p>;
  return (
    <div className="grid gap-1">
      {blocks.map((b, i) => {
        const label = FIELD_TYPES.find((t) => t.value === b.type)?.label ?? b.type;
        const isAnnex = b.type === "annex";
        return (
          <div key={b.id}>
            <div className={`group flex items-center gap-2 rounded-md border px-2 py-1.5 ${b.type === "heading" ? "bg-accent/60 font-semibold" : isAnnex ? "border-teal-500/50 bg-teal-500/10 font-semibold" : "bg-card"}`}>
              <button className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm" onClick={() => onEdit(b.id)}>
                {isAnnex && <span className="grid h-6 min-w-8 place-items-center rounded-md bg-teal-600 px-1.5 text-[11px] font-bold text-white">A{annexNums?.get(b.key) ?? "?"}</span>}
                <span className="truncate">{b.label}</span>
                <Badge className="shrink-0 bg-muted text-muted-foreground">{isAnnex ? (b.placement === "here" ? "Annex · printed here" : "Annex · at the end") : label}</Badge>
                {b.type === "table" && <span className="text-xs text-muted-foreground">{b.columns?.length ?? 0} cols</span>}
                {b.hideInExport && <span className="text-xs text-amber-500">hidden in export</span>}
                <code className="ml-auto hidden text-[10px] text-muted-foreground sm:inline">{b.key}</code>
              </button>
              <Button size="xs" variant="ghost" onClick={() => onEdit(b.id)}><Pencil className="size-3.5" /></Button>
              <Button size="xs" variant="ghost" onClick={() => setBlocks(move(blocks, i, -1))} disabled={i === 0}><ArrowUp className="size-3.5" /></Button>
              <Button size="xs" variant="ghost" onClick={() => setBlocks(move(blocks, i, 1))} disabled={i === blocks.length - 1}><ArrowDown className="size-3.5" /></Button>
              <Button size="xs" variant="ghost" onClick={() => confirm(isAnnex ? `Delete “${b.label}” and the ${b.children?.length ?? 0} fields inside it?` : `Delete “${b.label}”?`) && setBlocks(blocks.filter((x) => x.id !== b.id))}><Trash2 className="size-3.5 text-destructive" /></Button>
            </div>
            {renderNested?.(b)}
          </div>
        );
      })}
    </div>
  );
}

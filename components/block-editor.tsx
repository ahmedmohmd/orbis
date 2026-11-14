"use client";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { validateFormula, allBlocks } from "@/lib/formula";
import { FIELD_TYPES, slug, type Block, type ChartConfig, type ChartKind, type Column, type ColumnType, type RecordField, type RecordFieldType, type TemplateSchema } from "@/lib/types";
import { INDUCTION_FIELDS } from "@/lib/records";
import { annexNumbers } from "@/lib/annex";

const COL_TYPES: { value: ColumnType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "status", label: "Status pill (dropdown, coloured)" },
];

const CHART_KINDS: { value: ChartKind; label: string }[] = [
  { value: "bar", label: "Bar" },
  { value: "stackedbar", label: "Stacked bar" },
  { value: "hbar", label: "Horizontal bars" },
  { value: "line", label: "Line" },
  { value: "area", label: "Smooth area" },
  { value: "donut", label: "Donut" },
  { value: "gauge", label: "Gauge ring" },
  { value: "riskmatrix", label: "Risk matrix (3×3)" },
];

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="grid gap-1">
    <Label>{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

export function BlockEditor({ block: b, schema, onChange, onDelete }: { block: Block; schema: TemplateSchema; onChange: (b: Block) => void; onDelete: () => void }) {
  const set = (p: Partial<Block>) => onChange({ ...b, ...p });
  const numeric = b.type === "number" || b.type === "percent" || b.type === "computed";
  const others = allBlocks(schema).filter((x) => x.id !== b.id);
  const tables = others.filter((x) => x.type === "table");
  const keyTaken = others.some((x) => x.key === b.key);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Row label="Label (shown in the report)">
          <Input value={b.label} onChange={(e) => set({ label: e.target.value })} />
        </Row>
        <Row label="Type">
          <Select value={b.type} onChange={(e) => {
            const type = e.target.value as Block["type"];
            set({ type, ...(type === "records" && !b.fields?.length ? { fields: [{ key: "date", label: "Date", type: "date" as const }, { key: "notes", label: "Notes", type: "textarea" as const }], itemLabel: "entry" } : {}), ...(type === "table" && !b.columns?.length ? { columns: [{ key: "col1", label: "Column 1", type: "text" as const }] } : {}) });
          }}>
            {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Row>
      </div>

      {b.type !== "heading" && (
        <Row label="Field key" hint={keyTaken ? "⚠ This key is already used by another field." : "Used in formulas as {key}. Changing it detaches the field from data already entered."}>
          <div className="flex gap-2">
            <Input className={keyTaken ? "border-destructive" : ""} value={b.key} onChange={(e) => set({ key: slug(e.target.value) })} />
            <Button size="sm" variant="outline" onClick={() => set({ key: slug(b.label) })}>From label</Button>
          </div>
        </Row>
      )}

      {b.type !== "heading" && b.type !== "chart" && b.type !== "annex" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="Help text (editor only)"><Input value={b.help ?? ""} onChange={(e) => set({ help: e.target.value })} /></Row>
          <Row label="Width in the report">
            <Select value={b.width ?? ""} onChange={(e) => set({ width: (e.target.value || undefined) as Block["width"] })}>
              <option value="">Automatic</option><option value="full">Full width</option><option value="half">Half</option><option value="third">Third</option><option value="quarter">Quarter</option>
            </Select>
          </Row>
        </div>
      )}

      {numeric && (
        <div className="grid gap-3 sm:grid-cols-3">
          {b.type !== "percent" && <Row label="Unit"><Input placeholder="kWh, L, MW…" value={b.unit ?? ""} onChange={(e) => set({ unit: e.target.value })} /></Row>}
          <Row label="Decimals"><Input type="number" min={0} max={6} value={b.decimals ?? ""} onChange={(e) => set({ decimals: e.target.value === "" ? undefined : Number(e.target.value) })} /></Row>
          <Row label="Look">
            <Select value={b.display ?? ""} onChange={(e) => set({ display: (e.target.value || undefined) as Block["display"] })}>
              <option value="">Automatic</option><option value="card">Stat card</option><option value="ring">Progress ring (0–100)</option><option value="inline">Plain line</option>
            </Select>
          </Row>
        </div>
      )}

      {(b.type === "text" || b.type === "date" || b.type === "select" || b.type === "boolean") && (
        <Row label="Look">
          <Select value={b.display ?? ""} onChange={(e) => set({ display: (e.target.value || undefined) as Block["display"] })}>
            <option value="">Plain line</option><option value="card">Highlighted card</option>
          </Select>
        </Row>
      )}

      {b.type === "textarea" && (
        <Row label="Look">
          <Select value={b.display ?? ""} onChange={(e) => set({ display: (e.target.value || undefined) as Block["display"] })}>
            <option value="">Plain paragraph</option><option value="callout">Highlighted callout</option>
          </Select>
        </Row>
      )}

      {b.type === "select" && (
        <Row label="Options (one per line)">
          <textarea className="min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={(b.options ?? []).join("\n")} onChange={(e) => set({ options: e.target.value.split("\n") })} onBlur={(e) => set({ options: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} />
        </Row>
      )}

      {b.type === "computed" && (
        <Row label="Formula" hint="Use {field_key}, + − × ÷, ( ), and sum() avg() count() min() max() round(). For table columns: sum({table_key.column_key}).">
          <Input className="font-mono" value={b.formula ?? ""} onChange={(e) => set({ formula: e.target.value })} />
          {(() => { const err = validateFormula(b.formula ?? "", schema); return err ? <p className="text-xs text-destructive">{err}</p> : <p className="text-xs text-emerald-500">Formula is valid</p>; })()}
          <KeyHelper schema={schema} exclude={b.id} />
        </Row>
      )}

      {b.type === "table" && <ColumnsEditor block={b} set={set} />}

      {b.type === "annex" && (
        <div className="grid gap-3 rounded-lg border border-teal-500/40 bg-teal-500/5 p-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="grid h-7 min-w-9 place-items-center rounded-md bg-teal-600 px-2 text-xs font-bold text-white">A{annexNumbers(schema).get(b.key) ?? "?"}</span>
            <span>The number is <b>automatic</b> – it follows the order of annexes in the template.</span>
          </div>
          <Row label="Subtitle (shown under the annex title)"><Input value={b.description ?? ""} onChange={(e) => set({ description: e.target.value })} /></Row>
          <Row label="Where is it printed?">
            <Select value={b.placement ?? "end"} onChange={(e) => set({ placement: e.target.value as "end" | "here" })}>
              <option value="end">At the end of the report (a small reference appears here)</option>
              <option value="here">Right here, on its own page inside this section</option>
            </Select>
          </Row>
          <p className="text-xs text-muted-foreground">
            Refer to it from any text, table cell, label or caption with <code className="rounded bg-muted px-1">{`{{annex:${b.key}}}`}</code> – it prints as “Annex {annexNumbers(schema).get(b.key) ?? "N"}” and stays correct when annexes are re-ordered. Add the annex fields from the template builder (“Add field to Annex”).
          </p>
        </div>
      )}

      {b.type === "image" && (
        <Row label="How many photos?" hint="1 = exactly one photo (e.g. a signed document). Empty = as many as you like.">
          <Input type="number" min={1} className="max-w-32" value={b.maxImages ?? ""} placeholder="Unlimited" onChange={(e) => set({ maxImages: e.target.value === "" ? undefined : Math.max(1, Number(e.target.value)) })} />
        </Row>
      )}
      {b.type === "image" && (
        <div className="grid gap-3">
          <Row label="Caption under the picture" hint="Optional. Can use values and annex numbers, e.g. “Highest day · {{o_peak_day_date}} · {{o_peak_day}}”.">
            <Input value={b.caption ?? ""} onChange={(e) => set({ caption: e.target.value })} />
          </Row>
          {b.maxImages === 1 && (
            <div className="flex items-center gap-2"><Switch checked={b.slot !== false} onCheckedChange={(v) => set({ slot: v })} /><span className="text-sm">Keep a framed empty slot in the export when no picture is attached</span></div>
          )}
        </div>
      )}

      {b.type === "records" && (
        <div className="grid gap-3 rounded-lg border bg-muted/40 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Row label="Name of one entry" hint="e.g. induction, visit"><Input value={b.itemLabel ?? ""} onChange={(e) => set({ itemLabel: e.target.value })} /></Row>
            <Row label="Shown in the report as">
              <Select value={b.view ?? ""} onChange={(e) => set({ view: (e.target.value || undefined) as Block["view"] })}>
                <option value="">Automatic</option><option value="table">Summary table</option><option value="cards">Detail cards (with photos)</option><option value="both">Table + detail cards</option>
              </Select>
            </Row>
            <Row label="Use entries from another log">
              <Select value={b.linkTo ?? ""} onChange={(e) => set({ linkTo: e.target.value || undefined })}>
                <option value="">No – this log has its own entries</option>
                {others.filter((x) => x.type === "records" && !x.linkTo).map((x) => <option key={x.id} value={x.key}>{x.label}</option>)}
              </Select>
            </Row>
          </div>
          {b.linkTo ? (
            <p className="text-xs text-muted-foreground">This block only displays the entries of the chosen log (e.g. a summary table in one section and the photo cards in an annex). Add entries in that log.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Label>Fields of one entry</Label>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => confirm("Replace the fields with the Induction preset (document photo, persons photo, persons with In/Out of Karm and national-ID photos)?") && set({ fields: structuredClone(INDUCTION_FIELDS), itemLabel: "induction", view: b.view ?? "table" })}>Use induction preset</Button>
              </div>
              <RecordFieldsEditor fields={b.fields ?? []} onChange={(fields) => set({ fields })} />
            </>
          )}
        </div>
      )}

      {b.type === "chart" && <ChartEditor block={b} tables={tables} schema={schema} set={set} />}

      {b.type === "table" && (
        <div className="flex items-center gap-2"><Switch checked={!!b.compact} onCheckedChange={(v) => set({ compact: v })} /><span className="text-sm">Compact table (smaller text – good for wide tables)</span></div>
      )}

      <div className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-2"><Switch checked={!!b.hideInExport} onCheckedChange={(v) => set({ hideInExport: v })} /><span className="text-sm">Hide in exported report</span></div>
        <Button size="sm" variant="destructive" onClick={() => confirm("Delete this field?") && onDelete()}><Trash2 className="size-3.5" />Delete field</Button>
      </div>
    </div>
  );
}

function KeyHelper({ schema, exclude }: { schema: TemplateSchema; exclude: string }) {
  const nums = allBlocks(schema).filter((x) => x.id !== exclude && ["number", "percent", "computed", "table"].includes(x.type));
  return (
    <details className="mt-1 text-xs text-muted-foreground">
      <summary className="cursor-pointer">Available fields ({nums.length})</summary>
      <div className="mt-1 flex max-h-28 flex-wrap gap-1 overflow-y-auto">
        {nums.map((x) => <code key={x.id} className="rounded bg-muted px-1.5 py-0.5" title={x.label}>{`{${x.key}}`}</code>)}
      </div>
    </details>
  );
}

function ColumnsEditor({ block: b, set }: { block: Block; set: (p: Partial<Block>) => void }) {
  const cols = b.columns ?? [];
  const upd = (i: number, p: Partial<Column>) => set({ columns: cols.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  return (
    <div className="grid gap-2">
      <Label>Table columns</Label>
      {cols.map((c, i) => (
        <div key={i} className="grid gap-2 rounded-lg border p-2">
          <div className="flex gap-2">
            <Input placeholder="Column title" value={c.label} onChange={(e) => upd(i, { label: e.target.value })} />
            <Select className="w-44" value={c.type} onChange={(e) => upd(i, { type: e.target.value as ColumnType })}>
              {COL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <Input className="w-20" type="number" step="0.1" min={0.2} title="Relative width" value={c.width ?? 1} onChange={(e) => upd(i, { width: Number(e.target.value) || 1 })} />
            <Button size="xs" variant="ghost" disabled={i === 0} onClick={() => { const n = [...cols]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; set({ columns: n }); }}>↑</Button>
            <Button size="xs" variant="ghost" onClick={() => set({ columns: cols.filter((_, j) => j !== i) })}><X className="size-4 text-destructive" /></Button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            key: <Input className="h-7 max-w-40 font-mono text-xs" value={c.key} onChange={(e) => upd(i, { key: slug(e.target.value) })} />
            {(c.type === "select" || c.type === "status") && (
              <Input className="h-7 text-xs" placeholder="Options, comma separated" value={(c.options ?? []).join(", ")} onChange={(e) => upd(i, { options: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
            )}
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" className="w-fit" onClick={() => {
        let n = cols.length + 1, key = `col${n}`;
        while (cols.some((c) => c.key === key)) key = `col${++n}`;
        set({ columns: [...cols, { key, label: `Column ${n}`, type: "text" }] });
      }}><Plus className="size-3.5" />Add column</Button>
      <p className="text-[11px] text-muted-foreground">Width numbers are relative (2 = twice as wide as 1). Renaming a column title keeps its data; changing its key does not.</p>
    </div>
  );
}

function ChartEditor({ block: b, tables, schema, set }: { block: Block; tables: Block[]; schema: TemplateSchema; set: (p: Partial<Block>) => void }) {
  const c: ChartConfig = b.chart ?? { kind: "bar", source: "fields", items: [] };
  const upd = (p: Partial<ChartConfig>) => set({ chart: { ...c, ...p } });
  const table = tables.find((t) => t.key === c.table);
  const cols = table?.columns ?? [];
  const noSource = c.kind === "riskmatrix";
  const src = noSource ? "table" : c.source;
  const items = c.items ?? [];
  const series = c.series ?? [];

  return (
    <div className="grid gap-3 rounded-lg border bg-muted/40 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Row label="Chart title"><Input value={c.title ?? ""} onChange={(e) => upd({ title: e.target.value })} /></Row>
        <Row label="Chart type">
          <Select value={c.kind} onChange={(e) => upd({ kind: e.target.value as ChartKind, ...(e.target.value === "riskmatrix" ? { source: "table" as const } : {}) })}>
            {CHART_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </Select>
        </Row>
      </div>
      {!noSource && (
        <Row label="Data source">
          <Select value={c.source} onChange={(e) => upd({ source: e.target.value as ChartConfig["source"] })}>
            <option value="fields">Fields / formulas (one bar or slice each)</option><option value="table">A table (one row per bar or point)</option>
          </Select>
        </Row>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Row label="Unit"><Input value={c.unit ?? ""} onChange={(e) => upd({ unit: e.target.value })} /></Row>
        {(c.kind === "hbar" || c.kind === "gauge") && <Row label="Max value"><Input type="number" value={c.max ?? ""} onChange={(e) => upd({ max: e.target.value === "" ? undefined : Number(e.target.value) })} /></Row>}
        {["bar", "stackedbar", "line", "area"].includes(c.kind) && <Row label="Height (px)"><Input type="number" value={c.height ?? ""} placeholder="280" onChange={(e) => upd({ height: e.target.value === "" ? undefined : Number(e.target.value) })} /></Row>}
      </div>

      {src === "fields" ? (
        <div className="grid gap-2">
          <Label>Data points</Label>
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="Label" value={it.label} onChange={(e) => upd({ items: items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <Input className="font-mono" placeholder="{field} or formula" value={it.value} onChange={(e) => upd({ items: items.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
              <input type="color" className="h-9 w-10 shrink-0 cursor-pointer rounded-md border bg-card p-1" value={it.color ?? "#2563eb"} onChange={(e) => upd({ items: items.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)) })} />
              <Button size="xs" variant="ghost" onClick={() => upd({ items: items.filter((_, j) => j !== i) })}><X className="size-4 text-destructive" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-fit" onClick={() => upd({ items: [...items, { label: "New item", value: "0" }] })}><Plus className="size-3.5" />Add data point</Button>
          {items.some((it) => validateFormula(it.value, schema)) && <p className="text-xs text-destructive">One or more formulas are invalid – those points are skipped.</p>}
          <KeyHelper schema={schema} exclude={b.id} />
        </div>
      ) : (
        <div className="grid gap-3">
          <Row label="Table">
            <Select value={c.table ?? ""} onChange={(e) => upd({ table: e.target.value, x: undefined, series: [] })}>
              <option value="">Choose a table…</option>{tables.map((t) => <option key={t.id} value={t.key}>{t.label}</option>)}
            </Select>
          </Row>
          {table && (
            <>
              <Row label={noSource ? "Risk name column" : "Label column (X axis)"}>
                <Select value={c.x ?? ""} onChange={(e) => upd({ x: e.target.value })}><option value="">Choose…</option>{cols.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select>
              </Row>
              {noSource ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Row label="Probability column"><Select value={c.probKey ?? ""} onChange={(e) => upd({ probKey: e.target.value })}><option value="">Choose…</option>{cols.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select></Row>
                  <Row label="Impact column"><Select value={c.impactKey ?? ""} onChange={(e) => upd({ impactKey: e.target.value })}><option value="">Choose…</option>{cols.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select></Row>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Value columns (each becomes a series)</Label>
                  {series.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <Select value={s.key} onChange={(e) => upd({ series: series.map((x, j) => (j === i ? { ...x, key: e.target.value, label: cols.find((cc) => cc.key === e.target.value)?.label } : x)) })}>
                        <option value="">Choose…</option>{cols.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                      </Select>
                      <Input placeholder="Legend label" value={s.label ?? ""} onChange={(e) => upd({ series: series.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                      <input type="color" className="h-9 w-10 shrink-0 cursor-pointer rounded-md border bg-card p-1" value={s.color ?? "#2563eb"} onChange={(e) => upd({ series: series.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)) })} />
                      <Button size="xs" variant="ghost" onClick={() => upd({ series: series.filter((_, j) => j !== i) })}><X className="size-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="w-fit" onClick={() => upd({ series: [...series, { key: "" }] })}><Plus className="size-3.5" />Add series</Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const RF_TYPES: { value: RecordFieldType; label: string }[] = [
  { value: "text", label: "Short text" }, { value: "textarea", label: "Paragraph" }, { value: "number", label: "Number" }, { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" }, { value: "boolean", label: "Yes / No" }, { value: "image", label: "Photo(s)" }, { value: "group", label: "List of sub-entries (e.g. persons)" },
];

function RecordFieldsEditor({ fields, onChange, nested }: { fields: RecordField[]; onChange: (f: RecordField[]) => void; nested?: boolean }) {
  const upd = (i: number, p: Partial<RecordField>) => onChange(fields.map((f, j) => (j === i ? { ...f, ...p } : f)));
  const selects = (self: number) => fields.filter((f, j) => j !== self && f.type === "select");
  return (
    <div className="grid gap-2">
      {fields.map((f, i) => {
        const cond = f.showIf ? fields.find((x) => x.key === f.showIf!.key) : undefined;
        return (
          <div key={i} className="grid gap-2 rounded-lg border bg-card p-2">
            <div className="flex gap-2">
              <Input placeholder="Field name" value={f.label} onChange={(e) => upd(i, { label: e.target.value })} />
              <Select className="w-56" value={f.type} onChange={(e) => upd(i, { type: e.target.value as RecordFieldType, ...(e.target.value === "group" ? { fields: f.fields ?? [{ key: "name", label: "Name", type: "text" as const }], itemLabel: f.itemLabel ?? "item" } : {}) })}>
                {RF_TYPES.filter((t) => !(nested && t.value === "group")).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
              <Button size="xs" variant="ghost" disabled={i === 0} onClick={() => { const n = [...fields]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }}>↑</Button>
              <Button size="xs" variant="ghost" onClick={() => onChange(fields.filter((_, j) => j !== i))}><X className="size-4 text-destructive" /></Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              key: <Input className="h-7 w-32 font-mono text-xs" value={f.key} onChange={(e) => upd(i, { key: slug(e.target.value) })} />
              {f.type === "select" && (
                <>
                  <Input className="h-7 min-w-48 flex-1 text-xs" placeholder="Options, comma separated" value={(f.options ?? []).join(", ")} onChange={(e) => upd(i, { options: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
                  <label className="flex items-center gap-1"><input type="checkbox" checked={!!f.pill} onChange={(e) => upd(i, { pill: e.target.checked })} />show as badge</label>
                </>
              )}
              {f.type === "image" && (
                <label className="flex items-center gap-1">max photos <Input type="number" min={1} className="h-7 w-20 text-xs" placeholder="any" value={f.maxImages ?? ""} onChange={(e) => upd(i, { maxImages: e.target.value === "" ? undefined : Math.max(1, Number(e.target.value)) })} /></label>
              )}
              {f.type === "group" && <label className="flex items-center gap-1">one item is called <Input className="h-7 w-28 text-xs" value={f.itemLabel ?? ""} onChange={(e) => upd(i, { itemLabel: e.target.value })} /></label>}
            </div>
            {selects(i).length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={!!f.showIf} onChange={(e) => { const s0 = selects(i)[0]; upd(i, { showIf: e.target.checked ? { key: s0.key, equals: s0.options?.[0] ?? "" } : undefined }); }} />
                  only show when
                </label>
                {f.showIf && (
                  <>
                    <Select className="h-7 w-40 text-xs" value={f.showIf.key} onChange={(e) => upd(i, { showIf: { key: e.target.value, equals: fields.find((x) => x.key === e.target.value)?.options?.[0] ?? "" } })}>
                      {selects(i).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                    </Select>
                    =
                    <Select className="h-7 w-40 text-xs" value={f.showIf.equals} onChange={(e) => upd(i, { showIf: { key: f.showIf!.key, equals: e.target.value } })}>
                      {(cond?.options ?? []).map((o) => <option key={o}>{o}</option>)}
                    </Select>
                  </>
                )}
              </div>
            )}
            {f.type === "group" && (
              <div className="ml-3 border-l-2 border-primary/40 pl-3">
                <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Fields of each {f.itemLabel || "item"}</p>
                <RecordFieldsEditor nested fields={f.fields ?? []} onChange={(sub) => upd(i, { fields: sub })} />
              </div>
            )}
          </div>
        );
      })}
      <Button size="sm" variant="outline" className="w-fit" onClick={() => {
        let n = fields.length + 1, key = `field${n}`;
        while (fields.some((f) => f.key === key)) key = `field${++n}`;
        onChange([...fields, { key, label: `Field ${n}`, type: "text" }]);
      }}><Plus className="size-3.5" />Add field</Button>
    </div>
  );
}

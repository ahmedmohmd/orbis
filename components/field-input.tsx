"use client";
import { useState } from "react";
import { ImageField } from "@/components/image-field";
import { RecordsEditor } from "@/components/records-editor";
import { FileSpreadsheet, Copy, Plus, Trash2, X } from "lucide-react";
import { TableImportDialog } from "@/components/table-import";
import { remapRows } from "@/lib/table-import";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { allBlocks, blockNumber, formatNumber } from "@/lib/formula";
import type { Entry } from "@/lib/records";
import type { Block, ImageItem, ReportData, Row, RowKind, TemplateSchema } from "@/lib/types";

export function FieldInput({ block: b, template, data, value, onChange }: {
  block: Block; template: TemplateSchema; data: ReportData; value: unknown; onChange: (v: unknown) => void;
}) {
  const label = (
    <div className="mb-1 flex items-baseline gap-2">
      <Label>{b.label}{b.unit && b.type !== "percent" ? ` (${b.unit})` : ""}{b.type === "percent" ? " (%)" : ""}</Label>
      {b.help && <span className="text-[11px] text-muted-foreground/70">{b.help}</span>}
    </div>
  );

  switch (b.type) {
    case "annex":
      return null;
    case "heading":
      return <h3 className="mt-3 border-l-4 border-primary pl-3 text-sm font-semibold">{b.label}</h3>;
    case "text":
      return <div>{label}<Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} /></div>;
    case "date":
      return <div>{label}<Input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} /></div>;
    case "textarea":
      return <div>{label}<Textarea rows={4} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} /></div>;
    case "number":
    case "percent":
      return (
        <div>{label}
          <Input type="number" step="any" inputMode="decimal" value={value === undefined || value === null ? "" : (value as number | string)}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
        </div>
      );
    case "select":
      return (
        <div>{label}
          <Select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">—</option>{(b.options ?? []).map((o) => <option key={o}>{o}</option>)}
          </Select>
        </div>
      );
    case "boolean":
      return <div>{label}<div className="flex h-9 items-center gap-2"><Switch checked={value === true} onCheckedChange={onChange} /><span className="text-sm">{value === true ? "Yes" : "No"}</span></div></div>;
    case "computed": {
      const n = blockNumber(b, template, data);
      return (
        <div>{label}
          <div className="flex h-9 items-center rounded-md border border-dashed bg-muted px-3 text-sm font-semibold tabular-nums">
            {n === null ? "—" : formatNumber(n, b.decimals)}{b.unit ? ` ${b.unit}` : ""}
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">calculated</span>
          </div>
        </div>
      );
    }
    case "chart":
      return <div className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-xs text-muted-foreground">📊 Chart “{b.chart?.title || b.label}” is drawn automatically from your data.</div>;
    case "list":
      return <div>{label}<ListField value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} /></div>;
    case "table":
      return <div>{label}<TableEditor block={b} rows={Array.isArray(value) ? (value as Row[]) : value === undefined ? b.defaultRows ?? [] : []} onChange={onChange} /></div>;
    case "image":
      return <div>{label}<ImageField value={Array.isArray(value) ? (value as ImageItem[]) : []} onChange={onChange} max={b.maxImages} /></div>;
    case "records":
      if (b.linkTo) {
        const src = allBlocks(template).find((x) => x.key === b.linkTo);
        return <div className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-xs text-muted-foreground">🔗 “{b.label}” is shown from “{src?.label ?? b.linkTo}” – add the entries there.</div>;
      }
      return <div>{label}<RecordsEditor block={b} rows={Array.isArray(value) ? (value as Entry[]) : []} onChange={onChange} /></div>;
  }
}

/* ------------------------------ list ------------------------------ */
function ListField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="grid gap-2">
      {value.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input value={v} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button size="icon" variant="ghost" onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="size-4" /></Button>
        </div>
      ))}
      <Button size="sm" variant="outline" className="w-fit" onClick={() => onChange([...value, ""])}><Plus className="size-3.5" />Add item</Button>
    </div>
  );
}

/* ------------------------------ table ----------------------------- */
const KINDS: { v: "" | RowKind; label: string }[] = [{ v: "", label: "Row" }, { v: "group", label: "Group title" }, { v: "head", label: "Sub-header" }, { v: "total", label: "Total" }];

function TableEditor({ block: b, rows, onChange }: { block: Block; rows: Row[]; onChange: (v: Row[]) => void }) {
  const cols = b.columns ?? [];
  const [imp, setImp] = useState(false);
  const emptyRow = (): Row => Object.fromEntries(cols.map((c) => [c.key, ""]));
  const setCell = (ri: number, key: string, v: string | number) => onChange(rows.map((r, i) => (i === ri ? { ...r, [key]: v } : r)));
  const setKind = (ri: number, k: "" | RowKind) => onChange(rows.map((r, i) => { if (i !== ri) return r; const { __k, ...rest } = r; void __k; return k ? { ...rest, __k: k } : rest; }));
  const first = cols[0]?.key ?? "";

  return (
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-2 text-left">#</th>
              {cols.map((c) => <th key={c.key} className="min-w-[8rem] px-2 py-2 text-left font-medium" style={{ minWidth: `${Math.max(7, (c.width ?? 1) * 8)}rem` }}>{c.label}</th>)}
              <th className="w-28" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => {
              const kind = (r.__k as RowKind | undefined) ?? "";
              return (
                <tr key={ri} className={`border-t align-top ${kind === "group" ? "bg-slate-800/10" : kind === "head" ? "bg-sky-100/70" : kind === "total" ? "bg-blue-50" : ""}`}>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{ri + 1}</td>
                  {kind === "group" ? (
                    <td colSpan={cols.length} className="p-1"><Input className="h-8 text-center text-xs font-semibold" placeholder="Group title" value={String(r[first] ?? "")} onChange={(e) => setCell(ri, first, e.target.value)} /></td>
                  ) : cols.map((c) => (
                    <td key={c.key} className="p-1">
                      {(c.type === "select" || c.type === "status") && !kind ? (
                        <Select className="h-8 text-xs" value={String(r[c.key] ?? "")} onChange={(e) => setCell(ri, c.key, e.target.value)}>
                          <option value="">—</option>
                          {(c.options ?? []).map((o) => <option key={o}>{o}</option>)}
                          {r[c.key] && !(c.options ?? []).includes(String(r[c.key])) && <option>{String(r[c.key])}</option>}
                        </Select>
                      ) : c.type === "number" ? (
                        <Input className="h-8 text-xs" type="number" step="any" value={r[c.key] ?? ""} onChange={(e) => setCell(ri, c.key, e.target.value === "" ? "" : Number(e.target.value))} />
                      ) : (
                        <Textarea rows={1} className={`min-h-8 py-1.5 text-xs ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""} ${kind === "head" || kind === "total" ? "font-semibold" : ""}`} value={String(r[c.key] ?? "")} onChange={(e) => setCell(ri, c.key, e.target.value)} />
                      )}
                    </td>
                  ))}
                  <td className="p-1">
                    <div className="flex items-center">
                      <select title="Row style" className="h-7 w-[4.6rem] rounded border bg-background px-1 text-[11px]" value={kind} onChange={(e) => setKind(ri, e.target.value as "" | RowKind)}>
                        {KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
                      </select>
                      <Button size="xs" variant="ghost" title="Duplicate row" onClick={() => onChange([...rows.slice(0, ri + 1), { ...r }, ...rows.slice(ri + 1)])}><Copy className="size-3.5" /></Button>
                      <Button size="xs" variant="ghost" title="Delete row" onClick={() => onChange(rows.filter((_, i) => i !== ri))}><Trash2 className="size-3.5 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={cols.length + 2} className="px-3 py-5 text-center text-xs text-muted-foreground">No rows yet</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 border-t p-2">
        <Button size="sm" variant="outline" onClick={() => onChange([...rows, emptyRow()])}><Plus className="size-3.5" />Add row</Button>
        <Button size="sm" variant="outline" onClick={() => onChange([...rows, { ...emptyRow(), __k: "group" }])}>Add group title</Button>
        <Button size="sm" variant="ghost" onClick={() => setImp(true)}><FileSpreadsheet className="size-3.5" />Import Excel / paste</Button>
        {rows.length > 0 && <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => confirm("Remove all rows?") && onChange([])}>Clear</Button>}
      </div>
      <TableImportDialog
        open={imp}
        onOpenChange={setImp}
        title="Import rows from Excel"
        description={`Columns are matched by position: ${cols.map((c) => c.label).join(" → ")}. Group titles, sub-headers and total rows are kept.`}
        action={rows.length ? "Add the rows below the existing ones" : "Import rows"}
        onImport={(t) => onChange([...rows, ...remapRows(t, cols)])}
      />
    </div>
  );
}

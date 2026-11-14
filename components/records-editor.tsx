"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ImageField } from "@/components/image-field";
import { emptyEntry, groupOf, imagesOf, isVisible, scalarText, type Entry } from "@/lib/records";
import type { Block, RecordField } from "@/lib/types";

/** Entries added over the month – each entry can hold text, photos and nested lists (e.g. persons of one induction). */
export function RecordsEditor({ block: b, rows, onChange }: { block: Block; rows: Entry[]; onChange: (v: Entry[]) => void }) {
  const fields = b.fields ?? [];
  const noun = b.itemLabel || "entry";
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const upd = (i: number, e: Entry) => onChange(rows.map((r, j) => (j === i ? e : r)));
  const titleOf = (e: Entry) => {
    const f = fields.find((x) => x.type === "date") ?? fields.find((x) => x.type === "text");
    return f ? scalarText(f, e[f.key]) : "";
  };
  const photoCount = (e: Entry) => fields.reduce((a, f) => a + (f.type === "image" ? imagesOf(e[f.key]).length : 0), 0);

  return (
    <div className="grid gap-2">
      {rows.map((e, i) => {
        const isOpen = open[i] ?? i === rows.length - 1;
        return (
          <div key={i} className="rounded-lg border bg-card">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Button size="xs" variant="ghost" onClick={() => setOpen({ ...open, [i]: !isOpen })}>{isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</Button>
              <span className="grid size-6 place-items-center rounded-md bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-bold text-white">{i + 1}</span>
              <button className="flex-1 truncate text-left text-sm font-medium" onClick={() => setOpen({ ...open, [i]: !isOpen })}>
                {noun[0].toUpperCase() + noun.slice(1)} {titleOf(e) && <span className="text-muted-foreground">· {titleOf(e)}</span>}
              </button>
              {photoCount(e) > 0 && <Badge className="bg-muted text-muted-foreground">{photoCount(e)} photo{photoCount(e) > 1 ? "s" : ""}</Badge>}
              <Button size="xs" variant="ghost" title="Duplicate" onClick={() => onChange([...rows.slice(0, i + 1), JSON.parse(JSON.stringify(e)), ...rows.slice(i + 1)])}><Copy className="size-3.5" /></Button>
              <Button size="xs" variant="ghost" title="Delete" onClick={() => confirm(`Delete this ${noun}?`) && onChange(rows.filter((_, j) => j !== i))}><Trash2 className="size-3.5 text-destructive" /></Button>
            </div>
            {isOpen && <div className="border-t p-3"><EntryFields fields={fields} entry={e} onChange={(ne) => upd(i, ne)} /></div>}
          </div>
        );
      })}
      {!rows.length && <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">No {noun}s yet this period</p>}
      <Button size="sm" variant="outline" className="w-fit" onClick={() => { onChange([...rows, emptyEntry(fields)]); setOpen({ ...open, [rows.length]: true }); }}>
        <Plus className="size-3.5" />Add {noun}
      </Button>
    </div>
  );
}

function EntryFields({ fields, entry, onChange, depth = 0 }: { fields: RecordField[]; entry: Entry; onChange: (e: Entry) => void; depth?: number }) {
  const set = (k: string, v: unknown) => onChange({ ...entry, [k]: v });
  const vis = fields.filter((f) => isVisible(f, entry));
  const scalars = vis.filter((f) => f.type !== "image" && f.type !== "group");
  const rest = vis.filter((f) => f.type === "image" || f.type === "group");
  return (
    <div className="grid gap-3">
      {scalars.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {scalars.map((f) => (
            <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
              <Label className="mb-1 block">{f.label}</Label>
              {f.type === "textarea" ? <Textarea rows={3} value={String(entry[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
                : f.type === "select" ? (
                  <Select value={String(entry[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)}>
                    <option value="">—</option>{(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
                  </Select>
                ) : f.type === "boolean" ? <div className="flex h-9 items-center gap-2"><Switch checked={entry[f.key] === true} onCheckedChange={(v) => set(f.key, v)} /><span className="text-sm">{entry[f.key] === true ? "Yes" : "No"}</span></div>
                : <Input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} step="any" value={String(entry[f.key] ?? "")} onChange={(e) => set(f.key, f.type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value)} />}
            </div>
          ))}
        </div>
      )}
      {rest.map((f) =>
        f.type === "image" ? (
          <div key={f.key}><Label className="mb-1 block">{f.label}{f.maxImages === 1 ? " (1 photo)" : ""}</Label><ImageField compact value={imagesOf(entry[f.key])} max={f.maxImages} onChange={(v) => set(f.key, v)} /></div>
        ) : (
          <GroupField key={f.key} field={f} members={groupOf(entry[f.key])} onChange={(m) => set(f.key, m)} depth={depth} />
        ),
      )}
    </div>
  );
}

function GroupField({ field: g, members, onChange, depth }: { field: RecordField; members: Entry[]; onChange: (m: Entry[]) => void; depth: number }) {
  const sub = g.fields ?? [];
  const noun = g.itemLabel || "item";
  const nameF = sub.find((f) => f.type === "text");
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">{g.label}<Badge>{members.length}</Badge></div>
      <div className="grid gap-3">
        {members.map((m, i) => (
          <div key={i} className="rounded-lg border bg-card p-3">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span className="grid size-5 place-items-center rounded bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
              <b className="truncate">{(nameF && String(m[nameF.key] ?? "")) || `${noun[0].toUpperCase()}${noun.slice(1)} ${i + 1}`}</b>
              <Button size="xs" variant="ghost" className="ml-auto" onClick={() => confirm(`Remove this ${noun}?`) && onChange(members.filter((_, j) => j !== i))}><Trash2 className="size-3.5 text-destructive" /></Button>
            </div>
            <EntryFields fields={sub} entry={m} depth={depth + 1} onChange={(ne) => onChange(members.map((x, j) => (j === i ? ne : x)))} />
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" className="mt-3" onClick={() => onChange([...members, emptyEntry(sub)])}><Plus className="size-3.5" />Add {noun}</Button>
    </div>
  );
}

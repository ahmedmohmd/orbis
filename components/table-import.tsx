"use client";
import { useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, Textarea } from "@/components/ui/input";
import { gridToTable, type ImportedTable } from "@/lib/table-import";
import { parseDelimited, readXlsx, type Sheet } from "@/lib/xlsx-read";

const KIND_CLS: Record<string, string> = {
  group: "bg-slate-800 text-white font-semibold text-center",
  head: "bg-sky-100 font-semibold",
  total: "bg-blue-50 font-bold",
};

/** Import a table from an Excel sheet (.xlsx), a CSV file, or cells pasted from Excel / Sheets. */
export function TableImportDialog({ open, onOpenChange, title, description, action, onImport }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  action: string;
  onImport: (t: ImportedTable) => void;
}) {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheet, setSheet] = useState(0);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const parsed: ImportedTable | null = (() => {
    try {
      const g = sheets.length ? sheets[sheet]?.grid : text.trim() ? parseDelimited(text) : null;
      return g ? gridToTable(g) : null;
    } catch { return null; }
  })();

  async function pick(f?: File) {
    if (!f) return;
    setErr(""); setName(f.name);
    try {
      if (/\.xlsx$|\.xlsm$/i.test(f.name)) { setSheets(await readXlsx(await f.arrayBuffer())); setSheet(0); setText(""); }
      else if (/\.(csv|tsv|txt)$/i.test(f.name)) { setSheets([]); setText(await f.text()); }
      else setErr("Please choose an .xlsx or .csv file (for old .xls files: Save As .xlsx in Excel first).");
    } catch (e) { setErr((e as Error).message); }
  }
  const reset = () => { setSheets([]); setText(""); setErr(""); setName(""); setSheet(0); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent title={title} description={description}>
        <div className="grid gap-3">
          <input ref={file} type="file" accept=".xlsx,.xlsm,.csv,.tsv,.txt" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          <Button variant="outline" onClick={() => file.current?.click()}><Upload className="size-4" />{name ? `Change file (${name})` : "Choose Excel / CSV file"}</Button>
          {sheets.length > 1 && (
            <Select value={sheet} onChange={(e) => setSheet(Number(e.target.value))}>
              {sheets.map((s, i) => <option key={i} value={i}>Sheet: {s.name}</option>)}
            </Select>
          )}
          {!sheets.length && (
            <>
              <div className="text-center text-xs text-muted-foreground">— or paste the cells here —</div>
              <Textarea rows={5} className="font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder="Select the cells in Excel, copy (Ctrl+C) and paste here…" />
            </>
          )}
          {err && <p className="text-sm text-destructive">{err}</p>}
          {parsed && parsed.rows.length > 0 && (
            <div className="grid gap-1.5">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileSpreadsheet className="size-3.5" />{parsed.columns.length} columns · {parsed.rows.length} rows detected{parsed.rows.some((r) => r.__k) ? " (group titles, sub-headers and totals recognised)" : ""}</p>
              <div className="max-h-64 overflow-auto rounded-lg border">
                <table className="w-full text-xs">
                  {!parsed.hideHeader && <thead className="sticky top-0 bg-muted"><tr>{parsed.columns.map((c) => <th key={c.key} className="px-2 py-1.5 text-left font-semibold">{c.label}</th>)}</tr></thead>}
                  <tbody>
                    {parsed.rows.slice(0, 40).map((r, i) => {
                      const k = String(r.__k ?? "");
                      return k === "group"
                        ? <tr key={i}><td colSpan={parsed.columns.length} className={`px-2 py-1 ${KIND_CLS.group}`}>{String(r[parsed.columns[0].key])}</td></tr>
                        : <tr key={i} className={`border-t ${KIND_CLS[k] ?? ""}`}>{parsed.columns.map((c) => <td key={c.key} className={`px-2 py-1 ${c.align === "right" || c.type === "number" ? "text-right" : ""}`}>{String(r[c.key] ?? "")}</td>)}</tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <Button disabled={!parsed || !parsed.rows.length} onClick={() => { onImport(parsed!); onOpenChange(false); reset(); }}>{action}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

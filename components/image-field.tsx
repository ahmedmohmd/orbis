"use client";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Replace, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadImage } from "@/lib/upload";
import type { ImageItem } from "@/lib/types";

/** max = 1 → exactly one photo (button turns into "Replace"); otherwise up to `max` (or unlimited). */
export function ImageField({ value, onChange, max, compact }: { value: ImageItem[]; onChange: (v: ImageItem[]) => void; max?: number; compact?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const single = max === 1;
  const full = max !== undefined && value.length >= max;

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr("");
    try {
      const room = max === undefined ? files.length : single ? 1 : Math.max(0, max - value.length);
      const added: ImageItem[] = [];
      for (const f of Array.from(files).slice(0, room || 1)) if (f.type.startsWith("image/") || /\.svg$/i.test(f.name)) added.push({ src: await uploadImage(f), caption: single ? "" : f.name.replace(/\.[^.]+$/, "") });
      onChange(single ? added.slice(0, 1) : [...value, ...added]);
    } catch (e) {
      setErr((e as Error).message || "Upload failed – try again");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="grid gap-2">
      {value.length > 0 && (
        <div className={`grid gap-2 ${single ? "grid-cols-1 max-w-[220px]" : compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}>
          {value.map((im, i) => (
            <div key={im.src + i} className="overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.src} alt="" className={`w-full bg-muted object-cover ${single ? "h-36" : "h-28"}`} />
              <div className="flex items-center gap-1 p-1">
                {!single && <Input className="h-7 text-xs" value={im.caption ?? ""} placeholder="Caption" onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />}
                <Button size="xs" variant="ghost" className="ml-auto" title="Remove photo" onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 className="size-3.5 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <input ref={ref} type="file" accept="image/*,.svg" multiple={!single} hidden onChange={(e) => add(e.target.files)} />
      {(!full || single) && (
        <Button size="sm" variant="outline" className="w-fit" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : single && value.length ? <Replace className="size-3.5" /> : <ImagePlus className="size-3.5" />}
          {busy ? "Uploading…" : single ? (value.length ? "Replace photo" : "Add photo") : "Add photos"}
        </Button>
      )}
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

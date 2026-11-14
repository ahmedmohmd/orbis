"use client";
import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/upload";

export function AvatarPicker({ value, name, onChange }: { value: string; name: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      // square, small – a profile photo does not need more
      onChange(await uploadImage(file));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-4">
      <Avatar src={value} name={name || "?"} size={72} />
      <div className="grid gap-1.5">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}{value ? "Change photo" : "Upload photo"}</Button>
          {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}><Trash2 className="size-3.5 text-destructive" />Remove</Button>}
        </div>
        {err && <span className="text-xs text-destructive">{err}</span>}
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
    </div>
  );
}

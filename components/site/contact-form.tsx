"use client";
import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Input, Label, Textarea } from "@/components/ui/input";

export function ContactForm() {
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setErr("");
    const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (res.ok) setState("done");
    else { setErr((await res.json().catch(() => ({}))).error ?? "Something went wrong."); setState("idle"); }
  }

  if (state === "done")
    return (
      <div className="grid place-items-center gap-3 rounded-3xl border bg-card p-12 text-center">
        <CheckCircle2 className="size-14 text-emerald-500" />
        <h3 className="text-2xl font-bold">Message sent</h3>
        <p className="max-w-sm text-sm text-muted-foreground">Thank you – we received your message and will reply to {f.email} soon.</p>
      </div>
    );

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5"><Label>Your name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="h-11" /></div>
        <div className="grid gap-1.5"><Label>E-mail</Label><Input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="h-11" /></div>
      </div>
      <div className="grid gap-1.5"><Label>Subject</Label><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} className="h-11" /></div>
      <div className="grid gap-1.5"><Label>Message</Label><Textarea required rows={6} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
      <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button disabled={state === "sending"} className="brand-gradient inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-[1.01] disabled:opacity-60">
        {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Send message
      </button>
    </form>
  );
}

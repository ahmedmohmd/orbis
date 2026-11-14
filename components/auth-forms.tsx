"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { Input, Label } from "@/components/ui/input";

const submitCls = "brand-gradient inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-[1.01] disabled:opacity-60";

function Password({ value, onChange, label = "Password", autoComplete }: { value: string; onChange: (v: string) => void; label?: string; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input required type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 pl-9 pr-10" />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label="Show password" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
      </div>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [f, setF] = useState({ username: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (res.ok) {
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    } else {
      setErr((await res.json().catch(() => ({}))).error ?? "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-1.5">
        <Label>Username</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input required autoFocus autoComplete="username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} className="h-11 pl-9" />
        </div>
      </div>
      <Password value={f.password} onChange={(v) => setF({ ...f, password: v })} autoComplete="current-password" />
      {err && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
      <button disabled={busy} className={submitCls}>{busy ? <Loader2 className="size-4 animate-spin" /> : <>Sign in<ArrowRight className="size-4" /></>}</button>
      <p className="text-center text-xs text-muted-foreground">Need an account? Ask your administrator – or <Link href="/contact" className="font-medium text-primary hover:underline">contact us</Link>.</p>
    </form>
  );
}

export function SetupForm() {
  const router = useRouter();
  const [f, setF] = useState({ firstName: "", lastName: "", birthDate: "", username: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password !== f.confirm) return setErr("The two passwords do not match.");
    setBusy(true);
    setErr("");
    const res = await fetch("/api/auth/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (res.ok) { router.push("/dashboard"); router.refresh(); }
    else { setErr((await res.json().catch(() => ({}))).error ?? "Setup failed."); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5"><Label>First name</Label><Input required value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} className="h-11" /></div>
        <div className="grid gap-1.5"><Label>Last name</Label><Input required value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} className="h-11" /></div>
      </div>
      <div className="grid gap-1.5"><Label>Date of birth</Label><Input type="date" value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} className="h-11" /></div>
      <div className="grid gap-1.5"><Label>Username</Label><Input required autoComplete="username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} className="h-11" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Password label="Password (8+ characters)" value={f.password} onChange={(v) => setF({ ...f, password: v })} autoComplete="new-password" />
        <Password label="Repeat password" value={f.confirm} onChange={(v) => setF({ ...f, confirm: v })} autoComplete="new-password" />
      </div>
      {err && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
      <button disabled={busy} className={submitCls}>{busy ? <Loader2 className="size-4 animate-spin" /> : <>Create administrator account<ArrowRight className="size-4" /></>}</button>
      <p className="text-center text-xs text-muted-foreground">You can add your profile photo afterwards from <b>My profile</b>.</p>
    </form>
  );
}

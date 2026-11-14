"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, UserCircle } from "lucide-react";
import { AvatarPicker } from "@/components/avatar-picker";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export function ProfileForm({ user }: { user: { username: string; role: string; firstName: string; lastName: string; birthDate: string; avatar: string } }) {
  const router = useRouter();
  const [f, setF] = useState({ firstName: user.firstName, lastName: user.lastName, birthDate: user.birthDate, avatar: user.avatar });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string; for: "profile" | "password" } | null>(null);
  const [busy, setBusy] = useState<"" | "profile" | "password">("");

  async function put(body: object, kind: "profile" | "password") {
    setBusy(kind);
    setMsg(null);
    const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy("");
    if (res.ok) { setMsg({ ok: true, text: kind === "profile" ? "Profile saved." : "Password changed.", for: kind }); if (kind === "password") setPw({ currentPassword: "", newPassword: "", confirm: "" }); router.refresh(); }
    else setMsg({ ok: false, text: (await res.json().catch(() => ({}))).error ?? "Could not save.", for: kind });
  }
  const note = (k: "profile" | "password") => msg?.for === k && <span className={`flex items-center gap-1 text-sm ${msg.ok ? "text-emerald-600" : "text-destructive"}`}>{msg.ok && <Check className="size-4" />}{msg.text}</span>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <PageHeader title="My profile" icon={<UserCircle className="size-6" />} description={`Signed in as @${user.username} · ${user.role === "admin" ? "Administrator" : "User"}`} />
      <Card className="mb-6 grid gap-5 p-6">
        <h2 className="font-semibold">Personal details</h2>
        <AvatarPicker value={f.avatar} name={`${f.firstName} ${f.lastName}`} onChange={(avatar) => setF({ ...f, avatar })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5"><Label>First name</Label><Input value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Last name</Label><Input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Date of birth</Label><Input type="date" value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Username</Label><Input value={user.username} disabled /></div>
        </div>
        <div className="flex items-center gap-4"><Button disabled={busy === "profile"} onClick={() => put(f, "profile")}>{busy === "profile" && <Loader2 className="size-4 animate-spin" />}Save profile</Button>{note("profile")}</div>
      </Card>
      <Card className="grid gap-4 p-6">
        <h2 className="font-semibold">Change password</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1.5"><Label>Current password</Label><Input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>New password (8+)</Label><Input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Repeat new password</Label><Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" disabled={busy === "password" || pw.newPassword.length < 8 || pw.newPassword !== pw.confirm} onClick={() => put({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }, "password")}>{busy === "password" && <Loader2 className="size-4 animate-spin" />}Update password</Button>
          {pw.confirm && pw.newPassword !== pw.confirm && <span className="text-sm text-destructive">Passwords do not match.</span>}
          {note("password")}
        </div>
      </Card>
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { AvatarPicker } from "@/components/avatar-picker";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface UserRow { id: string; username: string; role: "admin" | "user"; firstName: string; lastName: string; birthDate: string; avatar: string; active: boolean; lastLogin: string | null }
const blank = { username: "", password: "", role: "user" as "admin" | "user", firstName: "", lastName: "", birthDate: "", avatar: "", active: true };

export function UsersManager({ users, meId }: { users: UserRow[]; meId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const openNew = () => { setEditing(null); setF(blank); setErr(""); setOpen(true); };
  const openEdit = (u: UserRow) => { setEditing(u); setF({ ...blank, ...u, password: "" }); setErr(""); setOpen(true); };

  async function save() {
    setBusy(true);
    setErr("");
    const body = editing ? { ...f, username: undefined } : f;
    const res = await fetch(editing ? `/api/users/${editing.id}` : "/api/users", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) return setErr((await res.json().catch(() => ({}))).error ?? "Could not save.");
    setOpen(false);
    router.refresh();
  }
  async function remove(u: UserRow) {
    if (!confirm(`Delete ${u.username}? Their reports stay; they just can no longer sign in.`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error ?? "Could not delete.");
    router.refresh();
  }

  const full = (u: { firstName: string; lastName: string; username: string }) => `${u.firstName} ${u.lastName}`.trim() || u.username;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <PageHeader title="Users" icon={<Users className="size-6" />} description="Admins design templates and manage people. Users fill in and export reports." actions={<Button onClick={openNew}><Plus className="size-4" />Add user</Button>} />
      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1.6fr_1fr_1fr_1fr_auto] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid"><span>User</span><span>Username</span><span>Role</span><span>Last sign-in</span><span className="w-20" /></div>
        <ul className="divide-y">
          {users.map((u) => (
            <li key={u.id} className="grid items-center gap-3 px-5 py-4 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto] md:gap-4">
              <div className="flex items-center gap-3"><Avatar src={u.avatar} name={full(u)} size={42} /><div className="min-w-0"><div className="truncate font-semibold">{full(u)}{u.id === meId && <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>}</div>{u.birthDate && <div className="text-xs text-muted-foreground">Born {new Date(u.birthDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>}</div></div>
              <div className="text-sm text-muted-foreground">@{u.username}</div>
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", u.role === "admin" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" : "bg-sky-500/15 text-sky-600 dark:text-sky-400")}>{u.role === "admin" && <ShieldCheck className="size-3" />}{u.role === "admin" ? "Admin" : "User"}</span>
                {!u.active && <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">Disabled</span>}
              </div>
              <div className="text-sm text-muted-foreground">{u.lastLogin ? new Date(u.lastLogin).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}</div>
              <div className="flex gap-1.5"><Button size="xs" variant="outline" onClick={() => openEdit(u)} aria-label="Edit"><Pencil className="size-3.5" /></Button>{u.id !== meId && <Button size="xs" variant="ghost" onClick={() => remove(u)} aria-label="Delete"><Trash2 className="size-3.5 text-destructive" /></Button>}</div>
            </li>
          ))}
        </ul>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={editing ? `Edit ${editing.username}` : "Add user"} description={editing ? "Leave the password empty to keep it unchanged." : "The user signs in with this username and password."}>
          <div className="grid gap-4">
            <AvatarPicker value={f.avatar} name={full(f)} onChange={(avatar) => setF({ ...f, avatar })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1"><Label>First name</Label><Input value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></div>
              <div className="grid gap-1"><Label>Last name</Label><Input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1"><Label>Date of birth</Label><Input type="date" value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} /></div>
              <div className="grid gap-1"><Label>Role</Label><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as "admin" | "user" })}><option value="user">User – fills in reports</option><option value="admin">Admin – full control</option></Select></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1"><Label>Username</Label><Input disabled={!!editing} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoComplete="off" /></div>
              <div className="grid gap-1"><Label className="flex items-center gap-1"><KeyRound className="size-3" />{editing ? "New password" : "Password (8+)"}</Label><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></div>
            </div>
            {editing && editing.id !== meId && (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="size-4 accent-[var(--primary)]" />Account is active (untick to block sign-in)</label>
            )}
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button disabled={busy || (!editing && (!f.username || f.password.length < 8))} onClick={save}>{busy ? "Saving…" : editing ? "Save changes" : "Create user"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

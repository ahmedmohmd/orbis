"use client";
import { useRouter } from "next/navigation";
import { Inbox as InboxIcon, Mail, MailOpen, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Msg { id: string; name: string; email: string; subject: string; body: string; read: boolean; createdAt: string }

export function Inbox({ messages }: { messages: Msg[] }) {
  const router = useRouter();
  async function mark(id: string, read: boolean) { await fetch(`/api/messages/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read }) }); router.refresh(); }
  async function del(id: string) { if (!confirm("Delete this message?")) return; await fetch(`/api/messages/${id}`, { method: "DELETE" }); router.refresh(); }
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <PageHeader title="Inbox" icon={<InboxIcon className="size-6" />} description="Messages sent from the Contact page of the public website." />
      <div className="grid gap-3">
        {messages.map((m) => (
          <Card key={m.id} className={cn("p-5 transition-colors", !m.read && "border-primary/40 bg-accent/40")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={cn("mt-0.5 grid size-9 place-items-center rounded-full", m.read ? "bg-muted text-muted-foreground" : "brand-gradient text-white")}>{m.read ? <MailOpen className="size-4" /> : <Mail className="size-4" />}</span>
                <div><div className="font-semibold">{m.subject || "(no subject)"}</div><div className="text-sm text-muted-foreground">{m.name} · <a className="text-primary hover:underline" href={`mailto:${m.email}`}>{m.email}</a></div></div>
              </div>
              <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <Button size="sm" variant="outline" onClick={() => mark(m.id, !m.read)}>{m.read ? "Mark unread" : "Mark read"}</Button>
                <Button size="xs" variant="ghost" onClick={() => del(m.id)} aria-label="Delete"><Trash2 className="size-3.5 text-destructive" /></Button></div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
          </Card>
        ))}
        {!messages.length && <Card className="grid place-items-center gap-2 p-14 text-center text-muted-foreground"><InboxIcon className="size-10" /><div className="font-medium text-foreground">No messages yet</div><p className="text-sm">When someone uses the Contact form it appears here.</p></Card>}
      </div>
    </div>
  );
}

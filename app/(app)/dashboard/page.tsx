import Link from "next/link";
import { ArrowUpRight, CheckCircle2, FileDown, FileText, LayoutTemplate, PencilLine, Plus, Send, Settings, Users } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { StatusPill } from "@/components/reports-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { displayName, requireUser } from "@/lib/auth";
import { ensureSeed, listReports, listTemplates } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

const greeting = () => {
  const h = (new Date().getUTCHours() + 2) % 24; // Cairo
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export default async function Dashboard() {
  const user = await requireUser();
  await ensureSeed();
  const [reports, templates] = await Promise.all([listReports(), listTemplates()]);
  const count = (s: string) => reports.filter((r) => r.status === s).length;
  const recent = reports.slice(0, 6);
  const admin = user.role === "admin";

  const stats = [
    { label: "Reports", value: reports.length, icon: FileText, tone: "from-blue-500 to-cyan-400", hint: "All time" },
    { label: "Drafts", value: count("draft"), icon: PencilLine, tone: "from-amber-500 to-orange-400", hint: "Still being filled" },
    { label: "In review", value: count("review"), icon: Send, tone: "from-sky-500 to-indigo-400", hint: "Waiting for approval" },
    { label: "Sent", value: count("sent"), icon: CheckCircle2, tone: "from-emerald-500 to-lime-400", hint: "Delivered to the manager" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="relative mb-8 overflow-hidden rounded-3xl border bg-card p-7 sm:p-9">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-[radial-gradient(circle,var(--glow),transparent_65%)]" />
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar src={user.avatar} name={displayName(user)} size={64} />
            <div>
              <p className="text-sm font-medium text-muted-foreground">{greeting()},</p>
              <h1 className="text-3xl font-bold tracking-tight">{displayName(user)} <span className="inline-block anim-float">👋</span></h1>
              <p className="mt-1 text-sm text-muted-foreground">{reports.length ? `Your latest report is “${reports[0].title} – ${reports[0].period}”.` : "Let's create your first monthly report."}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link href="/reports?new=1"><Plus className="size-4" />New report</Link></Button>
            {reports[0] && <Button variant="outline" asChild><Link href={`/reports/${reports[0].id}`}>Continue latest</Link></Button>}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="relative overflow-hidden p-5">
            <span className={`absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br ${s.tone} opacity-15`} />
            <span className={`mb-4 grid size-11 place-items-center rounded-xl bg-gradient-to-br ${s.tone} text-white shadow-lg`}><s.icon className="size-5" /></span>
            <div className="text-3xl font-bold tabular-nums tracking-tight">{s.value}</div>
            <div className="text-sm font-medium">{s.label}</div>
            <div className="text-xs text-muted-foreground">{s.hint}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-semibold">Recent reports</h2>
            <Link href="/reports" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">View all<ArrowUpRight className="size-3.5" /></Link>
          </div>
          <ul className="divide-y">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50">
                <Link href={`/reports/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><FileText className="size-[18px]" /></span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{r.title}</span><span className="block truncate text-xs text-muted-foreground">{r.period || "No period"} · {r.templateName}</span></span>
                </Link>
                <StatusPill status={r.status} />
                <div className="flex gap-1.5">
                  <Button size="xs" variant="outline" asChild title="Download PDF"><a href={`/api/reports/${r.id}/pdf`}><FileDown className="size-3.5" /></a></Button>
                </div>
              </li>
            ))}
            {!recent.length && <li className="px-5 py-10 text-center text-sm text-muted-foreground">No reports yet.</li>}
          </ul>
        </Card>

        <div className="grid content-start gap-4">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Quick actions</h2>
            <div className="grid gap-2">
              <Link href="/reports?new=1" className="flex items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors hover:bg-muted"><Plus className="size-4 text-primary" />Start next month’s report</Link>
              {admin && <Link href="/templates" className="flex items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors hover:bg-muted"><LayoutTemplate className="size-4 text-primary" />Edit report template <span className="ml-auto text-xs text-muted-foreground">{templates.length}</span></Link>}
              {admin && <Link href="/settings" className="flex items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors hover:bg-muted"><Settings className="size-4 text-primary" />Report settings & theme</Link>}
              {admin && <Link href="/users" className="flex items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors hover:bg-muted"><Users className="size-4 text-primary" />Manage users</Link>}
            </div>
          </Card>
          <Card className="brand-gradient relative overflow-hidden border-0 p-5 text-white">
            <div aria-hidden className="absolute -right-8 -top-8 size-32 rounded-full bg-white/15" />
            <h2 className="relative font-semibold">Tip</h2>
            <p className="relative mt-1 text-sm text-white/90">Use <b>Next month</b> on a report to copy last month’s data – you only retype what changed. Every change is saved automatically.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

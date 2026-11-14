import Link from "next/link";
import { ArrowRight, Check, Download, PlayCircle } from "lucide-react";
import { FeatureArt, HeroScene, type FeatureKind } from "@/components/site/illustrations";
import { ThemeShowcase } from "@/components/site/theme-showcase";

export const metadata = { title: "Monthly station reports, beautifully automated" };

const FEATURES: { kind: FeatureKind; title: string; text: string }[] = [
  { kind: "sections", title: "Fully customisable template", text: "Add, delete and reorder sections and fields – text, numbers, tables, entry logs, formulas, charts. Change the template once, every report follows." },
  { kind: "photos", title: "Photos that stay organised", text: "Induction documents, people, national IDs, PTWs – with In / Out of Karm logic. Originals are attached to the PDF for your HSE database." },
  { kind: "annex", title: "Annexes that number themselves", text: "Add an annex in any section. Numbers, the table of contents and every “see Annex 3” reference update automatically." },
  { kind: "charts", title: "Charts & curves, drawn for you", text: "Bars, stacked bars, smooth curves, donuts, gauges and risk matrices – generated from your numbers, always on-brand." },
  { kind: "export", title: "PDF & Word, one click", text: "Every section starts on its own page. Pixel-perfect PDF, and an editable Word file when your manager wants changes." },
  { kind: "safe", title: "Never lose a keystroke", text: "Autosave, a Save button, local backup, version history and one-click restore. Fill the report across the whole month." },
  { kind: "roles", title: "Admins and users", text: "Admins shape the template and manage people. Users fill in the report. Secure sign-in with profile photos." },
  { kind: "themes", title: "Your colours, your brand", text: "Ocean blue, Sunset orange, or any custom brand colour – plus paper size, cover style and page numbers in Settings." },
];

const STEPS = [
  ["01", "Design your template", "Start from the ready-made station report or build your own. Every field, table and chart is yours to edit."],
  ["02", "Fill it in, any day", "Add inductions, PTWs and faults as they happen. Everything is saved safely the moment you type."],
  ["03", "Export & send", "One click gives a polished PDF or Word report – plus the photos your HSE team needs."],
];

export default function Home() {
  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
        <div aria-hidden className="pointer-events-none absolute -left-32 top-0 size-[520px] rounded-full bg-[radial-gradient(circle,var(--glow),transparent_65%)]" />
        <div aria-hidden className="pointer-events-none absolute -right-24 top-32 size-[460px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,.16),transparent_65%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div className="anim-up">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm"><i className="brand-gradient size-2 rounded-full" />Made for solar & power stations</span>
            <h1 className="mt-6 text-balance text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Your monthly station report, <span className="brand-text">done beautifully</span> in minutes.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Stop rebuilding the same Word file every month. Fill in the numbers once, attach the photos, and export a premium PDF or Word report – charts, curves, annexes and all.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="brand-gradient inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-blue-500/30 transition-transform hover:scale-[1.03]">Get started<ArrowRight className="size-4" /></Link>
              <Link href="#how" className="inline-flex items-center gap-2 rounded-full border bg-card px-6 py-3.5 text-base font-semibold hover:bg-muted"><PlayCircle className="size-4 text-primary" />See how it works</Link>
            </div>
            <ul className="mt-9 grid gap-2.5 text-sm text-muted-foreground sm:grid-cols-2">
              {["PDF & Word export", "Every section on its own page", "Light & pure-black dark mode", "Photos attached for HSE"].map((t) => <li key={t} className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><Check className="size-3" /></span>{t}</li>)}
            </ul>
          </div>
          <div className="anim-up relative" style={{ animationDelay: ".15s" }}>
            <div aria-hidden className="absolute -inset-6 rounded-[44px] bg-[radial-gradient(circle,var(--glow),transparent_70%)]" />
            <HeroScene className="relative w-full drop-shadow-[0_30px_60px_rgba(15,42,107,.35)]" />
          </div>
        </div>
      </section>

      {/* numbers */}
      <section className="border-y bg-card/60">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-9 text-center sm:px-8 md:grid-cols-4">
          {[["35+", "pages generated per report"], ["2", "export formats – PDF & Word"], ["∞", "sections, fields & annexes"], ["1 click", "from data to finished report"]].map(([n, l]) => (
            <div key={l}><div className="brand-text text-4xl font-extrabold tracking-tight">{n}</div><div className="mt-1 text-sm text-muted-foreground">{l}</div></div>
          ))}
        </div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Features</span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight">Everything a station report needs</h2>
          <p className="mt-4 text-muted-foreground">From the first number to the last annex – one tool that stays out of your way.</p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-3xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10">
              <FeatureArt kind={f.kind} className="size-16 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" />
              <h3 className="mt-5 text-lg font-bold leading-snug">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* report preview */}
      <section className="relative overflow-hidden border-y bg-muted/40 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">The result</span>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight">A report your manager will actually enjoy reading</h2>
            <p className="mt-4 text-muted-foreground">Always a light, print-ready design – in the colours of your brand.</p>
          </div>
          <ThemeShowcase />
        </div>
      </section>

      {/* how */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">How it works</span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight">Three steps. Once a month.</h2>
        </div>
        <div className="relative mt-14 grid gap-6 md:grid-cols-3">
          <div aria-hidden className="absolute left-[16%] right-[16%] top-9 hidden h-px border-t-2 border-dashed border-primary/30 md:block" />
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="relative rounded-3xl border bg-card p-7 text-center">
              <span className="brand-gradient mx-auto grid size-[72px] place-items-center rounded-full text-xl font-extrabold text-white shadow-xl shadow-blue-500/30 ring-8 ring-background">{n}</span>
              <h3 className="mt-5 text-xl font-bold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0d2a6c] via-[#1d57a8] to-[#2563eb] px-8 py-16 text-center text-white">
          <div aria-hidden className="absolute -right-20 -top-24 size-96 rounded-full bg-orange-400/25 blur-3xl" />
          <div aria-hidden className="absolute -bottom-32 -left-20 size-96 rounded-full bg-cyan-300/20 blur-3xl" />
          <h2 className="relative text-4xl font-extrabold tracking-tight">Ready for next month’s report?</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/80">Sign in, copy last month’s data, change what is different, and export.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-[#0d2a6c] shadow-xl transition-transform hover:scale-[1.03]">Sign in<ArrowRight className="size-4" /></Link>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-7 py-3.5 font-semibold hover:bg-white/10"><Download className="size-4" />Talk to us</Link>
          </div>
        </div>
      </section>
    </>
  );
}

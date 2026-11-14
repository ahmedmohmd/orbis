import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeatureArt, FlowScene } from "@/components/site/illustrations";

export const metadata = { title: "About" };

const VALUES = [
  ["sections", "Yours to shape", "No two stations report alike. Every section, field and chart can be added, edited or removed – without a developer."],
  ["safe", "Safe by default", "Work is saved the moment you type, backed up in your browser and versioned, so a long month of data never gets lost."],
  ["photos", "Evidence that travels", "Photos stay linked to the record and ride along inside the exported PDF, ready for the HSE database."],
  ["charts", "Designed, not dumped", "Spacing, colour and type are handled for you, so every report looks premium without touching a layout."],
] as const;

export default function About() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-4 pb-14 pt-20 text-center sm:px-8">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">About</span>
          <h1 className="mt-4 text-balance text-5xl font-extrabold leading-tight tracking-tight">We turn a month of station data into <span className="brand-text">one great report</span>.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">Orbis started with a simple frustration: every month, the same long Word document – rebuilt by hand, photos pasted one by one, page numbers breaking. We built the tool we wanted to use.</p>
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-8"><FlowScene className="w-full drop-shadow-2xl" /></div>
      </section>

      <section className="border-y bg-muted/40 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Our mission</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">Give every station team back the hours they lose to formatting – and give managers reports that are consistent, complete and easy to read. Fill in what happened; the studio handles pages, numbering, charts, annexes and export.</p>
            <ul className="mt-6 grid gap-3 text-sm">
              {["One template, every month – change it any time", "Admins design, users fill in, everyone stays in sync", "Reports that always print and read well on paper"].map((t) => <li key={t} className="flex items-start gap-3"><span className="brand-gradient mt-0.5 size-5 shrink-0 rounded-full" /><span>{t}</span></li>)}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[["35+", "pages per report"], ["8", "chart types"], ["2", "roles – admin & user"], ["0", "formatting headaches"]].map(([n, l]) => (
              <div key={l} className="rounded-3xl border bg-card p-6 text-center"><div className="brand-text text-4xl font-extrabold">{n}</div><div className="mt-1 text-sm text-muted-foreground">{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">What we believe</h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {VALUES.map(([k, t, d]) => (
            <div key={t} className="flex gap-5 rounded-3xl border bg-card p-6 transition-shadow hover:shadow-xl">
              <FeatureArt kind={k} className="size-14 shrink-0" />
              <div><h3 className="text-lg font-bold">{t}</h3><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-14 text-center">
          <Link href="/contact" className="brand-gradient inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-semibold text-white shadow-xl shadow-blue-500/25">Get in touch<ArrowRight className="size-4" /></Link>
        </div>
      </section>
    </>
  );
}

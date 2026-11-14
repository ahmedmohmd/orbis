import { Clock, Mail, MapPin } from "lucide-react";
import { ContactForm } from "@/components/site/contact-form";
import { ContactScene } from "@/components/site/illustrations";

export const metadata = { title: "Contact" };

const INFO = [
  [Mail, "Write to us", "Use the form – your message goes straight to the administrators’ inbox."],
  [Clock, "Reply time", "We usually answer within one working day."],
  [MapPin, "Where we work", "Supporting solar and power stations across the region."],
] as const;

export default function Contact() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Contact</span>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight">Let’s <span className="brand-text">talk</span></h1>
          <p className="mt-5 text-lg text-muted-foreground">Questions, ideas for your template, or need an account? Send us a message.</p>
        </div>
        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid content-start gap-5">
            <ContactScene className="w-full drop-shadow-2xl" />
            {INFO.map(([Icon, t, d]) => (
              <div key={t} className="flex items-start gap-4 rounded-2xl border bg-card p-5">
                <span className="brand-gradient grid size-11 shrink-0 place-items-center rounded-xl text-white"><Icon className="size-5" /></span>
                <div><div className="font-semibold">{t}</div><div className="text-sm text-muted-foreground">{d}</div></div>
              </div>
            ))}
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

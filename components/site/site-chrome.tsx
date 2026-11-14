"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Menu, Moon, Sun, X } from "lucide-react";
import { Logo } from "@/components/page-header";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const LINKS = [["/", "Home"], ["/about", "About"], ["/contact", "Contact"]] as const;

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const cta = signedIn ? { href: "/dashboard", label: "Open app" } : { href: "/login", label: "Sign in" };
  return (
    <header className="glass sticky top-0 z-50 border-b border-border/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3"><Logo size={34} /><span className="leading-tight"><span className="block text-[15px] font-bold tracking-tight">Station Report</span><span className="brand-text block text-[10.5px] font-semibold uppercase tracking-[0.2em]">Studio</span></span></Link>
        <nav className="ml-8 hidden items-center gap-1 md:flex">
          {LINKS.map(([h, l]) => <Link key={h} href={h} className={cn("rounded-full px-4 py-2 text-sm font-medium transition-colors", path === h ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={toggle} aria-label="Toggle theme" className="grid size-9 place-items-center rounded-full border bg-card hover:bg-muted">{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</button>
          <Link href={cta.href} className="brand-gradient hidden items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-[1.03] sm:inline-flex">{cta.label}<ArrowRight className="size-4" /></Link>
          <button onClick={() => setOpen((o) => !o)} aria-label="Menu" className="grid size-9 place-items-center rounded-full border bg-card md:hidden">{open ? <X className="size-4" /> : <Menu className="size-4" />}</button>
        </div>
      </div>
      {open && (
        <div className="border-t bg-background px-4 pb-5 pt-3 md:hidden">
          {LINKS.map(([h, l]) => <Link key={h} href={h} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-base font-medium hover:bg-muted">{l}</Link>)}
          <Link href={cta.href} className="brand-gradient mt-3 flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold text-white">{cta.label}<ArrowRight className="size-4" /></Link>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-card/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3"><Logo size={36} /><span className="text-lg font-bold tracking-tight">Station Report Studio</span></div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">The monthly station report, built once and generated every month – in PDF and Word, with charts, photos and annexes that number themselves.</p>
        </div>
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Explore</div>
          <ul className="grid gap-2 text-sm">{LINKS.map(([h, l]) => <li key={h}><Link href={h} className="hover:text-primary">{l}</Link></li>)}<li><Link href="/login" className="hover:text-primary">Sign in</Link></li></ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Built for</div>
          <ul className="grid gap-2 text-sm text-muted-foreground"><li>Station managers</li><li>HSE officers</li><li>Operations & maintenance teams</li></ul>
        </div>
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Station Report Studio. All rights reserved.</div>
    </footer>
  );
}

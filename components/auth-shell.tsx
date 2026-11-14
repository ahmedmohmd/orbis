import Link from "next/link";
import { AuthScene } from "@/components/site/illustrations";
import { Logo } from "@/components/page-header";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden lg:block">
        <AuthScene className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06143a]/80 via-transparent to-[#06143a]/30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center gap-3"><Logo size={40} /><span className="text-lg font-bold tracking-tight">Orbis</span></Link>
          <div className="max-w-md">
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight">Every month’s report, finished before the coffee cools.</h2>
            <p className="mt-4 text-white/80">Templates, charts, photos, annexes and one-click PDF & Word export – all in one calm place.</p>
          </div>
        </div>
      </aside>
      <main className="relative flex items-center justify-center px-5 py-12">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-3 lg:hidden"><Logo size={36} /><span className="font-bold">Orbis</span></Link>
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mb-8 mt-2 text-sm text-muted-foreground">{subtitle}</p>
          {children}
          <p className="mt-8 text-center text-xs text-muted-foreground"><Link href="/" className="hover:text-foreground">← Back to website</Link></p>
        </div>
      </main>
    </div>
  );
}

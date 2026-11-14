import { cn } from "@/lib/utils";

const COLORS = ["from-blue-500 to-cyan-400", "from-orange-500 to-amber-400", "from-emerald-500 to-lime-400", "from-violet-500 to-pink-400", "from-rose-500 to-orange-400", "from-sky-500 to-indigo-400"];

/** Profile photo, or coloured initials when there is none. */
export function Avatar({ src, name, size = 36, className }: { src?: string; name: string; size?: number; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
  const tone = COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={style} className={cn("shrink-0 rounded-full object-cover ring-2 ring-background", className)} />
  ) : (
    <span style={style} className={cn("grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white ring-2 ring-background", tone, className)}>{initials}</span>
  );
}

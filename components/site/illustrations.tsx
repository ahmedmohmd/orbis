/**
 * Hand-drawn SVG illustrations for the landing site and the sign-in pages.
 * They are self-contained (own sky / card backgrounds) so they look right in light and dark themes.
 */
import type { CSSProperties, ReactNode } from "react";

/** Parallax layer vars: depth (scroll speed; negative = moves faster than the page) and mouse strength. */
const d = (depth: number, mouse = depth) => ({ "--d": depth, "--m": mouse } as CSSProperties);

const rays = (cx: number, cy: number, r1: number, r2: number, n: number, stroke: string, w = 2) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return <line key={i} x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2} stroke={stroke} strokeWidth={w} strokeLinecap="round" />;
  });

/** Rows of PV panels in perspective. */
function PanelField({ y0, rows, w, h }: { y0: number; rows: number; w: number; h: number }) {
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const k = 0.5 + r * 0.26;
    const pw = 46 * k, ph = 24 * k, gap = 5 * k;
    const y = y0 + r * (ph + 9 * k) + r * r * 1.5;
    const count = Math.ceil((w + 80) / (pw + gap));
    const x0 = (w - count * (pw + gap)) / 2;
    for (let c = 0; c < count; c++) {
      const x = x0 + c * (pw + gap);
      const d = pw * 0.1;
      out.push(
        <g key={`${r}-${c}`}>
          <polygon points={`${x + d},${y} ${x + pw - d},${y} ${x + pw},${y + ph} ${x},${y + ph}`} fill="url(#ill-panel)" stroke="#9ed2ff" strokeOpacity=".55" strokeWidth={0.6} />
          <path d={`M${x + pw / 3},${y} L${x + pw / 3 - d / 3},${y + ph} M${x + (2 * pw) / 3},${y} L${x + (2 * pw) / 3 + d / 3},${y + ph} M${x + d / 2},${y + ph / 2} H${x + pw - d / 2}`} stroke="#bfe3ff" strokeOpacity=".38" strokeWidth={0.5} fill="none" />
        </g>,
      );
    }
    if (r === rows - 1 && h) void h;
  }
  return <>{out}</>;
}

function Pylon({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke="#0b2a5b" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M0 0 L-16 150 M0 0 L16 150 M-9 70 H9 M-12 105 H12 M-6 40 L9 70 L-12 105 L16 150 M6 40 L-9 70 L12 105 L-16 150" />
      <path d="M-30 22 H30 M-22 48 H22" strokeWidth="2.6" />
      <circle cx="-30" cy="22" r="2.4" fill="#0b2a5b" /><circle cx="30" cy="22" r="2.4" fill="#0b2a5b" /><circle cx="-22" cy="48" r="2.4" fill="#0b2a5b" /><circle cx="22" cy="48" r="2.4" fill="#0b2a5b" />
    </g>
  );
}

/** Big hero picture: a solar station at golden hour with floating report widgets. */
export function HeroScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 560" className={className} role="img" aria-label="Solar power station with report charts floating above it">
      <defs>
        <linearGradient id="ill-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c2a6e" /><stop offset=".45" stopColor="#2f6fe0" /><stop offset=".78" stopColor="#ffb56b" /><stop offset="1" stopColor="#ffd9a0" /></linearGradient>
        <radialGradient id="ill-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff" /><stop offset=".3" stopColor="#ffe9b0" stopOpacity=".95" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
        <linearGradient id="ill-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1e40af" /><stop offset=".55" stopColor="#2563eb" /><stop offset="1" stopColor="#38bdf8" /></linearGradient>
        <linearGradient id="ill-hill1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b63c9" /><stop offset="1" stopColor="#1d3f9a" /></linearGradient>
        <linearGradient id="ill-hill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e3f9e" /><stop offset="1" stopColor="#0f2a6b" /></linearGradient>
        <linearGradient id="ill-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12337d" /><stop offset="1" stopColor="#071a45" /></linearGradient>
        <linearGradient id="ill-card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#f1f6ff" /></linearGradient>
        <linearGradient id="ill-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" /><stop offset="1" stopColor="#06b6d4" /></linearGradient>
        <linearGradient id="ill-orange" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f97316" /><stop offset="1" stopColor="#fbbf24" /></linearGradient>
        <clipPath id="ill-clip"><rect width="640" height="560" rx="32" /></clipPath>
        <filter id="ill-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#061538" floodOpacity=".35" /></filter>
      </defs>
      <g clipPath="url(#ill-clip)">
        <g className="px" style={d(0.6)}>
        <rect x="-60" y="-140" width="760" height="760" fill="url(#ill-sky)" />
        {/* stars */}
        {[[60, 40], [130, 90], [210, 30], [300, 70], [520, 36], [580, 110], [90, 150]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 1.2 : 1.8} fill="#fff" opacity={0.55} className="anim-glow" />)}
        {/* sun */}
        <circle cx="448" cy="318" r="170" fill="url(#ill-sun)" opacity=".9" />
        <g className="anim-spin-slow">{rays(448, 318, 74, 112, 24, "#fff3c9", 2)}</g>
        <circle cx="448" cy="318" r="56" fill="#fff6d6" />
        <circle cx="448" cy="318" r="42" fill="#fff" opacity=".9" />
        </g>
        {/* hills */}
        <g className="px" style={d(0.4)}>
        <path d="M-10 350 C 80 300 160 318 250 340 S 400 330 470 322 S 600 300 650 330 V 420 H -10 Z" fill="url(#ill-hill1)" />
        </g>
        <g className="px" style={d(0.18)}>
        <path d="M-10 388 C 100 350 210 372 320 380 S 520 360 650 386 V 470 H -10 Z" fill="url(#ill-hill2)" />
        </g>
        {/* substation */}
        <g className="px" style={d(0.28)}>
        <g transform="translate(52 330)">
          <rect x="0" y="12" width="64" height="34" rx="3" fill="#0e2c6b" /><rect x="8" y="22" width="12" height="24" fill="#ffd27a" opacity=".9" /><rect x="26" y="20" width="10" height="10" fill="#8ec5ff" opacity=".8" /><rect x="40" y="20" width="10" height="10" fill="#8ec5ff" opacity=".8" />
          <rect x="68" y="20" width="18" height="26" rx="2" fill="#16397f" /><path d="M72 26 h10 M72 32 h10 M72 38 h10" stroke="#7fb4ff" strokeWidth="1.4" />
        </g>
        <Pylon x={540} y={250} s={0.92} />
        <path d="M510 272 C 430 298 380 300 300 296 S 150 296 120 330" stroke="#0b2a5b" strokeWidth="1.4" fill="none" opacity=".75" />
        <path d="M518 298 C 440 318 370 318 300 314 S 170 316 130 340" stroke="#0b2a5b" strokeWidth="1.4" fill="none" opacity=".75" />
        </g>
        {/* ground + panels */}
        <rect y="400" width="640" height="160" fill="url(#ill-ground)" />
        <PanelField y0={398} rows={5} w={640} h={160} />
        <rect y="520" width="640" height="40" fill="#050f2c" opacity=".55" />
      </g>

      {/* floating widgets */}
      <g className="px" style={d(-0.35, 1)}><g transform="translate(28 36)"><g className="anim-float" filter="url(#ill-shadow)">
        <rect width="206" height="128" rx="18" fill="url(#ill-card)" />
        <text x="18" y="28" fontSize="10.5" fontWeight="700" fill="#64748b" letterSpacing="1.4" fontFamily="Inter, Segoe UI, sans-serif">ENERGY · OCT</text>
        <text x="18" y="54" fontSize="22" fontWeight="800" fill="#0b1b3a" fontFamily="Inter, Segoe UI, sans-serif">1,959 MWh</text>
        {[14, 24, 18, 32, 28, 40, 34, 44].map((h, i) => <rect key={i} x={18 + i * 22} y={116 - h} width="14" height={h} rx="4" fill="url(#ill-bar)" opacity={0.55 + i * 0.06} />)}
        <path d="M18 102 C 50 92 70 98 100 86 S 150 80 188 70" stroke="#f97316" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <circle cx="188" cy="70" r="4" fill="#fff" stroke="#f97316" strokeWidth="2.4" />
      </g></g></g>

      <g className="px" style={d(-0.6, 1.4)}><g transform="translate(446 62)"><g className="anim-float" style={{ animationDelay: "-2s" }} filter="url(#ill-shadow)">
        <rect width="150" height="150" rx="22" fill="url(#ill-card)" />
        <circle cx="75" cy="66" r="40" fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="75" cy="66" r="40" fill="none" stroke="url(#ill-orange)" strokeWidth="10" strokeLinecap="round" strokeDasharray="236 251" transform="rotate(-90 75 66)" />
        <text x="75" y="72" textAnchor="middle" fontSize="19" fontWeight="800" fill="#0b1b3a" fontFamily="Inter, Segoe UI, sans-serif">99.9%</text>
        <text x="75" y="132" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#64748b" letterSpacing="1.2" fontFamily="Inter, Segoe UI, sans-serif">GRID UPTIME</text>
      </g></g></g>

      <g className="px" style={d(-0.2, .8)}><g transform="translate(300 438)"><g className="anim-float" style={{ animationDelay: "-4s" }} filter="url(#ill-shadow)">
        <rect width="172" height="52" rx="26" fill="#fff" />
        <rect x="8" y="8" width="36" height="36" rx="18" fill="url(#ill-orange)" />
        <path d="M26 17 v14 m-6 -5 l6 6 l6 -6" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="56" y="25" fontSize="12.5" fontWeight="800" fill="#0b1b3a" fontFamily="Inter, Segoe UI, sans-serif">Export report</text>
        <text x="56" y="40" fontSize="10" fontWeight="600" fill="#64748b" fontFamily="Inter, Segoe UI, sans-serif">PDF · Word</text>
      </g></g></g>

      <g className="px" style={d(-0.45, 1.2)}><g transform="translate(40 232)"><g className="anim-float" style={{ animationDelay: "-1s" }} filter="url(#ill-shadow)">
        <rect width="118" height="40" rx="20" fill="#0d9488" />
        <text x="59" y="25.5" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#fff" fontFamily="Inter, Segoe UI, sans-serif">Annex 3 ✓</text>
      </g></g></g>
    </svg>
  );
}

/** A stylised exported report: cover page + inner page with tiles and charts. */
export function ReportMock({ className, theme = "ocean" }: { className?: string; theme?: "ocean" | "sunset" }) {
  const c = theme === "sunset" ? { a: "#ea580c", b: "#f59e0b", d1: "#b0430b", d2: "#d9570f" } : { a: "#2563eb", b: "#06b6d4", d1: "#12356f", d2: "#1d57a8" };
  const id = `rm-${theme}`;
  return (
    <svg viewBox="0 0 640 520" className={className} role="img" aria-label="Preview of an exported report">
      <defs>
        <linearGradient id={`${id}-cover`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c.d1} /><stop offset=".55" stopColor={c.d2} /><stop offset="1" stopColor={c.a} /></linearGradient>
        <linearGradient id={`${id}-ban`} x1="0" x2="1"><stop offset="0" stopColor={c.d1} /><stop offset=".6" stopColor={c.d2} /><stop offset="1" stopColor={c.a} /></linearGradient>
        <linearGradient id={`${id}-acc`} x1="0" x2="1"><stop offset="0" stopColor={c.a} /><stop offset="1" stopColor={c.b} /></linearGradient>
        <radialGradient id={`${id}-sun`}><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".4" stopColor={c.b} stopOpacity=".5" /><stop offset="1" stopColor={c.b} stopOpacity="0" /></radialGradient>
        <filter id={`${id}-sh`} x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#0b1b3a" floodOpacity=".28" /></filter>
      </defs>
      {/* cover */}
      <g transform="rotate(-5 160 270) translate(30 60)" filter={`url(#${id}-sh)`}>
        <rect width="270" height="382" rx="10" fill={`url(#${id}-cover)`} />
        <circle cx="210" cy="86" r="96" fill={`url(#${id}-sun)`} />
        {rays(210, 86, 38, 62, 12, "#fff", 1.6).map((n) => n)}
        {[40, 62, 84].map((r, i) => <circle key={r} cx="210" cy="86" r={r} fill="none" stroke="#fff" strokeOpacity={0.22 - i * 0.05} />)}
        <rect x="26" y="26" width="26" height="26" rx="8" fill={`url(#${id}-acc)`} /><rect x="60" y="30" width="62" height="6" rx="3" fill="#fff" opacity=".85" /><rect x="60" y="42" width="40" height="4" rx="2" fill="#fff" opacity=".45" />
        <rect x="26" y="188" width="70" height="5" rx="2.5" fill="#fff" opacity=".6" />
        <text x="26" y="228" fontSize="34" fontWeight="800" fill="#fff" fontFamily="Inter, Segoe UI, sans-serif">Abu Minqar</text>
        <rect x="26" y="244" width="92" height="24" rx="12" fill="#fff" opacity=".16" /><text x="40" y="261" fontSize="12.5" fontWeight="700" fill="#fff" fontFamily="Inter, Segoe UI, sans-serif">Oct 2026</text>
        {[0, 1, 2].map((i) => <rect key={i} x={26 + i * 74} y="316" width="66" height="40" rx="8" fill="#fff" opacity=".12" />)}
        {[0, 1, 2].map((i) => <rect key={i} x={34 + i * 74} y="326" width="40" height="4" rx="2" fill="#fff" opacity=".55" />)}
        <path d="M-6 300 C 60 270, 120 330, 190 296 S 260 280, 280 300" stroke={c.b} strokeWidth="1.6" fill="none" opacity=".8" />
      </g>
      {/* inner page */}
      <g transform="rotate(4 460 280) translate(300 40)" filter={`url(#${id}-sh)`}>
        <rect width="290" height="410" rx="10" fill="#fff" />
        <rect x="14" y="16" width="262" height="62" rx="12" fill={`url(#${id}-ban)`} />
        <rect x="30" y="30" width="54" height="6" rx="3" fill="#fff" opacity=".6" /><text x="30" y="62" fontSize="18" fontWeight="800" fill="#fff" fontFamily="Inter, Segoe UI, sans-serif">Operation</text>
        <text x="236" y="66" fontSize="38" fontWeight="800" fill="#fff" opacity=".14" fontFamily="Inter, Segoe UI, sans-serif">02</text>
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${14 + i * 90} 92)`}>
            <rect width="82" height="54" rx="10" fill="#f6f8fc" stroke="#e3e9f2" /><rect width="82" height="4" rx="2" fill={`url(#${id}-acc)`} />
            <rect x="10" y="16" width="38" height="4" rx="2" fill="#94a3b8" /><rect x="10" y="28" width="52" height="11" rx="3" fill="#0b1b3a" opacity=".85" />
          </g>
        ))}
        <rect x="14" y="156" width="170" height="124" rx="12" fill="#fff" stroke="#e3e9f2" />
        {[40, 62, 50, 78, 66, 90, 74].map((h, i) => <rect key={i} x={28 + i * 21} y={266 - h} width="13" height={h} rx="4" fill={`url(#${id}-acc)`} opacity={0.5 + i * 0.07} />)}
        <rect x="192" y="156" width="84" height="124" rx="12" fill="#fff" stroke="#e3e9f2" />
        <circle cx="234" cy="206" r="26" fill="none" stroke="#e8edf5" strokeWidth="9" /><circle cx="234" cy="206" r="26" fill="none" stroke={c.a} strokeWidth="9" strokeLinecap="round" strokeDasharray="120 164" transform="rotate(-90 234 206)" />
        <text x="234" y="211" textAnchor="middle" fontSize="13" fontWeight="800" fill="#0b1b3a" fontFamily="Inter, Segoe UI, sans-serif">73%</text>
        <rect x="204" y="248" width="60" height="5" rx="2.5" fill="#cbd5e1" /><rect x="212" y="260" width="44" height="5" rx="2.5" fill="#e2e8f0" />
        <rect x="14" y="292" width="262" height="104" rx="12" fill="#fff" stroke="#e3e9f2" />
        <path d="M28 372 C 62 330, 84 360, 118 336 S 176 318, 206 340 S 250 312, 262 306 V 384 H 28 Z" fill={c.a} opacity=".12" />
        <path d="M28 372 C 62 330, 84 360, 118 336 S 176 318, 206 340 S 250 312, 262 306" stroke={c.a} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <circle cx="206" cy="340" r="4.5" fill="#fff" stroke={c.b} strokeWidth="2.5" />
        <rect x="28" y="304" width="64" height="5" rx="2.5" fill="#94a3b8" />
      </g>
    </svg>
  );
}

/* --------------------------- feature icons --------------------------- */
const grad = (id: string, a: string, b: string) => <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>;

export type FeatureKind = "sections" | "photos" | "annex" | "charts" | "export" | "safe" | "roles" | "themes";
export function FeatureArt({ kind, className }: { kind: FeatureKind; className?: string }) {
  const id = `fa-${kind}`;
  const tone: Record<FeatureKind, [string, string]> = {
    sections: ["#2563eb", "#06b6d4"], photos: ["#f97316", "#fbbf24"], annex: ["#0d9488", "#2dd4bf"], charts: ["#7c3aed", "#ec4899"],
    export: ["#2563eb", "#7c3aed"], safe: ["#059669", "#84cc16"], roles: ["#0ea5e9", "#6366f1"], themes: ["#ea580c", "#2563eb"],
  };
  const [a, b] = tone[kind];
  const body: Record<FeatureKind, ReactNode> = {
    sections: (<><rect x="12" y="34" width="40" height="14" rx="5" fill={`url(#${id})`} opacity=".45" /><rect x="12" y="22" width="40" height="14" rx="5" fill={`url(#${id})`} opacity=".7" /><rect x="12" y="10" width="40" height="14" rx="5" fill={`url(#${id})`} /><path d="M20 17 h16" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /><circle cx="50" cy="48" r="9" fill="#fff" stroke={`url(#${id})`} strokeWidth="2.4" /><path d="M50 44 v8 M46 48 h8" stroke={a} strokeWidth="2.2" strokeLinecap="round" /></>),
    photos: (<><rect x="8" y="16" width="48" height="36" rx="9" fill={`url(#${id})`} /><path d="M22 16 l3 -6 h14 l3 6" fill={`url(#${id})`} /><circle cx="32" cy="34" r="11" fill="#fff" opacity=".95" /><circle cx="32" cy="34" r="6.5" fill={a} /><circle cx="48" cy="24" r="2.2" fill="#fff" /></>),
    annex: (<><rect x="14" y="8" width="36" height="46" rx="7" fill="#fff" stroke={`url(#${id})`} strokeWidth="3" /><rect x="14" y="8" width="36" height="14" rx="7" fill={`url(#${id})`} /><text x="32" y="19" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff" fontFamily="Inter, sans-serif">A 1</text><path d="M22 32 h20 M22 39 h20 M22 46 h12" stroke={b} strokeWidth="2.4" strokeLinecap="round" /></>),
    charts: (<><rect x="8" y="10" width="48" height="44" rx="10" fill="#fff" stroke={`url(#${id})`} strokeWidth="3" /><rect x="16" y="34" width="7" height="14" rx="2.5" fill={`url(#${id})`} /><rect x="28" y="26" width="7" height="22" rx="2.5" fill={`url(#${id})`} /><rect x="40" y="18" width="7" height="30" rx="2.5" fill={`url(#${id})`} /><path d="M14 30 C 24 18, 32 30, 50 14" stroke="#f97316" strokeWidth="2.4" fill="none" strokeLinecap="round" /></>),
    export: (<><path d="M16 6 h22 l12 12 v34 a5 5 0 0 1 -5 5 H16 a5 5 0 0 1 -5 -5 V11 a5 5 0 0 1 5 -5Z" fill={`url(#${id})`} /><path d="M38 6 v12 h12" fill="#fff" opacity=".35" /><path d="M31 26 v16 m-7 -6 l7 7 l7 -7" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>),
    safe: (<><path d="M32 6 L52 14 V30 C 52 43, 43 52, 32 58 C 21 52, 12 43, 12 30 V14 Z" fill={`url(#${id})`} /><path d="M22 32 l7 7 l14 -15" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>),
    roles: (<><circle cx="24" cy="22" r="10" fill={`url(#${id})`} /><path d="M6 52 c0 -12 8 -18 18 -18 s18 6 18 18" fill={`url(#${id})`} /><circle cx="46" cy="26" r="8" fill="#fff" stroke={`url(#${id})`} strokeWidth="3" /><path d="M36 54 c1 -9 6 -13 12 -13 s10 4 10 13" fill="#fff" stroke={`url(#${id})`} strokeWidth="3" /></>),
    themes: (<><circle cx="32" cy="32" r="24" fill="#fff" stroke={`url(#${id})`} strokeWidth="3" /><path d="M32 8 a24 24 0 0 1 0 48 Z" fill={`url(#${id})`} /><circle cx="22" cy="24" r="4" fill="#ea580c" /><circle cx="20" cy="38" r="4" fill="#fbbf24" /><circle cx="44" cy="22" r="4" fill="#fff" /></>),
  };
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>{grad(id, a, b)}</defs>
      {body[kind]}
    </svg>
  );
}

/** Panorama for the About page: from the station to the manager's desk. */
export function FlowScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 960 360" className={className} role="img" aria-label="From the station to the monthly report">
      <defs>
        <linearGradient id="fl-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0d2a6c" /><stop offset=".6" stopColor="#1d4ed8" /><stop offset="1" stopColor="#0ea5e9" /></linearGradient>
        <linearGradient id="fl-or" x1="0" x2="1"><stop offset="0" stopColor="#f97316" /><stop offset="1" stopColor="#fbbf24" /></linearGradient>
        <linearGradient id="fl-pan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1e3a8a" /><stop offset="1" stopColor="#38bdf8" /></linearGradient>
        <clipPath id="fl-c"><rect width="960" height="360" rx="28" /></clipPath>
      </defs>
      <g clipPath="url(#fl-c)">
        <rect width="960" height="360" fill="url(#fl-bg)" />
        <circle cx="120" cy="70" r="120" fill="#fff" opacity=".07" /><circle cx="860" cy="300" r="170" fill="#fff" opacity=".06" />
        <circle cx="86" cy="64" r="26" fill="#fff4cf" />{rays(86, 64, 34, 50, 14, "#fff4cf", 2.2)}
        <rect y="290" width="960" height="70" fill="#071a45" opacity=".7" />
        {/* stage 1 – station */}
        <g transform="translate(40 150)">
          {[0, 1, 2].map((i) => <g key={i} transform={`translate(${i * 62} ${i * 6})`}><polygon points="8,0 52,0 60,34 0,34" fill="url(#fl-pan)" stroke="#9ed2ff" strokeOpacity=".6" /><path d="M23 0 L20 34 M38 0 L40 34 M4 17 H56" stroke="#bfe3ff" strokeOpacity=".45" /><path d="M30 34 V56" stroke="#9ed2ff" strokeWidth="3" /></g>)}
          <g transform="translate(205 -56)" stroke="#e8f3ff" strokeWidth="3" strokeLinecap="round"><path d="M0 120 V10" /><g className="anim-spin-slow" style={{ transformOrigin: "0px 6px" }}><path d="M0 6 L0 -42 M0 6 L41 30 M0 6 L-41 30" /></g><circle cx="0" cy="6" r="5" fill="#fff" /></g>
        </g>
        <text x="40" y="276" fontSize="14" fontWeight="800" fill="#fff" opacity=".9" letterSpacing="2" fontFamily="Inter, Segoe UI, sans-serif">1 · THE STATION</text>
        {/* arrows */}
        {[296, 592].map((x, i) => <g key={x} transform={`translate(${x} 176)`}><path d="M0 18 H62" stroke="url(#fl-or)" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" /><path d="M58 6 L76 18 L58 30" stroke="#fbbf24" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />{i === 0 && <circle cx="55" cy="18" r="0" />}</g>)}
        {/* stage 2 – app */}
        <g transform="translate(398 96)">
          <rect width="170" height="150" rx="18" fill="#fff" /><rect width="170" height="30" rx="18" fill="#eef3ff" /><rect y="18" width="170" height="12" fill="#eef3ff" />
          {[14, 28, 42].map((x) => <circle key={x} cx={x} cy="15" r="4" fill={x === 14 ? "#f87171" : x === 28 ? "#fbbf24" : "#34d399"} />)}
          <rect x="14" y="44" width="62" height="86" rx="8" fill="#f1f5ff" />{[56, 70, 84, 98].map((y) => <rect key={y} x="22" y={y} width="46" height="6" rx="3" fill="#93b4f5" />)}
          <rect x="86" y="44" width="70" height="40" rx="8" fill="url(#fl-pan)" /><path d="M92 78 C 108 54, 120 74, 132 58 S 148 52, 150 50" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <rect x="86" y="92" width="70" height="38" rx="8" fill="#fff7ed" stroke="#fed7aa" /><circle cx="108" cy="111" r="11" fill="none" stroke="#fdba74" strokeWidth="5" /><circle cx="108" cy="111" r="11" fill="none" stroke="#f97316" strokeWidth="5" strokeDasharray="48 70" strokeLinecap="round" transform="rotate(-90 108 111)" /><rect x="126" y="104" width="22" height="5" rx="2.5" fill="#fdba74" /><rect x="126" y="114" width="16" height="5" rx="2.5" fill="#fed7aa" />
        </g>
        <text x="398" y="276" fontSize="14" fontWeight="800" fill="#fff" opacity=".9" letterSpacing="2" fontFamily="Inter, Segoe UI, sans-serif">2 · FILL IT IN, ANY DAY</text>
        {/* stage 3 – reports */}
        <g transform="translate(690 58)">
          <g transform="rotate(-8 60 90)"><rect width="120" height="168" rx="8" fill="#fff" opacity=".55" /></g>
          <g transform="rotate(5 60 90) translate(40 8)"><rect width="120" height="168" rx="8" fill="#fff" /><rect x="10" y="12" width="100" height="30" rx="7" fill="url(#fl-pan)" />{[56, 70, 84].map((y) => <rect key={y} x="10" y={y} width={y === 84 ? 60 : 100} height="6" rx="3" fill="#dbe5f7" />)}<rect x="10" y="102" width="46" height="52" rx="6" fill="#eaf1ff" /><circle cx="86" cy="128" r="17" fill="none" stroke="#e2e8f0" strokeWidth="8" /><circle cx="86" cy="128" r="17" fill="none" stroke="#f97316" strokeWidth="8" strokeDasharray="70 107" strokeLinecap="round" transform="rotate(-90 86 128)" /></g>
          <g transform="translate(12 150)"><rect width="64" height="30" rx="15" fill="url(#fl-or)" /><text x="32" y="20" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#fff" fontFamily="Inter, Segoe UI, sans-serif">PDF</text></g>
          <g transform="translate(86 160)"><rect width="64" height="30" rx="15" fill="#fff" /><text x="32" y="20" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#1d4ed8" fontFamily="Inter, Segoe UI, sans-serif">Word</text></g>
        </g>
        <text x="690" y="276" fontSize="14" fontWeight="800" fill="#fff" opacity=".9" letterSpacing="2" fontFamily="Inter, Segoe UI, sans-serif">3 · SEND TO THE MANAGER</text>
      </g>
    </svg>
  );
}

/** Envelope + paper plane for the Contact page. */
export function ContactScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 360" className={className} role="img" aria-label="A message on its way">
      <defs>
        <linearGradient id="ct-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0d2a6c" /><stop offset="1" stopColor="#2563eb" /></linearGradient>
        <linearGradient id="ct-or" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f97316" /><stop offset="1" stopColor="#fbbf24" /></linearGradient>
        <clipPath id="ct-c"><rect width="480" height="360" rx="28" /></clipPath>
      </defs>
      <g clipPath="url(#ct-c)">
        <rect width="480" height="360" fill="url(#ct-bg)" />
        <circle cx="380" cy="70" r="110" fill="#fff" opacity=".07" /><circle cx="60" cy="320" r="130" fill="#fff" opacity=".06" />
        <circle cx="388" cy="66" r="22" fill="#fff4cf" />{rays(388, 66, 30, 44, 12, "#fff4cf", 2)}
        <path d="M30 260 C 120 200, 190 270, 280 210 S 400 150, 460 190" stroke="#fbbf24" strokeWidth="2.4" strokeDasharray="3 9" strokeLinecap="round" fill="none" />
        <g transform="translate(96 126)"><g className="anim-float">
          <rect width="236" height="156" rx="16" fill="#fff" /><path d="M6 14 L118 92 L230 14" stroke="#c7d6f5" strokeWidth="5" fill="none" strokeLinejoin="round" strokeLinecap="round" /><path d="M6 142 L90 74 M230 142 L146 74" stroke="#e1e9fa" strokeWidth="4" strokeLinecap="round" />
          <circle cx="196" cy="118" r="22" fill="url(#ct-or)" /><path d="M186 118 l7 7 l12 -14" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g></g>
        <g transform="translate(330 150) rotate(-14)"><g className="anim-float" style={{ animationDelay: "-3s" }}><path d="M0 40 L112 0 L74 96 L52 60 Z" fill="#fff" /><path d="M112 0 L52 60 L48 96 L74 96" fill="#cfe0ff" /><path d="M52 60 L112 0" stroke="#93b4f5" strokeWidth="2" /></g></g>
        <g transform="translate(60 56)"><circle r="20" fill="#fff" /><path d="M0 12 C -9 2 -12 -3 -12 -7 a12 12 0 0 1 24 0 c0 4 -3 9 -12 19Z" fill="#f97316" /><circle cy="-7" r="4.4" fill="#fff" /></g>
      </g>
    </svg>
  );
}

/** Left panel art of the sign-in pages. */
export function AuthScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 760" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="au-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a2160" /><stop offset=".5" stopColor="#1f5fd6" /><stop offset=".82" stopColor="#ff9f5a" /><stop offset="1" stopColor="#ffd08a" /></linearGradient>
        <radialGradient id="au-sun"><stop offset="0" stopColor="#fff" /><stop offset=".35" stopColor="#ffe9b0" stopOpacity=".9" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
        <linearGradient id="ill-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1e40af" /><stop offset=".55" stopColor="#2563eb" /><stop offset="1" stopColor="#38bdf8" /></linearGradient>
        <linearGradient id="au-gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12337d" /><stop offset="1" stopColor="#050f2c" /></linearGradient>
      </defs>
      <rect width="560" height="760" fill="url(#au-sky)" />
      {Array.from({ length: 26 }, (_, i) => <circle key={i} cx={(i * 97) % 560} cy={(i * 53) % 300} r={i % 3 ? 1 : 1.7} fill="#fff" opacity=".6" className="anim-glow" />)}
      <circle cx="380" cy="470" r="230" fill="url(#au-sun)" />
      <g className="anim-spin-slow">{rays(380, 470, 100, 150, 28, "#fff3c9", 2)}</g>
      <circle cx="380" cy="470" r="70" fill="#fff6d6" />
      <path d="M-10 500 C 90 450 190 480 290 500 S 480 480 580 470 V 620 H -10Z" fill="#1d3f9a" />
      <path d="M-10 548 C 120 510 260 540 380 550 S 520 530 580 540 V 700 H -10Z" fill="#0f2a6b" />
      <rect y="580" width="560" height="180" fill="url(#au-gr)" />
      <PanelField y0={578} rows={5} w={560} h={180} />
    </svg>
  );
}

import type { Brand } from "./types";

export interface ThemePreset { id: string; name: string; blurb: string; accent: string; accent2: string; deep?: string; mid?: string }

/** Colour themes of the exported report (the report itself is always light). */
export const THEMES: ThemePreset[] = [
  { id: "ocean", name: "Ocean", blurb: "Calm blue with a cyan glow – the original look", accent: "#2563eb", accent2: "#06b6d4", deep: "#12356f", mid: "#1d57a8" },
  { id: "sunset", name: "Sunset", blurb: "Warm orange – energetic, solar-station feel", accent: "#ea580c", accent2: "#f59e0b", deep: "#b0430b", mid: "#d9570f" },
  { id: "emerald", name: "Emerald", blurb: "Fresh green – sustainability and clean energy", accent: "#059669", accent2: "#84cc16" },
  { id: "violet", name: "Violet", blurb: "Modern purple with a pink accent", accent: "#7c3aed", accent2: "#ec4899" },
];

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  return [parseInt(f.slice(0, 2), 16) || 0, parseInt(f.slice(2, 4), 16) || 0, parseInt(f.slice(4, 6), 16) || 0];
}
const toHex = (c: number[]) => "#" + c.map((x) => clamp(x).toString(16).padStart(2, "0")).join("");
/** Mix a colour towards black (amount 0..1). */
export const darken = (hex: string, amount: number) => toHex(parse(hex).map((x) => x * (1 - amount)));

export interface ResolvedTheme { accent: string; accent2: string; deep: string; mid: string }

/** Colours used by cover, banners and table headers (HTML + Word). */
export function resolveTheme(brand: Pick<Brand, "accent" | "accent2" | "theme">): ResolvedTheme {
  const p = THEMES.find((x) => x.id === brand.theme && x.accent === brand.accent && x.accent2 === brand.accent2);
  return { accent: brand.accent, accent2: brand.accent2, deep: p?.deep ?? darken(brand.accent, 0.42), mid: p?.mid ?? darken(brand.accent, 0.16) };
}

export const noHash = (hex: string) => hex.replace("#", "").toUpperCase();

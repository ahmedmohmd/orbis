/**
 * Dependency-free SVG chart generators.
 * The same strings are used in the live preview, the PDF (Chromium) and the
 * Word export (rasterised with sharp), so all three always look identical.
 */

let counter = 0;
const nid = (p: string) => `${p}${++counter}`;

export const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const FONT = `font-family="Inter, 'Segoe UI', Helvetica, Arial, sans-serif"`;
const INK = "#0f172a";
const MUTED = "#64748b";
const GRID = "#e2e8f0";

export const fmtCompact = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e6) return `${+(n / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `${+(n / 1e3).toFixed(0)}k`;
  if (a >= 1e3) return `${+(n / 1e3).toFixed(1)}k`;
  return `${+n.toFixed(2)}`;
};

const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function niceScale(max: number, ticks = 4) {
  if (!(max > 0)) return { max: 1, step: 0.25 };
  const rough = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { max: Math.ceil(max / step) * step, step };
}

export interface Series {
  name: string;
  color: string;
  values: number[];
}

const svgOpen = (w: number, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ${FONT}>`;

function legend(series: Series[], x: number, y: number): string {
  let cx = x;
  return series
    .map((s) => {
      const out = `<rect x="${cx}" y="${y - 8}" width="10" height="10" rx="3" fill="${s.color}"/><text x="${cx + 15}" y="${y + 1}" font-size="11" fill="${MUTED}">${esc(trunc(s.name, 22))}</text>`;
      cx += 30 + Math.min(s.name.length, 22) * 6.2;
      return out;
    })
    .join("");
}

function axes(
  W: number,
  H: number,
  m: { l: number; r: number; t: number; b: number },
  scale: { max: number; step: number },
  unit?: string,
) {
  const plotH = H - m.t - m.b;
  let out = "";
  for (let v = 0; v <= scale.max + 1e-9; v += scale.step) {
    const y = m.t + plotH - (v / scale.max) * plotH;
    out += `<line x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}" stroke="${v === 0 ? "#cbd5e1" : GRID}" ${v === 0 ? "" : 'stroke-dasharray="3 4"'}/>`;
    out += `<text x="${m.l - 8}" y="${y + 3.5}" text-anchor="end" font-size="10" fill="${MUTED}">${fmtCompact(v)}</text>`;
  }
  if (unit) out += `<text x="${m.l - 8}" y="${m.t - 16}" text-anchor="end" font-size="10" fill="${MUTED}">${esc(unit)}</text>`;
  return out;
}

function xLabels(labels: string[], W: number, m: { l: number; r: number; b: number }, H: number, centers: number[]) {
  const n = labels.length;
  const every = Math.ceil(n / 14);
  const rotate = n > 7 || labels.some((l) => l.length > 9);
  return labels
    .map((l, i) => {
      if (i % every) return "";
      const x = centers[i];
      const y = H - m.b + 16;
      return rotate
        ? `<text x="${x}" y="${y - 2}" text-anchor="end" font-size="10" fill="${MUTED}" transform="rotate(-35 ${x} ${y - 2})">${esc(trunc(l, 14))}</text>`
        : `<text x="${x}" y="${y}" text-anchor="middle" font-size="10.5" fill="${MUTED}">${esc(trunc(l, 14))}</text>`;
    })
    .join("");
}

/* ------------------------------ bars ------------------------------ */

export function barChart(o: {
  labels: string[];
  series: Series[];
  width?: number;
  height?: number;
  stacked?: boolean;
  unit?: string;
}): string {
  const W = o.width ?? 640;
  const H = o.height ?? 280;
  const rotate = o.labels.length > 7 || o.labels.some((l) => l.length > 9);
  const m = { l: 50, r: 14, t: o.series.length > 1 ? 36 : 24, b: rotate ? 62 : 36 };
  const n = o.labels.length;
  const maxV = o.stacked
    ? Math.max(...o.labels.map((_, i) => o.series.reduce((a, s) => a + Math.max(0, s.values[i] ?? 0), 0)), 0)
    : Math.max(...o.series.flatMap((s) => s.values), 0);
  const scale = niceScale(maxV);
  const plotW = W - m.l - m.r;
  const plotH = H - m.t - m.b;
  const gw = plotW / n;
  const ns = o.stacked ? 1 : o.series.length;
  const bw = Math.min(46, (gw * 0.68) / ns);
  const defs = o.series
    .map((s, i) => {
      const id = `bg${counter + 1}_${i}`;
      return { id, def: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}"/><stop offset="1" stop-color="${s.color}" stop-opacity=".72"/></linearGradient>` };
    });
  counter++;
  let bars = "";
  const centers: number[] = [];
  const roundTop = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
    if (h <= 0) return "";
    r = Math.min(r, w / 2, h);
    return `<path d="M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z" fill="${fill}"/>`;
  };
  for (let i = 0; i < n; i++) {
    const cx = m.l + gw * i + gw / 2;
    centers.push(cx);
    if (o.stacked) {
      let acc = 0;
      o.series.forEach((s, si) => {
        const v = Math.max(0, s.values[i] ?? 0);
        const h = (v / scale.max) * plotH;
        const y = m.t + plotH - ((acc + v) / scale.max) * plotH;
        bars += roundTop(cx - bw / 2, y, bw, h, si === o.series.length - 1 ? 5 : 0, `url(#${defs[si].id})`);
        acc += v;
      });
    } else {
      o.series.forEach((s, si) => {
        const v = Math.max(0, s.values[i] ?? 0);
        const h = (v / scale.max) * plotH;
        const x = cx - (bw * ns) / 2 + si * bw + 1;
        const y = m.t + plotH - h;
        bars += roundTop(x, y, bw - 2, h, 5, `url(#${defs[si].id})`);
        if (n <= 10 && ns <= 2 && v > 0)
          bars += `<text x="${x + (bw - 2) / 2}" y="${y - 5}" text-anchor="middle" font-size="10" font-weight="600" fill="${INK}">${fmtCompact(v)}</text>`;
      });
    }
  }
  return (
    svgOpen(W, H) +
    `<defs>${defs.map((d) => d.def).join("")}</defs>` +
    axes(W, H, m, scale, o.unit) +
    bars +
    xLabels(o.labels, W, m, H, centers) +
    (o.series.length > 1 ? legend(o.series, m.l, 14) : "") +
    `</svg>`
  );
}

export function hbarChart(o: {
  items: { label: string; value: number; color: string }[];
  width?: number;
  max?: number;
  unit?: string;
}): string {
  const W = o.width ?? 640;
  const rowH = 36;
  const H = o.items.length * rowH + 12;
  const labelW = 190;
  const valW = 78;
  const max = o.max ?? Math.max(...o.items.map((i) => i.value), 1);
  const trackW = W - labelW - valW - 10;
  const idb = nid("hb");
  let defs = "";
  const rows = o.items
    .map((it, i) => {
      const y = 6 + i * rowH;
      const w = Math.max(0, Math.min(1, it.value / max)) * trackW;
      defs += `<linearGradient id="${idb}_${i}" x1="0" x2="1"><stop offset="0" stop-color="${it.color}" stop-opacity=".78"/><stop offset="1" stop-color="${it.color}"/></linearGradient>`;
      return (
        `<text x="0" y="${y + 18}" font-size="11.5" fill="${INK}">${esc(trunc(it.label, 30))}</text>` +
        `<rect x="${labelW}" y="${y + 6}" width="${trackW}" height="14" rx="7" fill="#f1f5f9"/>` +
        (w > 0 ? `<rect x="${labelW}" y="${y + 6}" width="${Math.max(w, 14)}" height="14" rx="7" fill="url(#${idb}_${i})"/>` : "") +
        `<text x="${W}" y="${y + 18}" text-anchor="end" font-size="12" font-weight="700" fill="${INK}">${fmtCompact(it.value)}${o.unit ? ` <tspan font-size="10" font-weight="500" fill="${MUTED}">${esc(o.unit)}</tspan>` : ""}</text>`
      );
    })
    .join("");
  return svgOpen(W, H) + `<defs>${defs}</defs>` + rows + `</svg>`;
}

/* ------------------------- line / area ---------------------------- */

/** Monotone cubic interpolation (same maths as d3.curveMonotoneX): smooth, never overshoots. */
function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const sign = (x: number) => (x < 0 ? -1 : 1);
  const t: number[] = new Array(n).fill(0);
  const slope = (i: number) => (pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0] || 1);
  for (let i = 1; i < n - 1; i++) {
    const h0 = pts[i][0] - pts[i - 1][0];
    const h1 = pts[i + 1][0] - pts[i][0];
    const s0 = slope(i - 1);
    const s1 = slope(i);
    const p = (s0 * h1 + s1 * h0) / (h0 + h1 || 1);
    t[i] = (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
  }
  // end-point tangents (d3 "slope2")
  const endSlope = (i0: number, i1: number, tt: number) => {
    const h = pts[i1][0] - pts[i0][0];
    return h ? ((3 * (pts[i1][1] - pts[i0][1])) / h - tt) / 2 : tt;
  };
  if (n === 2) {
    t[0] = t[1] = slope(0);
  } else {
    t[0] = endSlope(0, 1, t[1]);
    t[n - 1] = endSlope(n - 2, n - 1, t[n - 2]);
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const dx = (x1 - x0) / 3;
    d += ` C${x0 + dx},${y0 + dx * t[i]} ${x1 - dx},${y1 - dx * t[i + 1]} ${x1},${y1}`;
  }
  return d;
}

export function lineChart(o: {
  labels: string[];
  series: Series[];
  width?: number;
  height?: number;
  area?: boolean;
  unit?: string;
}): string {
  const W = o.width ?? 640;
  const H = o.height ?? 280;
  const rotate = o.labels.length > 7 || o.labels.some((l) => l.length > 9);
  const m = { l: 50, r: 18, t: o.series.length > 1 ? 36 : 24, b: rotate ? 62 : 36 };
  const n = o.labels.length;
  const scale = niceScale(Math.max(...o.series.flatMap((s) => s.values), 0));
  const plotW = W - m.l - m.r;
  const plotH = H - m.t - m.b;
  const xAt = (i: number) => (n === 1 ? m.l + plotW / 2 : m.l + (plotW * i) / (n - 1));
  const yAt = (v: number) => m.t + plotH - (Math.max(0, v) / scale.max) * plotH;
  const base = counter++;
  let defs = "";
  let body = "";
  o.series.forEach((s, si) => {
    const pts = s.values.map((v, i) => [xAt(i), yAt(v)] as [number, number]);
    const path = monotonePath(pts);
    const gid = `lg${base}_${si}`;
    defs += `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".30"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`;
    if (o.area !== false && pts.length > 1)
      body += `<path d="${path} L${pts[pts.length - 1][0]},${m.t + plotH} L${pts[0][0]},${m.t + plotH} Z" fill="url(#${gid})"/>`;
    body += `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (n <= 20)
      pts.forEach(([x, y]) => (body += `<circle cx="${x}" cy="${y}" r="3.6" fill="#fff" stroke="${s.color}" stroke-width="2"/>`));
  });
  return (
    svgOpen(W, H) +
    `<defs>${defs}</defs>` +
    axes(W, H, m, scale, o.unit) +
    body +
    xLabels(o.labels, W, m, H, o.labels.map((_, i) => xAt(i))) +
    (o.series.length > 1 ? legend(o.series, m.l, 14) : "") +
    `</svg>`
  );
}

/* ----------------------------- donut ------------------------------ */

export function donutChart(o: {
  items: { label: string; value: number; color: string }[];
  width?: number;
  height?: number;
  centerTop?: string;
  centerBottom?: string;
  unit?: string;
}): string {
  const W = o.width ?? 560;
  const H = o.height ?? 230;
  const r = 70;
  const sw = 28;
  const cx = 120;
  const cy = H / 2;
  const C = 2 * Math.PI * r;
  const total = o.items.reduce((a, i) => a + Math.max(0, i.value), 0) || 1;
  let acc = 0;
  const segs = o.items
    .map((it) => {
      const frac = Math.max(0, it.value) / total;
      const len = Math.max(0, frac * C - (o.items.length > 1 ? 3 : 0));
      const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${it.color}" stroke-width="${sw}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc * C}" transform="rotate(-90 ${cx} ${cy})"/>`;
      acc += frac;
      return seg;
    })
    .join("");
  const rowH = 44;
  const y0 = cy - (o.items.length * rowH) / 2;
  const leg = o.items
    .map((it, i) => {
      const y = y0 + i * rowH;
      const pct = ((Math.max(0, it.value) / total) * 100).toFixed(1);
      return (
        `<rect x="260" y="${y + 6}" width="12" height="12" rx="4" fill="${it.color}"/>` +
        `<text x="282" y="${y + 16}" font-size="12" fill="${MUTED}">${esc(trunc(it.label, 26))}</text>` +
        `<text x="282" y="${y + 34}" font-size="14" font-weight="700" fill="${INK}">${fmtCompact(it.value)}${o.unit ? ` <tspan font-size="10.5" font-weight="500" fill="${MUTED}">${esc(o.unit)}</tspan>` : ""}<tspan font-size="11" font-weight="600" fill="${it.color}"> · ${pct}%</tspan></text>`
      );
    })
    .join("");
  return (
    svgOpen(W, H) +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="${sw}"/>` +
    segs +
    (o.centerTop ? `<text x="${cx}" y="${cy + 2}" text-anchor="middle" font-size="22" font-weight="800" fill="${INK}">${esc(o.centerTop)}</text>` : "") +
    (o.centerBottom ? `<text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="10.5" fill="${MUTED}">${esc(o.centerBottom)}</text>` : "") +
    leg +
    `</svg>`
  );
}

/* ----------------------------- gauge ------------------------------ */

export function ringGauge(o: {
  value: number;
  max?: number;
  size?: number;
  color: string;
  text?: string;
  sub?: string;
}): string {
  const S = o.size ?? 120;
  const sw = Math.round(S * 0.11);
  const r = (S - sw) / 2;
  const C = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, o.value / (o.max ?? 100)));
  const id = nid("rg");
  return (
    svgOpen(S, S) +
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${o.color}" stop-opacity=".7"/><stop offset="1" stop-color="${o.color}"/></linearGradient></defs>` +
    `<circle cx="${S / 2}" cy="${S / 2}" r="${r}" fill="none" stroke="#e8eef5" stroke-width="${sw}"/>` +
    (frac > 0
      ? `<circle cx="${S / 2}" cy="${S / 2}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${frac * C} ${C}" transform="rotate(-90 ${S / 2} ${S / 2})"/>`
      : "") +
    (() => {
      const txt = o.text ?? `${Math.round(frac * 100)}%`;
      const fs = S * (txt.length > 6 ? 0.14 : txt.length > 5 ? 0.16 : txt.length > 4 ? 0.185 : 0.21);
      return `<text x="${S / 2}" y="${S / 2 + (o.sub ? 1 : fs * 0.33)}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${INK}">${esc(txt)}</text>`;
    })() +
    (o.sub ? `<text x="${S / 2}" y="${S / 2 + S * 0.17}" text-anchor="middle" font-size="${S * 0.095}" fill="${MUTED}">${esc(o.sub)}</text>` : "") +
    `</svg>`
  );
}

/* --------------------------- risk matrix --------------------------- */

const LEVEL = (s: string): number => {
  const v = s.trim().toLowerCase();
  if (v.startsWith("high") || v.startsWith("very") || v === "critical") return 2;
  if (v.startsWith("med") || v === "moderate") return 1;
  if (v.startsWith("low")) return 0;
  return -1;
};

export function riskMatrix(o: {
  risks: { label: string; prob: string; impact: string }[];
  width?: number;
}): string {
  const W = o.width ?? 640;
  const cell = 76;
  const gx = 90;
  const gy = 22;
  const H = gy + cell * 3 + 44;
  const colors = [
    ["#dcfce7", "#ecfccb", "#fef3c7"],
    ["#ecfccb", "#fef3c7", "#fed7aa"],
    ["#fef3c7", "#fed7aa", "#fecaca"],
  ]; // [prob][impact]
  const names = ["Low", "Medium", "High"];
  let out = svgOpen(W, H);
  for (let p = 0; p < 3; p++)
    for (let i = 0; i < 3; i++) {
      const x = gx + i * cell;
      const y = gy + (2 - p) * cell;
      out += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${cell - 3}" height="${cell - 3}" rx="10" fill="${colors[p][i]}"/>`;
    }
  names.forEach((n, i) => {
    out += `<text x="${gx + i * cell + cell / 2}" y="${gy + cell * 3 + 18}" text-anchor="middle" font-size="11" fill="${MUTED}">${n}</text>`;
    out += `<text x="${gx - 10}" y="${gy + (2 - i) * cell + cell / 2 + 4}" text-anchor="end" font-size="11" fill="${MUTED}">${n}</text>`;
  });
  out += `<text x="${gx + (cell * 3) / 2}" y="${gy + cell * 3 + 36}" text-anchor="middle" font-size="11" font-weight="700" fill="${INK}">IMPACT →</text>`;
  out += `<text x="14" y="${gy + (cell * 3) / 2}" text-anchor="middle" font-size="11" font-weight="700" fill="${INK}" transform="rotate(-90 14 ${gy + (cell * 3) / 2})">PROBABILITY →</text>`;
  const slots: Record<string, number> = {};
  o.risks.forEach((r, idx) => {
    const p = LEVEL(r.prob);
    const i = LEVEL(r.impact);
    if (p < 0 || i < 0) return;
    const k = `${p}-${i}`;
    const s = (slots[k] = (slots[k] ?? -1) + 1);
    const x = gx + i * cell + 22 + (s % 2) * 32;
    const y = gy + (2 - p) * cell + 24 + Math.floor(s / 2) * 30;
    out += `<circle cx="${x}" cy="${y}" r="13" fill="${INK}"/><text x="${x}" y="${y + 4.5}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${idx + 1}</text>`;
  });
  const lx = gx + cell * 3 + 28;
  o.risks.slice(0, 8).forEach((r, idx) => {
    const y = gy + 14 + idx * 26;
    out += `<circle cx="${lx}" cy="${y - 4}" r="9" fill="${INK}"/><text x="${lx}" y="${y - 0.5}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${idx + 1}</text>`;
    out += `<text x="${lx + 17}" y="${y}" font-size="11" fill="${INK}">${esc(trunc(r.label, 40))}</text>`;
  });
  return out + `</svg>`;
}

/* ---------------------------- palette ----------------------------- */

export const palette = (accent: string, accent2: string) => [accent, accent2, "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#14b8a6", "#64748b"];

import sharp from "sharp";
export async function fake(label: string, w: number, h: number, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${color}"/><rect x="14" y="14" width="${w - 28}" height="${h - 28}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="14 10"/><text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="${Math.round(w / 12)}" font-weight="700" fill="#fff">${label}</text></svg>`;
  const buf = await sharp(Buffer.from(svg)).jpeg().toBuffer();
  return [{ src: "data:image/jpeg;base64," + buf.toString("base64") }];
}

export function bestDayCurve() {
  const pts = Array.from({ length: 49 }, (_, i) => { const h = i / 2; const v = Math.max(0, Math.exp(-((h - 12.5) ** 2) / 18) * 6100 + (i % 5) * 18); return [60 + (i / 48) * 720, 270 - (v / 6400) * 230]; });
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 310" width="800" height="310" font-family="Arial"><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f59e0b" stop-opacity=".45"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></linearGradient></defs>${[0,1,2,3,4].map(i=>`<line x1="60" x2="780" y1="${270-i*57.5}" y2="${270-i*57.5}" stroke="#e2e8f0"/><text x="52" y="${274-i*57.5}" text-anchor="end" font-size="11" fill="#64748b">${i*1.5} MW</text>`).join("")}<path d="${d} L780,270 L60,270 Z" fill="url(#a)"/><path d="${d}" fill="none" stroke="#f59e0b" stroke-width="3"/>${[0,4,8,12,16,20,24].map(h=>`<text x="${60+h/24*720}" y="292" text-anchor="middle" font-size="11" fill="#64748b">${String(h).padStart(2,"0")}:00</text>`).join("")}</svg>`;
  return [{ src: "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64") }];
}

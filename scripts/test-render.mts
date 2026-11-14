import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { defaultTemplate, octoberData } from "../lib/seed";
import { renderReportHtml } from "../lib/render-html";
import { validateFormula } from "../lib/formula";
import { fake, bestDayCurve } from "./demo-photos.mts";

const out = process.argv[2];
const t = defaultTemplate();
const data = octoberData();
if (process.env.THEME === "sunset") {
  t.brand = { ...t.brand, theme: "sunset", accent: "#ea580c", accent2: "#f59e0b" };
  t.settings = { paper: "Letter", coverStyle: "waves", headerText: "Abu Minqar · Monthly report" };
}
// synthetic daily data ONLY for visual testing of charts
if (process.argv[3] === "demo")
  data.daily_gen = Array.from({ length: 31 }, (_, i) => {
    const pv = Math.round(15000 + 4200 * Math.sin(i / 4) + (i % 5) * 700);
    return { day: String(i + 1), pv, genset: Math.round(63000 - pv * 0.6 + (i % 3) * 1500), peak: Math.round(4300 + 700 * Math.sin(i / 3) + (i % 4) * 90) };
  });
if (process.argv[3] === "demo") {
  data.best_day_curve = bestDayCurve();
  data.a_ptw_images = [...(await fake("PTW 1/10", 800, 1100, "#64748b")), ...(await fake("PTW 2/10", 800, 1100, "#475569"))];
  const ins = data.inductions_table as any[];
  ins[0].doc_photo = await fake("INDUCTION DOCUMENT", 800, 1100, "#475569");
  ins[0].group_photo = await fake("PERSONS PHOTO", 1000, 700, "#0ea5e9");
  ins[0].persons[0].id_front = await fake("ID FRONT", 900, 570, "#2563eb");
  ins[0].persons[0].id_back = await fake("ID BACK", 900, 570, "#7c3aed");
  ins[3].doc_photo = await fake("INDUCTION DOCUMENT", 800, 1100, "#475569");
  ins[3].persons[1].id_front = await fake("ID FRONT", 900, 570, "#2563eb");
}
for (const s of t.sections) for (const b of s.blocks)
  for (const f of [b.type === "computed" ? b.formula : undefined, ...(b.chart?.items?.map((i) => i.value) ?? [])])
    if (f) { const e = validateFormula(f, t); if (e) console.log("FORMULA ERR", b.key, f, e); }
const html = renderReportHtml(t, data, { title: "Abu Minqar", period: "Oct 2026" });
writeFileSync(out + "/report.html", html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({ path: out + "/report.pdf", preferCSSPageSize: true, printBackground: true });
await browser.close();
console.log("ok");

import { writeFileSync } from "node:fs";
import { defaultTemplate, octoberData } from "../lib/seed";
import { renderReportDocx } from "../lib/render-docx";
import { fake, bestDayCurve } from "./demo-photos.mts";
const d = octoberData();
d.best_day_curve = bestDayCurve();
const ins = d.inductions_table as any[];
ins[0].doc_photo = await fake("INDUCTION DOCUMENT", 800, 1100, "#475569");
ins[0].group_photo = await fake("PERSONS PHOTO", 1000, 700, "#0ea5e9");
ins[0].persons[0].id_front = await fake("ID FRONT", 900, 570, "#2563eb");
ins[0].persons[0].id_back = await fake("ID BACK", 900, 570, "#7c3aed");
ins[3].persons[1].id_front = await fake("ID FRONT", 900, 570, "#2563eb");
const tpl = defaultTemplate();
if (process.env.THEME === "sunset") { tpl.brand = { ...tpl.brand, theme: "sunset", accent: "#ea580c", accent2: "#f59e0b" }; tpl.settings = { paper: "Letter", showPageNumbers: false }; }
const buf = await renderReportDocx(tpl, d, { title: "Abu Minqar", period: "Oct 2026" });
writeFileSync(process.argv[2] + "/report.docx", buf);
console.log("docx bytes", buf.length);

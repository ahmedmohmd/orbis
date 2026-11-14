import { slug, uid } from "./types";
import { INDUCTION_FIELDS } from "./records";
import type { Block, Column, ColumnType, ReportData, Section, TemplateSchema } from "./types";

/**
 * Starter template + sample data, converted 1-to-1 from the October 2026
 * Abu Minqar report. Everything here is editable from the UI afterwards.
 */

let hn = 0;
const blk = (type: Block["type"], key: string, label: string, o: Partial<Block> = {}): Block => ({ id: uid(), key, label, type, ...o });
const H = (label: string) => blk("heading", `h_${slug(label)}_${++hn}`, label);
const col = (key: string, label: string, type: ColumnType = "text", width = 1, options?: string[]): Column => ({ key, label, type, width, ...(options ? { options } : {}) });
const sec = (title: string, blocks: Block[], o: Partial<Section> = {}): Section => ({ id: uid(), title, blocks, pageBreak: true, ...o });

const card = (key: string, label: string, unit?: string, o: Partial<Block> = {}) => blk("number", key, label, { unit, display: "card", width: "quarter", ...o });
const ring = (key: string, label: string, o: Partial<Block> = {}) => blk("percent", key, label, { display: "ring", width: "quarter", ...o });
const kv = (key: string, label: string, o: Partial<Block> = {}) => blk("text", key, label, { display: "inline", width: "half", ...o });

const YES_NO = ["Yes", "No"];
const LEVELS = ["Low", "Medium", "High"];

export function defaultTemplate(): TemplateSchema {
  hn = 0;
  const sections: Section[] = [
    /* ---------------------------------------------------------------- */
    sec(
      "Summary & System Overview",
      [
        blk("image", "best_day_curve", "Best-day production curve", {
          maxImages: 1,
          width: "full",
          help: "Upload the curve of the highest-production day as SVG or PNG",
          caption: "Highest production day · {{o_peak_day_date}} · {{o_peak_day}}",
        }),
        blk("textarea", "system_description", "Station description", { display: "callout" }),
        H("Project Information"),
        kv("p_developer", "Project developer"),
        kv("p_location", "Project location"),
        blk("number", "p_contracted", "Contracted capacity", { unit: "MW", display: "inline", width: "half" }),
        blk("number", "p_generation", "Generation capacity", { unit: "kW", display: "inline", width: "half" }),
        kv("p_spv", "Licensed company / SPV name"),
        kv("p_class", "Units' classification"),
        blk("number", "p_customers", "No. of customers", { display: "inline", width: "half" }),
        blk("number", "p_meters", "No. of meters", { display: "inline", width: "half" }),
        kv("p_cod", "COD"),
        blk("number", "p_manpower", "Manpower", { display: "inline", width: "half" }),
        H("System Overview"),
        card("o_peak_day", "Highest daily production", "kWh"),
        blk("text", "o_peak_day_date", "Highest day recorded on", { display: "card", width: "quarter" }),
        card("total_energy", "Total monthly production", "kWh"),
        card("pv_energy", "PV energy exported", "kWh"),
        card("diesel_litres", "Diesel consumption", "L"),
        ring("pv_share", "Average PV share"),
        card("o_sfc", "Average genset SFC", "kWh/L", { decimals: 2 }),
        card("o_safety_major", "Major safety incidents"),
        card("o_bess_down", "Battery controller downtime", "min"),
        blk("chart", "c_energy_mix", "Energy mix", {
          width: "full",
          chart: {
            kind: "donut",
            title: "Energy mix – PV vs diesel gensets",
            source: "fields",
            unit: "kWh",
            items: [
              { label: "Solar PV", value: "{pv_energy}", color: "#f59e0b" },
              { label: "Diesel gensets", value: "{total_energy}-{pv_energy}", color: "#475569" },
            ],
          },
        }),
        H("Project Needs"),
        blk("table", "project_needs", "Project needs", {
          columns: [col("task", "Task / Event", "text", 1.4), col("date", "Date", "text", 0.8), col("category", "Category", "text", 1), col("taken", "Action taken", "text", 1.4), col("required", "Action required", "text", 1.4)],
        }),
      ],
    ),
    /* ---------------------------------------------------------------- */
    sec(
      "Operation",
      [
        H("Activities"),
        blk("table", "activities", "Operational activities", {
          columns: [col("activity", "Activity", "text", 1.2), col("description", "Description", "text", 3), col("frequency", "Frequency", "text", 1.2), col("status", "Status", "status", 0.8, ["Done", "Ongoing", "-"])],
        }),
        H("Generators Refueling"),
        card("fuel_count", "Fueling operations", undefined, { width: "third" }),
        card("fuel_litres", "Fuel delivered", "L", { width: "third" }),
        card("fuel_incidents", "Fueling incidents", undefined, { width: "third" }),
      ],
    ),
    /* ---------------------------------------------------------------- */
    sec("Maintenance", [
      H("Summary"),
      card("pm_planned", "PM planned", undefined, { width: "quarter" }),
      card("pm_done", "PM completed", undefined, { width: "quarter" }),
      card("cm_planned", "CM planned", undefined, { width: "quarter" }),
      card("cm_done", "CM completed", undefined, { width: "quarter" }),
      blk("computed", "pm_compliance", "PM compliance", { formula: "{pm_done}/{pm_planned}*100", display: "ring", unit: "%", width: "half", decimals: 0 }),
      blk("computed", "cm_compliance", "CM compliance", { formula: "{cm_done}/{cm_planned}*100", display: "ring", unit: "%", width: "half", decimals: 0 }),
      H("Preventive Maintenance"),
      blk("table", "pm_table", "Preventive maintenance", {
        columns: [col("asset", "Asset", "text", 0.8), col("date", "Planned date", "text", 1), col("activity", "Activity", "text", 3), col("done", "Done", "status", 0.7, YES_NO), col("notes", "Notes", "text", 0.8)],
      }),
      H("Corrective Maintenance"),
      blk("table", "cm_table", "Corrective maintenance", {
        columns: [col("asset", "Asset", "text", 0.8), col("fault", "Fault", "text", 2), col("action", "Action taken", "text", 2), col("date", "Date", "text", 1), col("status", "Status", "status", 1, ["In Service", "Pending", "Open"]), col("notes", "Notes", "text", 0.8)],
      }),
      blk("textarea", "maintenance_comments", "Comments"),
    ]),
    /* ---------------------------------------------------------------- */
    sec("Safety & Compliance", [
      H("HSES Summary"),
      card("hses_incidents", "Incidents", undefined, { width: "quarter" }),
      card("hses_violations", "Violations", undefined, { width: "quarter" }),
      blk("computed", "ptw_issued", "PTW issued", { formula: "count({ptw_log})", display: "card", width: "quarter" }),
      card("hses_observations", "Observations", undefined, { width: "quarter" }),
      blk("computed", "inductions", "Inductions", { formula: "count({inductions_table})", display: "card", width: "quarter" }),
      blk("chart", "c_safety", "Safety activity", {
        chart: {
          kind: "hbar",
          title: "Safety activity this month",
          source: "fields",
          items: [
            { label: "Permits to work issued", value: "{ptw_issued}", color: "#2563eb" },
            { label: "Inductions delivered", value: "{inductions}", color: "#06b6d4" },
            { label: "Site visit entries", value: "count({visitors})", color: "#10b981" },
            { label: "Incidents", value: "{hses_incidents}", color: "#f43f5e" },
          ],
        },
      }),
      H("Attendance / Visitor Log"),
      blk("table", "visitors", "Visitor log", { columns: [col("date", "Date", "text", 0.9), col("names", "Names", "text", 2.4), col("reason", "Reason", "text", 2)] }),
      H("Inductions"),
      blk("records", "inductions_table", "Induction register – photos in {{annex:annex_inductions}}", { itemLabel: "induction", view: "table", fields: structuredClone(INDUCTION_FIELDS) }),
      H("Incident Report"),
      blk("table", "incident_report", "Incidents", { columns: [col("description", "Description", "text", 3), col("date", "Date", "text", 1), col("action", "Action taken", "text", 2)] }),
      H("Permit-To-Work (PTW) Log"),
      blk("table", "ptw_log", "PTW log – scans in {{annex:annex_ptw}}", {
        compact: true,
        columns: [col("sr", "Sr#", "text", 0.5), col("open_by", "Opened by", "text", 1.1), col("date_open", "Date open", "text", 1), col("closed_by", "Closed by", "text", 1.1), col("date_closed", "Date closed", "text", 1), col("type", "Type", "select", 0.9, ["Electrical", "General", "Hot work", "Height"]), col("desc", "Short description", "text", 2.2)],
      }),
      H("Observations – Action List"),
      blk("table", "observations", "Observations", { columns: [col("obs", "Observation in brief", "text", 2), col("capa", "CAPA", "text", 1.5), col("location", "Location", "text", 1), col("status", "Status", "status", 0.8, ["Open", "Closed"]), col("date", "Action date", "text", 1), col("remarks", "Remarks", "text", 1.2)] }),
      H("Training & Awareness"),
      blk("table", "training", "Training", { columns: [col("type", "Type", "text", 1), col("topic", "Topic", "text", 2.5), col("date", "Date", "text", 1), col("status", "Status", "status", 1, ["Done", "Planned"])] }),
    ]),
    /* ---------------------------------------------------------------- */
    sec("Faults & Reliability Analysis", [
      H("Fault Summary"),
      card("faults_internal", "Internal faults", undefined, { width: "quarter" }),
      card("faults_internal_min", "Internal duration", "min", { width: "quarter" }),
      card("faults_external", "External faults", undefined, { width: "quarter" }),
      card("faults_external_min", "External duration", "min", { width: "quarter" }),
      H("Fault Log"),
      blk("table", "fault_log", "Fault log", {
        columns: [col("ref", "Date", "text", 0.7), col("desc", "Outage description", "text", 3), col("start", "Outage date & time", "text", 1.2), col("end", "Repair date & time", "text", 1.2), col("duration", "Duration (min)", "number", 0.8), col("cause", "Cause", "text", 2.4), col("comment", "Comment", "text", 0.8)],
      }),
      blk("chart", "c_faults", "Outage duration", { chart: { kind: "bar", title: "Outage duration per event (min)", source: "table", table: "fault_log", x: "ref", series: [{ key: "duration", label: "Duration (min)", color: "#f43f5e" }], unit: "min", height: 240 } }),
      H("Fault Analysis"),
      blk("textarea", "fault_analysis", "Analysis"),
      H("Conclusion"),
      blk("textarea", "fault_conclusion", "Conclusion"),
    ]),
    /* ---------------------------------------------------------------- */
    sec("Energy Performance", [
      H("Energy Summary"),
      card("e_total", "Total energy generated", "kWh", { width: "third", formula: undefined }),
      card("e_pv", "Total PV generated", "kWh", { width: "third" }),
      ring("e_pv_share", "PV share", { width: "third" }),
      card("mv_sold", "Total MV energy sold (customer meters)", "kWh", { width: "third", decimals: 2 }),
      card("lv_sold", "Total LV energy sold (DEIF controller)", "kWh", { width: "third" }),
      blk("computed", "loss_kwh", "Calculated energy loss", { formula: "{lv_sold}-{mv_sold}", unit: "kWh", display: "card", width: "third", decimals: 2 }),
      blk("computed", "loss_pct", "Reported loss percentage", { formula: "{loss_kwh}/{lv_sold}*100", unit: "%", display: "card", width: "third", decimals: 2 }),
      blk("chart", "c_energy_flow", "Generated vs sold", {
        chart: {
          kind: "hbar",
          title: "Energy flow (kWh)",
          source: "fields",
          unit: "kWh",
          items: [
            { label: "Generated (LV, DEIF)", value: "{lv_sold}", color: "#2563eb" },
            { label: "Sold (MV, customer meters)", value: "{mv_sold}", color: "#10b981" },
            { label: "PV generated", value: "{e_pv}", color: "#f59e0b" },
          ],
        },
      }),
      H("Daily Generation"),
      blk("table", "daily_gen", "Daily generation (paste from Excel)", { compact: true, columns: [col("day", "Day", "text", 0.8), col("pv", "PV (kWh)", "number", 1), col("genset", "Gensets (kWh)", "number", 1), col("peak", "Peak load (kW)", "number", 1)] }),
      blk("chart", "c_daily_gen", "Daily generation", {
        chart: { kind: "stackedbar", title: "Daily generation by source (kWh)", source: "table", table: "daily_gen", x: "day", series: [{ key: "pv", label: "Solar PV", color: "#f59e0b" }, { key: "genset", label: "Diesel gensets", color: "#475569" }], unit: "kWh" },
      }),
      blk("chart", "c_daily_peak", "Peak load trend", {
        chart: { kind: "area", title: "Peak load per day (kW)", source: "table", table: "daily_gen", x: "day", series: [{ key: "peak", label: "Peak load", color: "#2563eb" }], unit: "kW" },
      }),
      H("Losses Analysis"),
      blk("textarea", "loss_analysis", "Losses analysis"),
      blk("list", "loss_causes", "Main attributed causes"),
      H("Energy Dispatch & Load Monitor"),
      blk("textarea", "load_management", "Load management"),
      card("peak_load", "Monthly peak load (DEIF, generation side)", "MW", { width: "half", decimals: 1 }),
      H("Key Achievement"),
      blk("textarea", "key_achievement", "Key achievements"),
    ]),
    /* ---------------------------------------------------------------- */
    sec("Risk & Recommendations", [
      blk("table", "risks", "Risk register", {
        columns: [col("category", "Risk category", "text", 1.3), col("description", "Risk description", "text", 2.6), col("probability", "Probability", "status", 0.9, LEVELS), col("impact", "Impact", "status", 0.8, LEVELS), col("mitigation", "Mitigation", "text", 2.6)],
      }),
      blk("chart", "c_risk", "Risk matrix", { chart: { kind: "riskmatrix", title: "Risk matrix", source: "table", table: "risks", x: "category", probKey: "probability", impactKey: "impact" } }),
    ]),
    /* ---------------------------------------------------------------- */
    sec("Key Performance Indicators", [
      H("Safety, Health & Environment (HSE)"),
      card("k_ltifr", "LTIFR", undefined, { width: "quarter" }),
      ring("k_env", "Environmental compliance"),
      card("k_trir", "TRIR", undefined, { width: "quarter" }),
      card("k_ptw_viol", "PTW violations", undefined, { width: "quarter" }),
      card("k_obs", "Safety observation reports", "%", { width: "quarter" }),
      H("Assets"),
      ring("k_assets_index", "Assets index"),
      ring("k_assets_life", "Extended assets life cycle"),
      ring("k_warehouse", "Warehouse, spare parts & tools"),
      ring("k_availability", "Asset availability"),
      card("k_mc_rav", "MC / RAV", "%", { width: "quarter" }),
      H("Technical"),
      ring("k_pr", "Performance ratio (PV)", { decimals: 2 }),
      ring("k_uptime", "Grid uptime", { decimals: 2 }),
      card("k_yield", "Energy yield", "kWh/kWp", { decimals: 2 }),
      card("k_losses", "Losses", "%", { decimals: 2 }),
      H("Customer Satisfaction"),
      card("k_cemi", "CEMI", "/ 5"),
      card("k_complaints", "Complaints & claims"),
      card("k_pq", "Power quality complaints"),
      card("k_meter", "Meter connection & maintenance"),
      card("k_charges", "Charges & payment"),
      H("Operation"),
      ring("k_pm_rate", "PM completion rate"),
      ring("k_cm_ratio", "Corrective maintenance ratio"),
      ring("k_spares", "Spare parts availability"),
      ring("k_wo", "Work order compliance", { decimals: 1 }),
      H("Reliability Indices"),
      card("k_saifi", "SAIFI", "min interruption / client", { width: "third", decimals: 2 }),
      card("k_saidi", "SAIDI", "min / client", { width: "third", decimals: 2 }),
      card("k_caidi", "CAIDI", "min / interruption", { width: "third", decimals: 2 }),
      card("k_mttr", "MTTR", "min to fix", { width: "half", decimals: 2 }),
      card("k_mtbf", "MTBF", "hours between interruptions", { width: "half", decimals: 2 }),
      blk("chart", "c_kpi", "Headline KPIs", {
        chart: {
          kind: "hbar",
          title: "Headline KPIs (%)",
          source: "fields",
          max: 100,
          unit: "%",
          items: [
            { label: "Grid uptime", value: "{k_uptime}", color: "#10b981" },
            { label: "Asset availability", value: "{k_availability}", color: "#2563eb" },
            { label: "PM completion rate", value: "{k_pm_rate}", color: "#06b6d4" },
            { label: "Work order compliance", value: "{k_wo}", color: "#8b5cf6" },
            { label: "Performance ratio (PV)", value: "{k_pr}", color: "#f59e0b" },
          ],
        },
      }),
    ]),
  ];

  /* annexes live inside the section they belong to; their numbers are automatic */
  const annex = (key: string, label: string, description: string, children: Block[]): Block => blk("annex", key, label, { description, children, placement: "end" });
  sections[0].blocks.push(annex("annex_assets", "Asset list", "Every installed asset of the station by category.", [
    blk("table", "a_rmu", "RMU – Ring Main Units", { compact: true, columns: [col("unit", "Unit", "text", 0.7), col("desc", "Asset description", "text", 2), col("mfr", "Manufacturer", "text", 1), col("code", "Asset code", "text", 2)] }),
    blk("table", "a_tr", "Transformers", { compact: true, columns: [col("name", "Asset", "text", 0.7), col("code", "Asset code", "text", 2), col("desc", "Description", "text", 1.3), col("qty", "Qty", "number", 0.5), col("kva", "Capacity (kVA)", "number", 0.9), col("mfr", "Manufacturer", "text", 1)] }),
    blk("table", "a_gen", "Diesel generators", { compact: true, columns: [col("name", "Asset", "text", 0.7), col("code", "Asset code", "text", 2), col("desc", "Description", "text", 1.2), col("kw", "Capacity (100% kW)", "text", 1), col("mfr", "Manufacturer", "text", 1.3)] }),
    blk("table", "a_inv", "Inverters", { compact: true, columns: [col("name", "Asset", "text", 0.7), col("code", "Asset code", "text", 2), col("desc", "Description", "text", 1.3), col("qty", "Qty", "number", 0.5), col("cap", "Capacity", "text", 0.8), col("mfr", "Manufacturer", "text", 0.9)] }),
    blk("table", "a_bess", "BESS asset register", { compact: true, columns: [col("name", "Asset", "text", 0.7), col("code", "Asset code", "text", 2), col("desc", "Description", "text", 2), col("qty", "Qty", "number", 0.5), col("cap", "Capacity", "text", 0.8), col("mfr", "Manufacturer", "text", 0.9)] }),
    blk("table", "a_pv", "PV panels", { compact: true, columns: [col("name", "Asset", "text", 0.8), col("code", "Asset code", "text", 2), col("desc", "Description", "text", 1.2), col("qty", "Qty", "text", 1), col("cap", "Capacity", "text", 1), col("mfr", "Manufacturer", "text", 0.8)] }),
    blk("table", "a_fuel", "Diesel receiving system", { compact: true, columns: [col("eq", "Equipment", "text", 1), col("status", "Status", "status", 1, ["In Service", "Partially In Service", "Out of Service"]), col("remarks", "Remarks", "text", 4)] }),
  ]));
  sections[1].blocks.push(annex("annex_checklist", "Daily operation checklist", "The checklist the operators follow every shift.", [
    blk("table", "a_checklist", "Daily operation checklist", { compact: true, columns: [col("no", "No.", "text", 0.3), col("activity", "Activity", "text", 6)] }),
  ]));
  sections[1].blocks.push(annex("annex_pv_cleaning", "PV cleaning execution & rotation plan", "Weekly plan versus what was actually executed.", [
    blk("table", "a_cleaning", "PV cleaning plan", { compact: true, columns: [col("week", "Week", "text", 0.9), col("config", "System configuration", "text", 1.5), col("plan", "Cleaning plan", "text", 1.6), col("actual", "Actual execution", "text", 1.8), col("status", "Status", "status", 1, ["Done"])] }),
    blk("textarea", "a_cleaning_note", "Cleaning note"),
  ]));
  sections[2].blocks.push(annex("annex_genset", "Daily genset checklist", "Scans of the signed daily generator checklists.", [
    blk("image", "a_genset_checklist", "Daily genset checklist"),
  ]));
  sections[3].blocks.push(annex("annex_ptw", "Permits to work", "Scans of every permit issued this month.", [
    blk("image", "a_ptw_images", "PTW scans"),
  ]));
  sections[3].blocks.push(annex("annex_inductions", "Inductions", "Induction documents, group photos and national IDs of workers outside Karm.", [
    blk("records", "a_induction_photos", "Induction records – documents, persons & national IDs", { linkTo: "inductions_table", itemLabel: "induction", view: "cards" }),
  ]));
  sections[7].blocks.push(annex("annex_docs", "Important documents", "Other supporting documents.", [
    blk("image", "a_documents", "Important documents"),
  ]));

  // the "Energy Summary" cards reuse the overview numbers – make them formulas so they never drift
  const eb = (k: string) => sections.flatMap((s) => s.blocks).find((b) => b.key === k)!;
  Object.assign(eb("e_total"), { type: "computed", formula: "{total_energy}", display: "card" });
  Object.assign(eb("e_pv"), { type: "computed", formula: "{pv_energy}", display: "card" });
  Object.assign(eb("e_pv_share"), { type: "computed", formula: "{pv_share}", display: "ring", unit: "%" });

  return {
    version: 1,
    reportTitle: "Monthly Report",
    brand: {
      companyName: "Mars",
      logoText: "AM",
      accent: "#2563eb",
      accent2: "#06b6d4",
      footer: "AM-01 · Abu Minqar Station · Confidential",
    },
    highlights: [
      { id: uid(), label: "Total energy generated", value: "{total_energy}", unit: "kWh", look: "number", sub: "All sources, LV side" },
      { id: uid(), label: "PV share", value: "{pv_share}", look: "ring", decimals: 0, sub: "Of total generation" },
      { id: uid(), label: "Diesel consumed", value: "{diesel_litres}", unit: "L", look: "number" },
      { id: uid(), label: "Grid uptime", value: "{k_uptime}", look: "ring", decimals: 2 },
      { id: uid(), label: "Monthly peak load", value: "{peak_load}", unit: "MW", look: "number", decimals: 1, sub: "DEIF, generation side" },
      { id: uid(), label: "Safety incidents", value: "{hses_incidents}", look: "number", sub: "Recorded this month" },
    ],
    cover: [
      blk("text", "project", "Project", { width: "third" }),
      blk("text", "location", "Location", { width: "third" }),
      blk("text", "client", "Client / Developer", { width: "third" }),
      blk("text", "period", "Reporting period", { width: "third" }),
      blk("text", "voltage", "Voltage level", { width: "third" }),
      blk("text", "customers", "Total customers", { width: "third" }),
    ],
    sections,
  };
}

/* ------------------------------------------------------------------ */

const r = (...c: (string | number)[]) => c;
/** an induction entry: persons with an ID number are workers outside Karm (their ID photos can be attached) */
const ind = (date: string, by: string, persons: string[][]) => ({
  date,
  by,
  doc_photo: [],
  group_photo: [],
  persons: persons.map(([name, id]) => ({ name, karm: id ? "Out of Karm" : "In Karm", id_number: id ?? "", id_front: [], id_back: [] })),
});
const rows = (keys: string[], list: (string | number)[][]) => list.map((c) => Object.fromEntries(keys.map((k, i) => [k, c[i] ?? ""])));

export function octoberData(): ReportData {
  const trCodes = (n: number) => `OFF-Grid-ONM-AM-01-TR ${String(n).padStart(2, "0")}`;
  const kva = [1000, 1000, 2000, 2000, 2000, 2000, 1000, 1000, 1000, 1000];
  const mfr = ["ABB", "ABB", "ELsewedy", "ELsewedy", "ELsewedy", "ELsewedy", "ABB", "ABB", "ABB", "ABB"];
  const gens: [number, string, string][] = [
    [1, "640 kW", "Mitsubishi-Rented"], [2, "720 kW", "Mitsubishi-Rented"], [3, "400 kW", "MTU"], [4, "400 kW", "MTU"], [5, "480 kW", "MTU"], [6, "480 kW", "MTU"],
    [7, "400 kW", "MTU"], [8, "400 kW", "MTU"], [9, "400 kW", "MTU"], [10, "720 kW", "Mitsubishi-Rented"], [11, "1200 kW", "Mitsubishi-Rented"],
  ];
  const checklist = [
    "Continuously monitor station operation and electrical loads, responding promptly to any operational changes.",
    "Track generator running hours, refuel as needed, and rotate generator operation every 12 hours.",
    "Monitor inverter performance and ensure no faults or obstacles hinder operation.",
    "Conduct routine inspections of PV modules, ensuring cleanliness and integrity, and supervise cleaning teams.",
    "Monitor warehouse condition, maintain organization and cleanliness, and hand over inventory accurately to the next operator.",
    "Supervise customer load connections/disconnections and prepare for any load changes.",
    "Record equipment faults accurately in designated logs.",
    "Document all station outages (blackouts) precisely, including root causes.",
    "Perform daily equipment rounds and record readings systematically.",
    "Record staff attendance and activities completed during the shift.",
    "Monitor camp and waste areas, assisting in maintaining cleanliness and order.",
    "Issue work permits in the absence of the engineer and organize office documentation.",
    "Conduct routine generator inspections and repair minor faults when possible.",
    "Verify PPE compliance for all staff before starting shift.",
    "Ensure fire extinguishers and first-aid kits are accessible and functional.",
    "Log daily generation output and compare against expected values.",
  ];

  return {
    /* cover */
    project: "AM-01",
    location: "Abu Minqar – El Farafra, New Valley Governorate, Egypt",
    client: "Daltex, Nawa1, Enmaa, Helal, Nawa2",
    period: "Oct 2026",
    voltage: "22kV / 400V",
    customers: "5",

    /* summary */
    system_description:
      "Abu Minqar Station is a hybrid power generation station that supplies electrical power to five clients: DALTEX, HELAL, NAWA 1, NAWA 2, and ENMAA. The station includes a 4.3 MWp Solar PV system consisting of 6,240 solar panels connected to 26 inverters, each rated at 125 kVA, providing a total inverter capacity of 3,250 kVA. The station is also equipped with a 4-MWh Battery Energy Storage System (BESS) connected through a 1,375 kVA Power Conversion System (PCS) inverter. In addition, the station has 7 main diesel generators, consisting of 2 × 600 kVA and 5 × 500 kVA generators, supported by 4 rented diesel generators comprising 2 × 900 kVA and 2 × 1,500 kVA units. The combination of Solar PV, BESS, and diesel generators provides the station with a flexible and reliable hybrid power generation system to meet the electrical demand of the connected clients.",
    p_developer: "Mars",
    p_location: "ELFARFRA",
    p_contracted: 7.5,
    p_generation: 6100,
    p_spv: "Mars",
    p_class: "Commercial",
    p_customers: 5,
    p_meters: 7,
    p_cod: "June-2023",
    p_manpower: 14,
    o_peak_day: 83848,
    o_peak_day_date: "4 Oct",
    total_energy: 1959350,
    pv_energy: 594996,
    diesel_litres: 402119,
    pv_share: 28,
    o_sfc: 3.38,
    o_safety_major: 0,
    o_bess_down: 0,
    project_needs: [],

    /* operation */
    activities: rows(["activity", "description", "frequency", "status"], [
      r("Daily checklist", "Verification of daily checklist “{{annex:annex_checklist}}”", "Daily", "Done"),
      r("Cleaning cycle", "Daily cleaning of solar PV modules to maintain efficiency ({{annex:annex_pv_cleaning}})", "Daily", "Done"),
      r("Daily reading", "Monitoring all station systems (gensets, PV, BESS, MV network)", "Daily", "Done"),
      r("Troubleshooting", "Recording production, diesel, PV, SFC", "Daily", "Done"),
      r("Meters quotation", "Reading and recording meter values for billing and performance tracking", "Daily", "-"),
      r("Meters replacement", "Replacing faulty or end-of-life energy meters with calibrated units", "As needed / Scheduled", "-"),
      r("Meters inspection", "Visual and functional inspection of meter condition, seals, and display accuracy", "Monthly", "-"),
      r("Meters installation", "Installing new meters on feeders, gensets, or MV circuits per project scope", "As needed", "-"),
      r("Meters calibrations", "Verifying and calibrating meter accuracy against reference standards", "Annually / As needed", "-"),
      r("Maneuver and switching", "Executing planned switching operations on MV/LV network per approved switching schedule", "As needed / Scheduled", "Ongoing"),
    ]),
    fuel_count: 345,
    fuel_litres: 402119,
    fuel_incidents: 0,

    /* maintenance */
    pm_planned: 5,
    pm_done: 5,
    cm_planned: 3,
    cm_done: 3,
    pm_table: rows(["asset", "date", "activity", "done", "notes"], [
      r("Gen 7", "13/10/2026", "Changed the engine oil, replaced the oil and fuel filters, and cleaned the air filters.", "Yes", "N/A"),
      r("Gen 6", "14/10/2026", "Changed the engine oil, replaced the oil and fuel filters, and cleaned the air filters.", "Yes", "N/A"),
      r("Gen 9", "14/10/2026", "Changed the engine oil, replaced the oil and fuel filters, and cleaned the air filters.", "Yes", "N/A"),
    ]),
    cm_table: rows(["asset", "fault", "action", "date", "status", "notes"], [
      r("Gen 3", "Exhaust pipe failure due to excessive heat.", "Exhaust pipe replaced with another one.", "18/10/2026", "In Service", ""),
    ]),
    maintenance_comments: "N/A",

    /* safety */
    hses_incidents: 0,
    hses_violations: 0,
    hses_observations: 0,
    visitors: rows(["date", "names", "reason"], [
      r("1/10/2026", "Zaglol Saad", "Move solar panels."),
      r("3/10/2026", "Mohamed Rady", "New cleaner of the site"),
      r("4/10/2026", "Sayed Osama", "Pest control visit."),
      r("19/10/2026", "Yasin Hassan\nMalak Haitham\nAbderahman Mohamed", ""),
      r("21/10/2026", "Abby Adel\nMohamed Elmaraghy\nMalak Asem\nMahmoud Emad\nIsmael Nashed\nAhmed Hamdy\nAbdelruhman Sayed", ""),
      r("22/10/2026", "Mohamed Abdelwahab\nAhmed Tareq\nAhmed Mahfouz", "Clean and move the waste area contents."),
    ]),
    inductions_table: [
      ind("2026-10-01", "Farid Shawqy", [["Zaglol Saad", "27203272201111"]]),
      ind("2026-10-03", "Farid Shawqy", [["Mohamed Rady"]]),
      ind("2026-10-04", "Farid Shawqy", [["Sayed Osama", "29611061401758"]]),
      ind("2026-10-19", "Shaher Elazhary", [["Yasin Hassan", "30306240102958"], ["Malak Haitham", "30002210100803"], ["Abderahman Mohamed", "30011200103935"]]),
      ind("2026-10-21", "Ahmed Mohamed", ["Abby Adel", "Mohamed Elmaraghy", "Malak Asem", "Mahmoud Emad", "Ismael Nashed", "Ahmed Hamdy", "Abdelruhman Sayed"].map((n) => [n])),
      ind("2026-10-22", "Shaher Elazhary", [["Mohamed Abdelwahab", "29001222100955"], ["Ahmed Tareq", "29802012112414"], ["Ahmed Mahfouz", "27206122100498"]]),
    ],
    incident_report: [],
    ptw_log: rows(["sr", "open_by", "date_open", "closed_by", "date_closed", "type", "desc"], [
      r("1/9", "Farid Shawqy", "12/10/2026", "Farid Shawqy", "12/10/2026", "Electrical", "Inverter replacement."),
      r("2/9", "Farid Shawqy", "13/10/2026", "Farid Shawqy", "14/10/2026", "General", "Preventive maintenance for Gen 6, 7, 9."),
      r("3/9", "Mustafa Mohamed", "13/10/2026", "Mustafa Mohamed", "13/10/2026", "General", "Preventive maintenance for rented Gen 1."),
      r("4/9", "Ahmed Mohamed", "18/10/2026", "Shaher", "18/10/2026", "General", "Change exhaust pipe for Gen 3."),
    ]),
    observations: [],
    training: [],

    /* faults */
    faults_internal: 3,
    faults_internal_min: 40,
    faults_external: 0,
    faults_external_min: 0,
    fault_log: rows(["ref", "desc", "start", "end", "duration", "cause", "comment"], [
      r("9 Oct", "Ramping in kVAR on the station.", "9/10/2026 4:10 AM", "9/10/2026 4:45 AM", 35, "Ramping in kVAR on the station.", ""),
      r("20 Oct", "Clouds, which caused a rapid decrease in solar power generation.", "20/10/2026 3:10 PM", "20/10/2026 4:14 PM", 45, "Rapid decrease in solar power generation.", ""),
      r("29 Oct", "Station shutdown after PV dropped, causing the battery to exceed its 1 MVA capacity. A rapid kVAR ramp is suspected to have contributed to the shutdown.", "29/10/2026 12:46:40 PM", "29/10/2026 12:48:00 PM", 1.33, "Station shutdown after PV dropped, causing the battery to exceed its 1 MVA capacity. A rapid kVAR ramp is suspected to have contributed to the shutdown.", ""),
    ]),
    fault_analysis: "The main blackout causes this month shifted to rapid PV generation drops due to cloud cover and suspected issues related to rapid kVAR ramping.",
    fault_conclusion: "N/A",

    /* energy */
    mv_sold: 1943083.7,
    lv_sold: 1959350,
    daily_gen: [],
    loss_analysis: "The recorded energy loss (16,266.30 kWh ≈ 0.83 %) is within acceptable limits and is mainly attributed to:",
    loss_causes: ["Transformation losses between LV (generation side) and MV (export side).", "Transmission losses through the overhead line network.", "Difference in measurement points."],
    load_management: "Coordinated with customers to shift their load schedules and reduce demand during critical periods, helping prevent station outages and blackouts.",
    peak_load: 5.2,
    key_achievement: "N/A",

    /* risks */
    risks: rows(["category", "description", "probability", "impact", "mitigation"], [
      r("Fuel handling / Environmental", "Absence of a diesel return line system for gensets creates a risk of diesel leakage and environmental contamination in case of human error during refueling.", "Medium", "High", "Design and implement a diesel return line system from gensets to underground tanks to ensure safe refuel and prevent environmental incidents during refueling operations."),
      r("Diesel fuel / Low temperature", "Low winter temperatures increase diesel viscosity, causing frequent fuel filter clogging and replacement.", "High", "High", "Install diesel heaters to maintain proper fuel temperature, reduce filter clogging, and minimize maintenance costs."),
      r("Generator / Heat & working conditions", "High temperatures affect equipment and expose workers to heat stress. Poor night lighting increases work risks.", "Medium", "Medium", "Install a canopy with lighting to protect equipment and workers from heat and provide adequate lighting for night work."),
    ]),

    /* KPIs */
    k_ltifr: 0, k_env: 100, k_trir: 0, k_ptw_viol: 0, k_obs: 0,
    k_assets_index: 100, k_assets_life: 100, k_warehouse: 85, k_availability: 95, k_mc_rav: 1,
    k_pr: 82.46, k_uptime: 99.99, k_yield: 173.68, k_losses: 2.62,
    k_cemi: 5, k_complaints: 0, k_pq: 0, k_meter: 0, k_charges: 0,
    k_pm_rate: 100, k_cm_ratio: 100, k_spares: 100, k_wo: 89.5,
    k_saifi: 6, k_saidi: 0.6, k_caidi: 0.1, k_mttr: 13.44, k_mtbf: 239.78,

    /* annex */
    a_rmu: rows(["unit", "desc", "mfr", "code"], [
      r("RMU-1", "Ring Main Unit (MV Switchgear)", "ABB", "OFF-Grid-ONM-AM-01-RMU 01"),
      r("RMU-2", "Ring Main Unit (MV Switchgear)", "TEPCO", "OFF-Grid-ONM-AM-01-RMU 02"),
      r("RMU-3", "Ring Main Unit (MV Switchgear)", "TEPCO", "OFF-Grid-ONM-AM-01-RMU 03"),
    ]),
    a_tr: kva.map((k, i) => ({ name: `TR ${String(i + 1).padStart(2, "0")}`, code: trCodes(i + 1), desc: "Power Transformer", qty: 1, kva: k, mfr: mfr[i] })),
    a_gen: gens.map(([n, kw, m]) => ({ name: `GEN ${String(n).padStart(2, "0")}`, code: `OFF-Grid-ONM-AM-01-GEN ${String(n).padStart(2, "0")}`, desc: "Diesel Generator", kw, mfr: m })),
    a_inv: rows(["name", "code", "desc", "qty", "cap", "mfr"], [r("INV 01", "OFF-Grid-ONM-AM-01-INV 01", "Solar Inverter 125 kVA", 26, "125 kVA", "Sungrow")]),
    a_bess: rows(["name", "code", "desc", "qty", "cap", "mfr"], [
      r("BMS 01", "OFF-Grid-ONM-AM-01-BESS 01", "Battery Energy Storage System (Containerized)", 1, "1000 kW", "Sungrow"),
      r("PCS 01", "OFF-Grid-ONM-AM-01-PCS 01", "Inverter (control system)", 1, "1385 kW", "Sungrow"),
    ]),
    a_pv: rows(["name", "code", "desc", "qty", "cap", "mfr"], [r("PV Panels", "OFF-Grid-ONM-AM-01-PV 01", "Solar PV Modules", "6403 modules", "545 W / module", "Jinko")]),
    a_fuel: rows(["eq", "status", "remarks"], [r("Fuel storage tanks", "Partially In Service", "8 tanks (~380 m³ total). Tank No. 4 is out of service due to leakage since commissioning and isolated as per safety instructions.")]),
    a_checklist: checklist.map((a, i) => ({ no: i + 1, activity: a })),
    a_cleaning: rows(["week", "config", "plan", "actual", "status"], [
      r("Week 1 (1–7 Oct)", "4 subfields × 11 tables; 6–7 tables/day/cleaner", "Start rotational cleaning. Daily PV cleaning + inverter & site cleaning", "Daily cleaning executed across PV subfields. Full plant cleaning cycle completed and restarted", "Done"),
      r("Week 2 (8–14 Oct)", "Continuous rotation system. Full coverage every 4 days", "Continue daily PV cleaning. Cleaning arrays, mountings, inverters, camp", "Continuous daily PV cleaning across all subfields. Full coverage maintained", "Done"),
      r("Week 3 (15–21 Oct)", "Rotation maintained with support activities", "Daily PV cleaning + pump room + warehouse organization", "Daily cleaning + multi-area support (pump room, waste, organization)", "Done"),
      r("Week 4 (22–31 Oct)", "Continuous rotation + final cleaning cycles", "Daily PV cleaning + full site cleaning", "Daily PV cleaning completed + bird waste removal + final housekeeping", "Done"),
    ]),
    a_cleaning_note:
      "Cleaning operations were executed using a continuous rotational system, where each cleaner covers 6–7 tables per day, ensuring full PV plant cleaning every 4 days. In case of staff absence, substitution was applied to maintain uninterrupted cleaning cycles and full PV coverage throughout the month.",
  };
}

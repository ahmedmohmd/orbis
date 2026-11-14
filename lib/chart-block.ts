import { barChart, donutChart, hbarChart, lineChart, palette, riskMatrix, ringGauge, fmtCompact } from "./charts";
import { allBlocks, safeEval, toNumber } from "./formula";
import type { Block, ReportData, Row, TemplateSchema } from "./types";

/** Build the SVG for a `chart` block. Returns null when there is nothing to draw yet. */
export function chartSvg(b: Block, t: TemplateSchema, data: ReportData, width = 640): string | null {
  const c = b.chart;
  if (!c) return null;
  const colors = palette(t.brand.accent, t.brand.accent2);
  const height = c.height;

  /* ---- source: fields / formulas ---- */
  if (c.source === "fields") {
    const items = (c.items ?? [])
      .map((it, i) => ({
        label: it.label,
        value: safeEval(it.value, t, data),
        color: it.color || colors[i % colors.length],
      }))
      .filter((i): i is { label: string; value: number; color: string } => i.value !== null);
    if (!items.length) return null;
    switch (c.kind) {
      case "donut": {
        const total = items.reduce((a, i) => a + i.value, 0);
        return donutChart({ items, unit: c.unit, centerTop: fmtCompact(total), centerBottom: c.unit ? `total ${c.unit}` : "total", width });
      }
      case "gauge":
        return ringGauge({ value: items[0].value, max: c.max ?? 100, color: items[0].color, size: 160, text: `${+items[0].value.toFixed(1)}${c.unit ?? "%"}` });
      case "bar":
      case "stackedbar":
      case "line":
      case "area":
        return barChart({ labels: items.map((i) => i.label), series: [{ name: c.title ?? "", color: items[0].color, values: items.map((i) => i.value) }], width, height, unit: c.unit });
      default:
        return hbarChart({ items, width, max: c.max, unit: c.unit });
    }
  }

  /* ---- source: table ---- */
  const tableBlock = allBlocks(t).find((x) => x.key === c.table);
  const rows = (Array.isArray(data[c.table ?? ""]) ? (data[c.table ?? ""] as Row[]) : []).filter((r) =>
    Object.values(r).some((v) => v !== "" && v != null),
  );
  if (!rows.length || !tableBlock) return null;
  const label = (col?: string) => tableBlock.columns?.find((x) => x.key === col)?.label ?? col ?? "";

  if (c.kind === "riskmatrix") {
    const risks = rows.map((r) => ({
      label: String(r[c.x ?? ""] ?? ""),
      prob: String(r[c.probKey ?? ""] ?? ""),
      impact: String(r[c.impactKey ?? ""] ?? ""),
    }));
    return riskMatrix({ risks, width });
  }

  const labels = rows.map((r) => String(r[c.x ?? ""] ?? ""));
  const series = (c.series ?? []).map((s, i) => ({
    name: s.label || label(s.key),
    color: s.color || colors[i % colors.length],
    values: rows.map((r) => toNumber(r[s.key])),
  }));
  if (!series.length) return null;

  switch (c.kind) {
    case "donut":
      return donutChart({
        items: rows.map((r, i) => ({ label: String(r[c.x ?? ""] ?? ""), value: toNumber(r[series[0].name ? c.series![0].key : ""]), color: colors[i % colors.length] })),
        unit: c.unit,
        width,
      });
    case "hbar":
      return hbarChart({ items: rows.map((r, i) => ({ label: labels[i], value: series[0].values[i], color: colors[i % colors.length] })), width, max: c.max, unit: c.unit });
    case "line":
    case "area":
      return lineChart({ labels, series, width, height, area: c.kind === "area", unit: c.unit });
    case "stackedbar":
      return barChart({ labels, series, width, height, stacked: true, unit: c.unit });
    default:
      return barChart({ labels, series, width, height, unit: c.unit });
  }
}

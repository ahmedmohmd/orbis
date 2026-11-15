import type { Block, ReportData, Row, TemplateSchema } from "./types";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

export function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/,/g, "").replace(/[^\d.\-eE]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Every block of the template, including the fields inside annexes. */
export function allBlocks(t: TemplateSchema): Block[] {
  const out: Block[] = [];
  const walk = (list: Block[]) => {
    for (const b of list) {
      out.push(b);
      if (b.children?.length) walk(b.children);
    }
  };
  walk(t.cover);
  for (const s of t.sections) walk(s.blocks);
  return out;
}

export function blockMap(t: TemplateSchema): Map<string, Block> {
  return new Map(allBlocks(t).map((b) => [b.key, b]));
}

export function formatNumber(n: number, decimals?: number): string {
  if (!Number.isFinite(n)) return "—";
  const d = decimals ?? (Number.isInteger(n) ? 0 : Math.abs(n) >= 1000 ? 0 : 2);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(n);
}

/* ------------------------------------------------------------------ */
/* tiny expression language                                            */
/*   numbers, + - * / ( ), {field}, {table.column}                     */
/*   sum() avg() count() min() max() round(x,n) abs()                  */
/* ------------------------------------------------------------------ */

type Val = number | number[];
type Resolver = (ref: string) => Val;

type Tok =
  | { t: "num"; v: number }
  | { t: "ref"; v: string }
  | { t: "id"; v: string }
  | { t: "op"; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
    } else if (c === "{") {
      const j = src.indexOf("}", i);
      if (j < 0) throw new Error("Missing }");
      out.push({ t: "ref", v: src.slice(i + 1, j).trim() });
      i = j + 1;
    } else if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ t: "num", v: parseFloat(src.slice(i, j)) });
      i = j;
    } else if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z_0-9]/.test(src[j])) j++;
      out.push({ t: "id", v: src.slice(i, j).toLowerCase() });
      i = j;
    } else if ("+-*/(),".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
    } else {
      throw new Error(`Unexpected "${c}"`);
    }
  }
  return out;
}

const scalar = (v: Val): number => {
  if (Array.isArray(v)) throw new Error("Use sum(), avg(), count()… with table columns");
  return v;
};

export function evalFormula(src: string, resolve: Resolver): number {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const eat = (v?: string) => {
    const t = toks[p++];
    if (v && (!t || t.t !== "op" || t.v !== v)) throw new Error(`Expected ${v}`);
    return t;
  };

  function expr(): Val {
    let l = term();
    while (peek()?.t === "op" && (peek() as any).v.match(/^[+-]$/)) {
      const op = (eat() as any).v;
      const r = term();
      l = op === "+" ? scalar(l) + scalar(r) : scalar(l) - scalar(r);
    }
    return l;
  }
  function term(): Val {
    let l = unary();
    while (peek()?.t === "op" && (peek() as any).v.match(/^[*/]$/)) {
      const op = (eat() as any).v;
      const r = unary();
      l = op === "*" ? scalar(l) * scalar(r) : scalar(l) / scalar(r);
    }
    return l;
  }
  function unary(): Val {
    const t = peek();
    if (t?.t === "op" && t.v === "-") {
      eat();
      return -scalar(unary());
    }
    return primary();
  }
  function primary(): Val {
    const t = toks[p++];
    if (!t) throw new Error("Unexpected end");
    if (t.t === "num") return t.v;
    if (t.t === "ref") return resolve(t.v);
    if (t.t === "op" && t.v === "(") {
      const v = expr();
      eat(")");
      return v;
    }
    if (t.t === "id") {
      eat("(");
      const args: Val[] = [];
      if (!(peek()?.t === "op" && (peek() as any).v === ")")) {
        args.push(expr());
        while (peek()?.t === "op" && (peek() as any).v === ",") {
          eat();
          args.push(expr());
        }
      }
      eat(")");
      const arr = (v: Val) => (Array.isArray(v) ? v : [v]);
      switch (t.v) {
        case "sum":
          return arr(args[0]).reduce((a, b) => a + b, 0);
        case "avg":
          return arr(args[0]).length ? arr(args[0]).reduce((a, b) => a + b, 0) / arr(args[0]).length : 0;
        case "count":
          return arr(args[0]).length;
        case "min":
          return Math.min(...args.flatMap(arr));
        case "max":
          return Math.max(...args.flatMap(arr));
        case "abs":
          return Math.abs(scalar(args[0]));
        case "round": {
          const f = 10 ** (args[1] === undefined ? 0 : scalar(args[1]));
          return Math.round(scalar(args[0]) * f) / f;
        }
        default:
          throw new Error(`Unknown function ${t.v}`);
      }
    }
    throw new Error("Unexpected token");
  }

  const v = expr();
  if (p < toks.length) throw new Error("Unexpected trailing input");
  return scalar(v);
}

/* ------------------------------------------------------------------ */
/* resolving values for a template + data                              */
/* ------------------------------------------------------------------ */

export function makeResolver(t: TemplateSchema, data: ReportData): Resolver {
  const blocks = blockMap(t);
  const stack = new Set<string>();

  const resolve: Resolver = (ref) => {
    const [key, col] = ref.split(".");
    const b = blocks.get(key);
    if (!b) return 0;
    const raw = data[key];
    switch (b.type) {
      case "records":
      case "table": {
        const rows = (Array.isArray(raw) ? (raw as Row[]) : raw === undefined && b.type === "table" ? b.defaultRows ?? [] : []).filter((r) => r.__k !== "group" && r.__k !== "head");
        return col ? rows.map((r) => toNumber(r[col])) : rows.map(() => 1);
      }
      case "list":
        return Array.isArray(raw) ? raw.map(() => 1) : [];
      case "computed": {
        if (stack.has(key)) throw new Error("Circular formula");
        stack.add(key);
        try {
          return evalFormula(b.formula ?? "0", resolve);
        } finally {
          stack.delete(key);
        }
      }
      default:
        return toNumber(raw);
    }
  };
  return resolve;
}

/** Numeric value of a block (number / percent / computed). null if blank or invalid. */
export function blockNumber(b: Block, t: TemplateSchema, data: ReportData): number | null {
  try {
    if (b.type === "computed") {
      const n = evalFormula(b.formula ?? "0", makeResolver(t, data));
      return Number.isFinite(n) ? n : null;
    }
    const raw = data[b.key];
    if (isEmpty(raw)) return null;
    return toNumber(raw);
  } catch {
    return null;
  }
}

/** Evaluate any user formula against report data; null when invalid. */
export function safeEval(src: string, t: TemplateSchema, data: ReportData): number | null {
  try {
    const n = evalFormula(src, makeResolver(t, data));
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function validateFormula(src: string, t: TemplateSchema): string | null {
  try {
    evalFormula(src, (ref) => {
      const [k] = ref.split(".");
      if (!blockMap(t).has(k)) throw new Error(`Unknown field "${k}"`);
      return ["table", "records"].includes(blockMap(t).get(k)!.type) && ref.includes(".") ? [1] : 1;
    });
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

import { readFileSync } from "node:fs";
import { join } from "node:path";

const WEIGHTS: [number, string][] = [[400, "Regular"], [500, "Medium"], [600, "SemiBold"], [700, "Bold"], [800, "ExtraBold"], [900, "ExtraBold"]];
let cache: string | undefined;

/** Inter, embedded in the page. Serverless machines have almost no fonts, so the PDF must carry its own. */
export function fontCss(): string {
  if (cache !== undefined) return cache;
  try {
    const files = new Map<string, string>();
    cache = WEIGHTS.map(([w, n]) => {
      if (!files.has(n)) files.set(n, readFileSync(join(process.cwd(), "fonts", `Inter-${n}.woff`)).toString("base64"));
      return `@font-face{font-family:Inter;font-weight:${w};font-style:normal;src:url(data:font/woff;base64,${files.get(n)}) format("woff")}`;
    }).join("");
  } catch {
    cache = ""; // fonts folder missing -> system fonts
  }
  return cache;
}

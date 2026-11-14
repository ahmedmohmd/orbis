import { INTER_WOFF } from "./font-data";

export { INTER_WOFF };
export const WEIGHTS: [number, string][] = [[400, "Regular"], [500, "Medium"], [600, "SemiBold"], [700, "Bold"], [800, "ExtraBold"], [900, "ExtraBold"]];
let cache: string | undefined;

/** Inter, embedded in the page. Serverless machines have almost no fonts, so the PDF must carry its own. */
export function fontCss(): string {
  return (cache ??= WEIGHTS.map(([w, n]) => `@font-face{font-family:Inter;font-weight:${w};font-style:normal;src:url(data:font/woff;base64,${INTER_WOFF[n]}) format("woff")}`).join(""));
}

import { INTER_WOFF, WEIGHTS, fontCss } from "./fonts";
const g = globalThis as unknown as { __pw?: Promise<any>; __pp?: Promise<any> };
const serverless = () => !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const OPTS = { preferCSSPageSize: true, printBackground: true } as const;

/** Vercel / AWS Lambda: puppeteer-core + a serverless Chromium build (the normal Chromium is too big to deploy). */
async function pdfServerless(html: string): Promise<Uint8Array> {
  const puppeteer = (await import("puppeteer-core")).default;
  const sparticuz = (await import("@sparticuz/chromium")).default;
  // a fresh browser per request: serverless instances are frozen between calls, a kept browser would be dead
  const browser = await puppeteer.launch({
    args: puppeteer.defaultArgs({ args: sparticuz.args, headless: "shell" }),
    executablePath: await sparticuz.executablePath(),
    headless: "shell",
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 45_000 });
    // Serverless Chromium refuses data: URLs in @font-face ("network error"), so hand it the font bytes directly.
    const faces = WEIGHTS.map(([weight, name]) => ({ weight, b64: INTER_WOFF[name] }));
    const err = await page.evaluate(async (list) => {
      const errors: string[] = [];
      for (const f of list) {
        try {
          const bin = atob(f.b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const face = new FontFace("Inter", bytes.buffer, { weight: String(f.weight), style: "normal" });
          await face.load();
          document.fonts.add(face);
        } catch (e) { errors.push(`${f.weight}: ${(e as Error).message}`); }
      }
      await document.fonts.ready;
      return errors;
    }, faces);
    if (err.length) throw new Error(`Report font failed to load -> ${err.join(" | ")}`);
    return await page.pdf(OPTS);
  } finally {
    await browser.close().catch(() => {});
  }
}

/** Local / Docker / VPS: full Playwright, one shared browser. */
async function pdfLocal(html0: string): Promise<Uint8Array> {
  const html = html0.replace("<style>", `<style>${fontCss()}</style><style>`);
  const { chromium } = await import("playwright");
  const get = async () => {
    if (g.__pw) {
      const b = await g.__pw.catch(() => undefined);
      if (b?.isConnected()) return b;
    }
    g.__pw = chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] }).catch((e: unknown) => { g.__pw = undefined; throw e; });
    return g.__pw;
  };
  const page = await (await get()).newPage();
  try {
    await page.setContent(html, { waitUntil: "load", timeout: 45_000 });
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf(OPTS);
  } finally {
    await page.close().catch(() => {});
  }
}

export const renderPdf = (html: string) => (serverless() ? pdfServerless(html) : pdfLocal(html));

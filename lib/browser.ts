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
    await page.evaluate(() => document.fonts.ready);
    const diag = await page.evaluate(async () => {
      const out: string[] = [];
      for (const f of [...document.fonts]) {
        try { await f.load(); } catch (e) { out.push(`${f.family} ${f.weight}: ${(e as Error).message}`); }
      }
      return { errors: out, faces: [...document.fonts].map((f) => `${f.weight}:${f.status}`).join(" "), body: getComputedStyle(document.body).fontFamily.slice(0, 60) };
    });
    if (!diag.faces) throw new Error(`No report fonts were injected [${diag.body}]`);
    if (diag.errors.length) throw new Error(`Report font failed to load -> ${diag.errors.join(" | ")} [faces ${diag.faces}] [${diag.body}]`);
    return await page.pdf(OPTS);
  } finally {
    await browser.close().catch(() => {});
  }
}

/** Local / Docker / VPS: full Playwright, one shared browser. */
async function pdfLocal(html: string): Promise<Uint8Array> {
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

import type { Browser } from "playwright-core";

const g = globalThis as unknown as { __browser?: Promise<Browser> };
const serverless = () => !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

async function launch(): Promise<Browser> {
  if (serverless()) {
    // Vercel / AWS Lambda: a small Chromium build made for serverless (the normal one is too big to deploy)
    const { chromium } = await import("playwright-core");
    const sparticuz = (await import("@sparticuz/chromium")).default;
    return chromium.launch({ args: sparticuz.args, executablePath: await sparticuz.executablePath(), headless: true });
  }
  // local / Docker / VPS: full Playwright
  const { chromium } = await import("playwright");
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] }) as unknown as Promise<Browser>;
}

/** One shared browser per server instance (re-launched if it died). */
export async function getBrowser(): Promise<Browser> {
  if (g.__browser) {
    const b = await g.__browser.catch(() => undefined);
    if (b?.isConnected()) return b;
    g.__browser = undefined;
  }
  g.__browser = launch().catch((e) => { g.__browser = undefined; throw e; });
  return g.__browser;
}

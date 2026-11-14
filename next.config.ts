import type { NextConfig } from "next";

const config: NextConfig = {
  // native / heavy packages must not be bundled
  serverExternalPackages: ["playwright", "puppeteer-core", "@sparticuz/chromium", "sharp", "postgres"],
  // make sure Vercel ships the Chromium binary and the report fonts with the PDF function
  // Vercel must ship the Chromium binary + fonts with the PDF function.
  // NB: route keys are globs, so "[id]" must be written as "*" (brackets would mean a character class).
  outputFileTracingIncludes: {
    "/api/reports/*/pdf": ["./node_modules/@sparticuz/chromium/**/*", "./fonts/**/*"],
    "/api/reports/**/*": ["./node_modules/@sparticuz/chromium/**/*", "./fonts/**/*"],
  },
  // report images are stored as data-URLs inside JSONB
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};

export default config;

import type { NextConfig } from "next";

const config: NextConfig = {
  // native / heavy packages must not be bundled
  serverExternalPackages: ["playwright", "playwright-core", "@sparticuz/chromium", "sharp", "postgres"],
  // make sure Vercel ships the Chromium binary and the report fonts with the PDF function
  outputFileTracingIncludes: {
    "/api/reports/[id]/pdf": ["./node_modules/@sparticuz/chromium/bin/**", "./fonts/**"],
  },
  // report images are stored as data-URLs inside JSONB
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};

export default config;

import type { NextConfig } from "next";

const config: NextConfig = {
  // native / heavy packages must not be bundled
  serverExternalPackages: ["playwright", "sharp", "postgres"],
  // report images are stored as data-URLs inside JSONB
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};

export default config;

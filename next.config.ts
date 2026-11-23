import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Emits .next/standalone, a self-contained server the Dockerfile runs.
  output: "standalone",
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

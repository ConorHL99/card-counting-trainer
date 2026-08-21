import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Traces exactly the production node_modules the server actually
  // needs into .next/standalone — the production Dockerfile copies
  // just that output, never the full node_modules or dev
  // dependencies. Doesn't affect `next dev` at all.
  output: "standalone",
};

export default nextConfig;

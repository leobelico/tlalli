import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./src/lib/csp";

const nextConfig: NextConfig = {
  // The CRM is fully per-user/per-tenant dynamic; Cache Components disabled on purpose (see DECISIONS.md).
  reactCompiler: true,
  poweredByHeader: false,
  serverExternalPackages: ["pdf-lib"],
  experimental: {
    // CSV imports accept up to 2 MB (+ multipart overhead).
    serverActions: { bodySizeLimit: "2200kb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const csp = contentSecurityPolicy({ production: process.env.NODE_ENV === "production" });
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Everything except the hosted form (/f/*, whose framing rules are per organization and set by the
      // proxy) is never framed. The CSP also skips /api so the browser's PDF viewer keeps working.
      { source: "/:path((?!f/).*)", headers: [{ key: "X-Frame-Options", value: "DENY" }] },
      { source: "/:path((?!f/|api/).*)", headers: [{ key: "Content-Security-Policy", value: csp }] },
    ];
  },
};

export default nextConfig;

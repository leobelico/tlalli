import type { NextConfig } from "next";

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
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

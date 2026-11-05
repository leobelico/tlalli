import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "";
  return {
    rules: { userAgent: "*", allow: ["/", "/precios"], disallow: ["/app", "/api", "/invitacion", "/f/", "/aviso-privacidad/"] },
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}

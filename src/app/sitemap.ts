import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? "http://localhost:3010";
  return ["", "/precios", "/terminos", "/privacidad"].map((path) => ({ url: `${base}${path}` }));
}

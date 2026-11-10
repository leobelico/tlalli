/**
 * Content-Security-Policy for the app (QA2 B39) and the list of sites allowed to embed the hosted
 * form. Pure and shared by next.config.ts, the proxy and the settings screen.
 *
 * `script-src` keeps 'unsafe-inline' because Next.js injects inline bootstrap scripts and this app
 * does not use per-request nonces yet; the rest of the policy (no framing, no <object>, same-origin
 * forms and connections, fixed <base>) is what blocks the practical attacks. See docs/PILOTO.md.
 */
export function contentSecurityPolicy(o: { production: boolean; frameAncestors?: string[] }): string {
  const dev = !o.production;
  const ancestors = o.frameAncestors?.length ? o.frameAncestors.join(" ") : "'none'";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${ancestors}`,
  ].join("; ");
}

export const MAX_EMBED_ORIGINS = 10;

/** One site per line (or comma): keeps only the origin, https required (http only for localhost). */
export function parseEmbedOrigins(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)) {
    const bad = () => new Error(`"${raw.slice(0, 60)}" no es una dirección válida. Escribe el sitio completo, con https:// (por ejemplo https://midesarrolladora.mx).`);
    if (/[\s;*'"<>]/.test(raw)) throw bad();
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      throw bad();
    }
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (!(u.protocol === "https:" || (u.protocol === "http:" && local)) || !/^[a-z0-9.-]+$/.test(u.hostname)) throw bad();
    if (!out.includes(u.origin)) out.push(u.origin);
  }
  if (out.length > MAX_EMBED_ORIGINS) throw new Error(`Máximo ${MAX_EMBED_ORIGINS} sitios.`);
  return out;
}

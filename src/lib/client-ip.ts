/**
 * The visitor's IP, only when we know which proxy to trust (QA B16). Anyone can send
 * X-Forwarded-For, so reading it blindly lets an attacker pick a new "IP" per request.
 *
 * TRUSTED_PROXY:
 *  - unset / "none": no forwarded header is trusted -> null (callers skip per-IP limits and rely
 *    on per-organization and per-phone limits instead).
 *  - "vercel":       x-vercel-forwarded-for (set by Vercel's edge, not by the client).
 *  - "cloudflare":   cf-connecting-ip.
 *  - "xff:N":        N trusted proxies append to X-Forwarded-For; the client is the N-th entry from the right.
 */
const IP_RE = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:]{2,45})$/i;

export function clientIp(headers: Headers, mode: string | undefined = process.env.TRUSTED_PROXY): string | null {
  const pick = (v: string | null | undefined) => {
    const ip = v?.trim();
    return ip && IP_RE.test(ip) ? ip : null;
  };
  if (!mode || mode === "none") return null;
  if (mode === "vercel") return pick(headers.get("x-vercel-forwarded-for")?.split(",")[0]);
  if (mode === "cloudflare") return pick(headers.get("cf-connecting-ip"));
  const m = /^xff:(\d{1,2})$/.exec(mode);
  if (m) {
    const parts = (headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const n = Number(m[1]);
    return n >= 1 && parts.length >= n ? pick(parts[parts.length - n]) : null;
  }
  return null;
}

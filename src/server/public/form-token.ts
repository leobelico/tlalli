import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Invisible anti-bot check for the hosted form: the page embeds a signed timestamp; a submission
 * filled faster than a person can (or with a stale/forged token) is dropped silently.
 * No third-party captcha, no cookies, works without JavaScript.
 */
const MIN_FILL_MS = 2_500;
const MAX_AGE_MS = 24 * 3_600_000;

function secret(): string {
  // FORM_TOKEN_SECRET in production; a fixed dev fallback keeps local runs and tests working.
  return process.env.FORM_TOKEN_SECRET || `dev-only:${process.env.DATABASE_URL ?? "local"}`;
}

const sign = (ts: string) => createHmac("sha256", secret()).update(`form:${ts}`).digest("base64url").slice(0, 32);

export function issueFormToken(now: number = Date.now()): string {
  const ts = String(now);
  return `${ts}.${sign(ts)}`;
}

export function verifyFormToken(token: unknown, now: number = Date.now()): boolean {
  if (typeof token !== "string" || token.length > 80) return false;
  const [ts, sig] = token.split(".");
  if (!/^\d{10,16}$/.test(ts ?? "") || !sig) return false;
  const expected = Buffer.from(sign(ts));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  const age = now - Number(ts);
  return age >= MIN_FILL_MS && age <= MAX_AGE_MS;
}

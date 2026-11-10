import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { canonicalizePayload, findOrgByFormKey, intakeWebLead } from "@/server/public/lead-intake";
import { hitRateLimit } from "@/server/public/rate-limit";
import { verifyFormToken } from "@/server/public/form-token";
import { clientIp } from "@/lib/client-ip";
import { normalizePhone } from "@/lib/phone";

/**
 * Public lead intake for web forms and landing pages.
 *
 *   POST /api/public/leads
 *   Header  X-Form-Key: lfk_...   (or field "form_key")
 *   Body    JSON or application/x-www-form-urlencoded / multipart:
 *           nombre*, telefono*, acepta_privacidad* (true), apellido, email, campana (código),
 *           canal, desarrollo, mensaje, website (honeypot, leave empty), redirect (form posts only),
 *           _t (signed timestamp the hosted form embeds; optional for third-party sites)
 *
 * The form key is publishable by design: it only allows creating leads in its organization.
 * Every accepted submission gets the same answer, `{ ok: true }` with 200, whether the phone was new,
 * already a lead, a bot or over a limit (QA B15): the endpoint must not reveal who is a customer.
 */

const MAX_BODY_BYTES = 16 * 1024;
const LIMITS = {
  /** Only when TRUSTED_PROXY tells us how to read the real client IP. */
  perIp: { limit: 20, windowMs: 60_000 },
  /**
   * Per-organization budgets are split in two lanes so that one origin can never lock the form for
   * everybody (QA2 B34): people using the hosted form (valid signed token) and everything else
   * (third-party sites, scripts, bots). Flooding the second lane leaves the first untouched.
   */
  orgHosted: { limit: 200, windowMs: 60_000 },
  orgOther: { limit: 60, windowMs: 60_000 },
  /** A form token can be used a few times (typos, resubmits), not replayed forever. */
  perToken: { limit: 3, windowMs: 24 * 3_600_000 },
  /** Caps how often the same phone can touch a lead's history. */
  perPhone: { limit: 5, windowMs: 3_600_000 },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Form-Key",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...CORS, ...extra } });
}

function safeRedirect(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Accepted answers (new lead, known phone, dropped bot) all wait until the same floor has passed, so
 * response time cannot tell a visitor whether a phone is already a customer (QA2 B43).
 */
const ANSWER_FLOOR_MS = 150;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const started = Date.now();
  const res = await handle(req);
  if (res.status === 200 || res.status === 303) await sleep(Math.max(0, ANSWER_FLOOR_MS - (Date.now() - started)) + Math.floor(Math.random() * 20));
  return res;
}

async function handle(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (ip) {
    const r = await hitRateLimit(`lead-ip:${ip}`, LIMITS.perIp.limit, LIMITS.perIp.windowMs);
    if (!r.ok) return json({ ok: false, error: "Demasiadas solicitudes. Intenta en un minuto." }, 429, { "Retry-After": String(r.retryAfterSec) });
  }

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return json({ ok: false, error: "Solicitud demasiado grande." }, 413);

  const contentType = req.headers.get("content-type") ?? "";
  let payload: Record<string, unknown>;
  let isFormPost = false;
  try {
    if (contentType.includes("application/json")) {
      const text = await req.text();
      if (text.length > MAX_BODY_BYTES) return json({ ok: false, error: "Solicitud demasiado grande." }, 413);
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
      payload = parsed as Record<string, unknown>;
    } else if (contentType.includes("form")) {
      isFormPost = true;
      const form = await req.formData();
      payload = {};
      for (const [k, v] of form.entries()) if (typeof v === "string") payload[k] = v;
    } else {
      return json({ ok: false, error: "Usa Content-Type application/json o un formulario." }, 415);
    }
  } catch {
    return json({ ok: false, error: "Cuerpo inválido." }, 400);
  }

  const key = req.headers.get("x-form-key") ?? (typeof payload.form_key === "string" ? payload.form_key : null);
  const org = await findOrgByFormKey(key);
  if (!org) return json({ ok: false, error: "Llave de formulario inválida." }, 401);

  const hasToken = payload._t !== undefined;
  const tokenOk = hasToken && verifyFormToken(payload._t);
  const lane = tokenOk ? LIMITS.orgHosted : LIMITS.orgOther;
  const orgLimit = await hitRateLimit(`lead-org:${tokenOk ? "hosted" : "other"}:${org.id}`, lane.limit, lane.windowMs);
  if (!orgLimit.ok) return json({ ok: false, error: "Demasiadas solicitudes." }, 429, { "Retry-After": String(orgLimit.retryAfterSec) });

  const redirectTo = isFormPost ? safeRedirect(payload.redirect) : null;
  const accepted = () => (redirectTo ? NextResponse.redirect(redirectTo, { status: 303, headers: CORS }) : json({ ok: true }, 200));

  // Hosted form: a missing-in-time or forged token means a script, not a person. Drop it quietly.
  if (hasToken && !tokenOk) return accepted();
  if (tokenOk) {
    const tokenKey = createHash("sha256").update(String(payload._t)).digest("hex").slice(0, 32);
    if (!(await hitRateLimit(`lead-token:${tokenKey}`, LIMITS.perToken.limit, LIMITS.perToken.windowMs)).ok) return accepted();
  }

  // Per-phone cap, checked before touching the database so a flood can't spam one lead's history.
  const phone = normalizePhone(String(canonicalizePayload(payload).telefono ?? ""));
  if (phone) {
    const r = await hitRateLimit(`lead-phone:${org.id}:${phone}`, LIMITS.perPhone.limit, LIMITS.perPhone.windowMs);
    if (!r.ok) return accepted();
  }

  const result = await intakeWebLead(org.id, payload, {
    ip: ip ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  if (!result.ok) return json({ ok: false, error: "Datos inválidos.", fields: result.errors }, 400);
  return accepted();
}

import { NextResponse, type NextRequest } from "next/server";
import { findOrgByFormKey, intakeWebLead } from "@/server/public/lead-intake";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Public lead intake for web forms and landing pages.
 *
 *   POST /api/public/leads
 *   Header  X-Form-Key: lfk_...   (or field "form_key")
 *   Body    JSON or application/x-www-form-urlencoded / multipart:
 *           nombre*, telefono*, acepta_privacidad* (true), apellido, email, campana (código),
 *           canal, desarrollo, mensaje, website (honeypot, leave empty), redirect (form posts only)
 *
 * The form key is publishable by design: it only allows creating leads in its organization.
 */

const MAX_BODY_BYTES = 16 * 1024;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Form-Key",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...CORS, ...extra } });
}

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
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

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const ipLimit = rateLimit(`lead-ip:${ip}`, 20, 60_000);
  if (!ipLimit.ok) {
    return json({ ok: false, error: "Demasiadas solicitudes. Intenta en un minuto." }, 429, {
      "Retry-After": String(ipLimit.retryAfterSec),
    });
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

  const orgLimit = rateLimit(`lead-org:${org.id}`, 300, 60_000);
  if (!orgLimit.ok) return json({ ok: false, error: "Demasiadas solicitudes." }, 429);

  const result = await intakeWebLead(org.id, payload, {
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  if (!result.ok) {
    return json({ ok: false, error: "Datos inválidos.", fields: result.errors }, 400);
  }

  const redirectTo = isFormPost ? safeRedirect(payload.redirect) : null;
  if (redirectTo) return NextResponse.redirect(redirectTo, { status: 303, headers: CORS });

  return json({ ok: true, id: result.leadId, nuevo: result.created }, result.created ? 201 : 200);
}

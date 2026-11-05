import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { parseWebhookPayload, verifySignature } from "@/server/whatsapp/webhook-format";
import { processWhatsAppEvents } from "@/server/public/whatsapp-inbound";

/**
 * WhatsApp Cloud API webhook.
 *  GET  — subscription verification (hub.mode / hub.verify_token / hub.challenge).
 *  POST — messages and delivery statuses, signed with X-Hub-Signature-256 (app secret).
 */

const MAX_BODY_BYTES = 512 * 1024;

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  const token = p.get("hub.verify_token") ?? "";
  if (p.get("hub.mode") === "subscribe" && expected && safeEqual(token, expected)) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return new NextResponse("Payload too large", { status: 413 });
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), process.env.WHATSAPP_APP_SECRET)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }
  try {
    const summary = await processWhatsAppEvents(parseWebhookPayload(payload));
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    // 500 makes Meta retry later; processing is idempotent by message id.
    console.error("[whatsapp:webhook]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

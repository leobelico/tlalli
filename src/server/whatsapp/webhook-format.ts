import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizePhone } from "@/lib/phone";
import type { WebhookEvent } from "./types";

/**
 * Verifies Meta's `X-Hub-Signature-256: sha256=<hex>` header (HMAC-SHA256 of the raw body
 * with the app secret). Both providers use the same format.
 */
export function verifySignature(rawBody: string, header: string | null, appSecret: string | undefined): boolean {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  let received: Buffer;
  try {
    received = Buffer.from(header.slice(7), "hex");
  } catch {
    return false;
  }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function signBody(rawBody: string, appSecret: string): string {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
}

type MetaMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  image?: { caption?: string };
  document?: { caption?: string; filename?: string };
  location?: { name?: string; address?: string };
};

type MetaPayload = {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: MetaMessage[];
        statuses?: { id?: string; status?: string; errors?: { title?: string; message?: string }[] }[];
      };
    }[];
  }[];
};

const STATUS = new Set(["sent", "delivered", "read", "failed"]);

function describe(m: MetaMessage): string {
  switch (m.type) {
    case "text":
      return m.text?.body ?? "";
    case "button":
      return m.button?.text ?? "[Botón]";
    case "interactive":
      return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "[Respuesta interactiva]";
    case "image":
      return `[Imagen]${m.image?.caption ? ` ${m.image.caption}` : ""}`;
    case "document":
      return `[Documento] ${m.document?.filename ?? ""}`.trim();
    case "audio":
      return "[Nota de voz]";
    case "video":
      return "[Video]";
    case "location":
      return `[Ubicación] ${m.location?.name ?? m.location?.address ?? ""}`.trim();
    case "sticker":
      return "[Sticker]";
    default:
      return `[${m.type ?? "mensaje"}]`;
  }
}

/** Parses a Meta WhatsApp Cloud API webhook payload into normalized events. Ignores anything unknown. */
export function parseWebhookPayload(payload: unknown): WebhookEvent[] {
  const p = payload as MetaPayload;
  if (!p || p.object !== "whatsapp_business_account" || !Array.isArray(p.entry)) return [];
  const events: WebhookEvent[] = [];
  for (const entry of p.entry) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages" || !change.value) continue;
      const phoneNumberId = change.value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;
      const names = new Map((change.value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]));
      for (const m of change.value.messages ?? []) {
        const from = normalizePhone(m.from ? `+${m.from}` : null);
        if (!m.id || !from) continue;
        const ts = Number(m.timestamp);
        events.push({
          kind: "message",
          phoneNumberId,
          from,
          providerId: m.id,
          timestamp: Number.isFinite(ts) && ts > 0 ? new Date(ts * 1000) : new Date(),
          text: describe(m).slice(0, 4000),
          profileName: names.get(m.from)?.slice(0, 80),
        });
      }
      for (const s of change.value.statuses ?? []) {
        if (!s.id || !s.status || !STATUS.has(s.status)) continue;
        events.push({
          kind: "status",
          phoneNumberId,
          providerId: s.id,
          status: s.status as "sent" | "delivered" | "read" | "failed",
          error: s.errors?.[0]?.message ?? s.errors?.[0]?.title,
        });
      }
    }
  }
  return events;
}

/** Builds a Meta-format inbound text payload (used by the dev simulator and tests). */
export function buildInboundTextPayload(input: {
  phoneNumberId: string;
  fromDigits: string;
  text: string;
  name?: string;
  id: string;
  timestamp?: Date;
}) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "524440000000", phone_number_id: input.phoneNumberId },
              contacts: [{ wa_id: input.fromDigits, profile: { name: input.name ?? "Prospecto" } }],
              messages: [
                {
                  from: input.fromDigits,
                  id: input.id,
                  timestamp: String(Math.floor((input.timestamp ?? new Date()).getTime() / 1000)),
                  type: "text",
                  text: { body: input.text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

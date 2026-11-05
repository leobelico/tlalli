import "server-only";
import { randomUUID } from "node:crypto";
import { waDigits } from "@/lib/phone";
import type { SendResult, SendTemplateParams, SendTextParams, WhatsAppProvider } from "./types";

/** Development provider: no network calls, messages are "sent" instantly. */
export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "mock" as const;
  readonly sent: (SendTemplateParams | SendTextParams)[] = [];

  async sendTemplate(params: SendTemplateParams): Promise<SendResult> {
    this.sent.push(params);
    if (process.env.NODE_ENV !== "test") {
      console.info(`[whatsapp:mock] template ${params.template} -> ${params.to}`, params.variables);
    }
    return { ok: true, providerId: `mock.${randomUUID()}` };
  }

  async sendText(params: SendTextParams): Promise<SendResult> {
    this.sent.push(params);
    if (process.env.NODE_ENV !== "test") console.info(`[whatsapp:mock] text -> ${params.to}: ${params.body}`);
    return { ok: true, providerId: `mock.${randomUUID()}` };
  }
}

/** Meta WhatsApp Cloud API (graph.facebook.com). */
export class CloudApiWhatsAppProvider implements WhatsAppProvider {
  readonly name = "cloud" as const;

  constructor(
    private readonly accessToken: string,
    private readonly apiVersion: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async post(phoneNumberId: string | null, body: Record<string, unknown>): Promise<SendResult> {
    if (!phoneNumberId) {
      return { ok: false, error: "La organización no tiene configurado su Phone number ID de WhatsApp." };
    }
    try {
      const res = await this.fetchImpl(`https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...body }),
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await res.json().catch(() => ({}))) as {
        messages?: { id: string }[];
        error?: { message?: string; code?: number };
      };
      if (!res.ok || !json.messages?.[0]?.id) {
        return { ok: false, error: `WhatsApp ${res.status}: ${json.error?.message ?? "error desconocido"}` };
      }
      return { ok: true, providerId: json.messages[0].id };
    } catch (e) {
      return { ok: false, error: `No se pudo conectar con WhatsApp: ${(e as Error).message}` };
    }
  }

  sendTemplate(p: SendTemplateParams) {
    return this.post(p.fromPhoneNumberId, {
      to: waDigits(p.to),
      type: "template",
      template: {
        name: p.template,
        language: { code: p.language },
        components: p.variables.length
          ? [{ type: "body", parameters: p.variables.map((text) => ({ type: "text", text })) }]
          : [],
      },
    });
  }

  sendText(p: SendTextParams) {
    return this.post(p.fromPhoneNumberId, {
      to: waDigits(p.to),
      type: "text",
      text: { body: p.body, preview_url: false },
    });
  }
}

let override: WhatsAppProvider | null = null;
let cached: WhatsAppProvider | null = null;

/** Picks the provider from WHATSAPP_PROVIDER ("mock" by default). */
export function getWhatsAppProvider(): WhatsAppProvider {
  if (override) return override;
  if (cached) return cached;
  if (process.env.WHATSAPP_PROVIDER === "cloud") {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN is required when WHATSAPP_PROVIDER=cloud");
    cached = new CloudApiWhatsAppProvider(token, process.env.WHATSAPP_API_VERSION || "v23.0");
  } else {
    cached = new MockWhatsAppProvider();
  }
  return cached;
}

/** Test hook. */
export function setWhatsAppProviderForTests(p: WhatsAppProvider | null) {
  override = p;
}

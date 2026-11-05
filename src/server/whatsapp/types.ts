export type SendResult = { ok: true; providerId: string } | { ok: false; error: string };

export type SendTemplateParams = {
  /** Meta phone number id that sends the message (per organization). */
  fromPhoneNumberId: string | null;
  /** Recipient in E.164 (+524441234567). */
  to: string;
  template: string;
  language: string;
  variables: string[];
};

export type SendTextParams = {
  fromPhoneNumberId: string | null;
  to: string;
  body: string;
};

export type InboundMessageEvent = {
  kind: "message";
  phoneNumberId: string;
  /** E.164 */
  from: string;
  providerId: string;
  timestamp: Date;
  text: string;
  profileName?: string;
};

export type StatusEvent = {
  kind: "status";
  phoneNumberId: string;
  providerId: string;
  status: "sent" | "delivered" | "read" | "failed";
  error?: string;
};

export type WebhookEvent = InboundMessageEvent | StatusEvent;

/** Adapter implemented by the mock (development) and Meta Cloud API providers. */
export interface WhatsAppProvider {
  readonly name: "mock" | "cloud";
  sendTemplate(params: SendTemplateParams): Promise<SendResult>;
  sendText(params: SendTextParams): Promise<SendResult>;
}

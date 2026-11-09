import "server-only";
import { BRAND } from "@/lib/brand";

export type EmailMessage = { to: string; subject: string; text: string; html: string };
export type EmailProvider = { name: string; send(message: EmailMessage): Promise<void> };
type Env = Record<string, string | undefined>;

/** Messages "sent" by the mock provider (tests and local development without a mail service). */
export const emailOutbox: (EmailMessage & { sentAt: Date })[] = [];
export function resetOutbox() {
  emailOutbox.length = 0;
}

const fromAddress = (env: Env) => env.EMAIL_FROM || `${BRAND.name} <${BRAND.supportEmail}>`;

function parseFrom(from: string): { Email: string; Name?: string } {
  const m = /^(.*)<([^>]+)>\s*$/.exec(from);
  return m ? { Name: m[1].trim().replace(/^"|"$/g, "") || undefined, Email: m[2].trim() } : { Email: from.trim() };
}

/**
 * Providers (EMAIL_PROVIDER):
 *  - mock    (default) records in memory and logs; nothing leaves the machine.
 *  - mailpit local development: Supabase's Mailpit HTTP API (its SMTP port is not exposed on the host).
 *  - resend  production: https://resend.com HTTP API (RESEND_API_KEY, EMAIL_FROM on a verified domain).
 */
export function emailProviderFor(name: string, env: Env = process.env): EmailProvider {
  if (name === "resend") {
    return {
      name,
      async send(m) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY ?? ""}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: fromAddress(env), to: [m.to], subject: m.subject, text: m.text, html: m.html }),
        });
        if (!res.ok) throw new Error(`Resend respondió ${res.status}`);
      },
    };
  }
  if (name === "mailpit") {
    return {
      name,
      async send(m) {
        const base = (env.MAILPIT_URL || "http://127.0.0.1:54324").replace(/\/$/, "");
        const res = await fetch(`${base}/api/v1/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ From: parseFrom(fromAddress(env)), To: [{ Email: m.to }], Subject: m.subject, Text: m.text, HTML: m.html }),
        });
        if (!res.ok) throw new Error(`Mailpit respondió ${res.status}`);
      },
    };
  }
  return {
    name: "mock",
    async send(m) {
      emailOutbox.push({ ...m, sentAt: new Date() });
      if (process.env.NODE_ENV !== "test" && !process.env.VITEST) console.log(`[email:mock] -> ${m.to}: ${m.subject}`);
    },
  };
}

/** Best-effort: a mail problem must never break the business action that triggered it. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  try {
    await emailProviderFor(process.env.EMAIL_PROVIDER || "mock").send(message);
    return true;
  } catch (e) {
    console.error("No se pudo enviar el correo:", e instanceof Error ? e.message : e);
    return false;
  }
}

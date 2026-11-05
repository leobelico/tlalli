import "server-only";
import type { MessageStatus } from "@/generated/prisma/enums";
import { rootPrisma } from "@/server/db/root";
import { withOrg } from "@/server/db/tenant";
import { storeInboundMessage } from "@/server/services/whatsapp";
import type { WebhookEvent } from "@/server/whatsapp/types";

const STATUS_MAP: Record<string, MessageStatus> = {
  sent: "ENVIADO",
  delivered: "ENTREGADO",
  read: "LEIDO",
  failed: "FALLIDO",
};
const STATUS_RANK: Record<MessageStatus, number> = {
  EN_COLA: 0,
  ENVIADO: 1,
  ENTREGADO: 2,
  LEIDO: 3,
  FALLIDO: 4,
  RECIBIDO: 0,
};

/**
 * Routes webhook events to organizations by Meta phone_number_id (root client: the tenant
 * is unknown until we look it up), then processes each one inside that tenant's RLS scope.
 */
export async function processWhatsAppEvents(events: WebhookEvent[]) {
  const summary = { messages: 0, duplicates: 0, statuses: 0, ignored: 0 };
  const orgByPhoneId = new Map<string, string | null>();

  for (const ev of events) {
    if (!orgByPhoneId.has(ev.phoneNumberId)) {
      const org = await rootPrisma.organization.findUnique({
        where: { waPhoneNumberId: ev.phoneNumberId },
        select: { id: true },
      });
      orgByPhoneId.set(ev.phoneNumberId, org?.id ?? null);
    }
    const orgId = orgByPhoneId.get(ev.phoneNumberId);
    if (!orgId) {
      summary.ignored++;
      continue;
    }
    if (ev.kind === "message") {
      const r = await storeInboundMessage(orgId, ev);
      if (r.duplicate) summary.duplicates++;
      else summary.messages++;
    } else {
      const status = STATUS_MAP[ev.status];
      await withOrg(orgId, async (tx) => {
        const msg = await tx.whatsAppMessage.findFirst({ where: { providerId: ev.providerId } });
        // Statuses can arrive out of order: never downgrade (read -> delivered).
        if (!msg || STATUS_RANK[status] <= STATUS_RANK[msg.status]) return;
        await tx.whatsAppMessage.update({
          where: { id: msg.id },
          data: { status, error: status === "FALLIDO" ? (ev.error ?? "Error de entrega") : msg.error },
        });
      });
      summary.statuses++;
    }
  }
  return summary;
}

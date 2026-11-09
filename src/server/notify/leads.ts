import "server-only";
import { withOrg } from "@/server/db/tenant";
import { CHANNEL_LABEL } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { sendEmail } from "./email";
import { leadAssignedEmail, leadsAssignedSummaryEmail } from "./templates";

const appUrl = () => (process.env.APP_URL ?? "").replace(/\/$/, "");

async function activeAssignee(orgId: string, userId: string) {
  return withOrg(orgId, async (tx) => {
    const m = await tx.membership.findFirst({ where: { userId, active: true }, select: { userId: true } });
    if (!m) return null;
    return tx.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  });
}

/**
 * Tells an asesor a lead was just assigned to them. Never throws: a notification problem must not
 * break capturing the lead. Skips when the assignee is the person who did the action.
 */
export async function notifyLeadAssigned(orgId: string, leadId: string, assigneeId: string, actorId?: string) {
  try {
    if (assigneeId === actorId) return;
    const [assignee, lead] = await Promise.all([
      activeAssignee(orgId, assigneeId),
      withOrg(orgId, (tx) =>
        tx.lead.findUnique({
          where: { id: leadId },
          select: { id: true, firstName: true, lastName: true, phone: true, channel: true, campaign: { select: { code: true } } },
        }),
      ),
    ]);
    if (!assignee || !lead) return;
    const origin = [CHANNEL_LABEL[lead.channel], lead.campaign ? `campaña ${lead.campaign.code}` : null].filter(Boolean).join(" · ");
    await sendEmail({
      to: assignee.email,
      ...leadAssignedEmail({
        leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" "),
        phone: formatPhone(lead.phone),
        origin,
        link: `${appUrl()}/app/leads/${lead.id}`,
      }),
    });
  } catch (e) {
    console.error("notifyLeadAssigned:", e instanceof Error ? e.message : e);
  }
}

/** One email per asesor after a bulk import or distribution, instead of one per lead. */
export async function notifyLeadsAssignedSummary(orgId: string, counts: Map<string, number>, actorId?: string) {
  for (const [userId, count] of counts) {
    try {
      if (userId === actorId || count === 0) continue;
      const assignee = await activeAssignee(orgId, userId);
      if (!assignee) continue;
      await sendEmail({ to: assignee.email, ...leadsAssignedSummaryEmail({ name: assignee.name.split(" ")[0], count, link: `${appUrl()}/app/leads` }) });
    } catch (e) {
      console.error("notifyLeadsAssignedSummary:", e instanceof Error ? e.message : e);
    }
  }
}

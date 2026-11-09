import "server-only";
import { rootPrisma } from "@/server/db/root";
import { withOrg } from "@/server/db/tenant";
import { OPEN_STAGES, staleCutoff } from "@/lib/stale";
import { sendEmail } from "@/server/notify/email";
import { digestEmail } from "@/server/notify/templates";

/**
 * Daily "tus pendientes" email: overdue tasks and leads without contact, per person. Only people
 * with something pending get one. Cross-organization by nature, so it lives in server/public (the
 * only place besides auth/db allowed to use the root client) and still reads each org under RLS.
 */
export async function runDailyDigest(now: Date = new Date()): Promise<{ sent: number; orgs: number }> {
  const orgs = await rootPrisma.organization.findMany({ select: { id: true } });
  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  let sent = 0;
  for (const { id: orgId } of orgs) {
    try {
      const people = await withOrg(orgId, async (tx) => {
        const org = await tx.organization.findUniqueOrThrow({ where: { id: orgId }, select: { staleLeadHours: true } });
        const cutoff = staleCutoff(org.staleLeadHours, now);
        const members = await tx.membership.findMany({
          where: { active: true },
          select: { user: { select: { id: true, email: true, name: true } } },
        });
        const out: { email: string; name: string; overdueTasks: number; staleLeads: number }[] = [];
        for (const { user } of members) {
          const [overdueTasks, staleLeads] = await Promise.all([
            tx.task.count({ where: { assignedToId: user.id, completedAt: null, dueAt: { lt: now } } }),
            tx.lead.count({
              where: {
                assignedToId: user.id,
                stage: { in: OPEN_STAGES },
                OR: [{ lastContactAt: { lt: cutoff } }, { lastContactAt: null, createdAt: { lt: cutoff } }],
              },
            }),
          ]);
          if (overdueTasks > 0 || staleLeads > 0) out.push({ email: user.email, name: user.name.split(" ")[0], overdueTasks, staleLeads });
        }
        return out;
      });
      for (const p of people) {
        if (await sendEmail({ to: p.email, ...digestEmail({ ...p, link: `${appUrl}/app` }) })) sent++;
      }
    } catch (e) {
      console.error(`Resumen diario: falló la organización ${orgId}:`, e instanceof Error ? e.message : e);
    }
  }
  return { sent, orgs: orgs.length };
}

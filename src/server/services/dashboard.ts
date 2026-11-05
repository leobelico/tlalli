import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Channel, Stage } from "@/generated/prisma/enums";
import { withOrg } from "@/server/db/tenant";
import { can, leadScope, type Ctx } from "@/server/auth/permissions";
import { STAGES } from "@/lib/labels";
import { toNumber } from "@/lib/format";
import { OPEN_STAGES, staleCutoff } from "@/lib/stale";

export type DashboardRange = { from: Date; to: Date };

export type CampaignRow = {
  key: string;
  label: string;
  code: string | null;
  channel: Channel | null;
  leads: number;
  sold: number;
  spend: number | null;
  costPerLead: number | null;
  costPerSale: number | null;
};

export type FunnelRow = { stage: Stage; reached: number; pctOfLeads: number; pctOfPrevious: number | null };

export type AgentRow = {
  userId: string | null;
  name: string;
  leads: number;
  sales: number;
  salesAmount: number;
  avgFirstResponseHours: number | null;
};

export type Dashboard = {
  totals: { leads: number; sold: number; lost: number; conversionPct: number; stale: number; salesAmount: number };
  campaigns: CampaignRow[];
  funnel: FunnelRow[];
  firstResponse: { avgHours: number | null; medianHours: number | null; contacted: number; waiting: number };
  agents: AgentRow[];
  scope: "all" | "mine";
};

/** Stages shown in the funnel (Perdido is an exit, not a step). */
const FUNNEL_STAGES: Stage[] = STAGES.filter((s) => s !== "PERDIDO");

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const hoursBetween = (a: Date, b: Date) => Math.max(0, (b.getTime() - a.getTime()) / 3_600_000);

/**
 * Metrics for leads CREATED within the range (cohort view), except sales, which count by sale date.
 * Asesores only see their own leads; campaign spend is only shown to admins.
 */
export async function getDashboard(ctx: Ctx, range: DashboardRange): Promise<Dashboard> {
  const viewAll = can(ctx.role, "dashboard:viewAll");
  return withOrg(ctx.orgId, async (tx) => {
    const org = await tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { staleLeadHours: true } });
    const scope = leadScope(ctx);
    const cohort: Prisma.LeadWhereInput = { ...scope, createdAt: { gte: range.from, lt: range.to } };

    const [leads, events, soldInRange, staleCount, campaigns, members] = await Promise.all([
      tx.lead.findMany({
        where: cohort,
        select: {
          id: true,
          stage: true,
          channel: true,
          campaignId: true,
          assignedToId: true,
          createdAt: true,
          firstContactAt: true,
        },
      }),
      tx.leadStageEvent.findMany({ where: { lead: cohort }, select: { leadId: true, toStage: true } }),
      tx.lead.findMany({
        where: { ...scope, stage: "VENDIDO", soldAt: { gte: range.from, lt: range.to } },
        select: { assignedToId: true, saleAmount: true, campaignId: true },
      }),
      tx.lead.count({
        where: {
          ...scope,
          stage: { in: OPEN_STAGES },
          OR: [
            { lastContactAt: { lt: staleCutoff(org.staleLeadHours) } },
            { lastContactAt: null, createdAt: { lt: staleCutoff(org.staleLeadHours) } },
          ],
        },
      }),
      tx.campaign.findMany({ select: { id: true, name: true, code: true, channel: true, spend: true } }),
      tx.membership.findMany({ include: { user: { select: { id: true, name: true } } } }),
    ]);

    // --- Totals
    const sold = leads.filter((l) => l.stage === "VENDIDO").length;
    const lost = leads.filter((l) => l.stage === "PERDIDO").length;
    const salesAmount = soldInRange.reduce((sum, l) => sum + toNumber(l.saleAmount), 0);

    // --- Campaigns (spend is the campaign's total; shown only to admins)
    const byCampaign = new Map<string, CampaignRow>();
    const campaignById = new Map(campaigns.map((c) => [c.id, c]));
    for (const l of leads) {
      const c = l.campaignId ? campaignById.get(l.campaignId) : undefined;
      const key = c ? c.id : `ch:${l.channel}`;
      let row = byCampaign.get(key);
      if (!row) {
        row = {
          key,
          label: c ? c.name : "Sin campaña",
          code: c?.code ?? null,
          channel: c?.channel ?? l.channel,
          leads: 0,
          sold: 0,
          spend: viewAll && c?.spend ? toNumber(c.spend) : null,
          costPerLead: null,
          costPerSale: null,
        };
        byCampaign.set(key, row);
      }
      row.leads++;
      if (l.stage === "VENDIDO") row.sold++;
    }
    const campaignRows = [...byCampaign.values()].map((r) => ({
      ...r,
      costPerLead: r.spend && r.leads ? r.spend / r.leads : null,
      costPerSale: r.spend && r.sold ? r.spend / r.sold : null,
    }));
    campaignRows.sort((a, b) => b.leads - a.leads);

    // --- Funnel: distinct leads that ever reached each stage
    // Skipping steps (e.g. NUEVO -> APARTADO) still counts as having passed the earlier steps.
    const order = new Map(FUNNEL_STAGES.map((s, i) => [s, i]));
    const maxStepByLead = new Map<string, number>();
    for (const e of events) {
      const idx = order.get(e.toStage);
      if (idx === undefined) continue;
      maxStepByLead.set(e.leadId, Math.max(maxStepByLead.get(e.leadId) ?? 0, idx));
    }
    const funnel: FunnelRow[] = FUNNEL_STAGES.map((stage, i) => {
      const count = [...maxStepByLead.values()].filter((m) => m >= i).length;
      return { stage, reached: count, pctOfLeads: 0, pctOfPrevious: null };
    });
    funnel.forEach((row, i) => {
      row.pctOfLeads = leads.length ? (row.reached / leads.length) * 100 : 0;
      row.pctOfPrevious = i === 0 ? null : funnel[i - 1].reached ? (row.reached / funnel[i - 1].reached) * 100 : null;
    });

    // --- First response time
    const responseHours = leads
      .filter((l) => l.firstContactAt)
      .map((l) => hoursBetween(l.createdAt, l.firstContactAt!));
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

    // --- Agents
    const nameOf = new Map(members.map((m) => [m.user.id, m.user.name]));
    const agentIds = new Set<string | null>([
      ...leads.map((l) => l.assignedToId),
      ...soldInRange.map((s) => s.assignedToId),
    ]);
    const agents: AgentRow[] = [...agentIds].map((id) => {
      const mine = leads.filter((l) => l.assignedToId === id);
      const sales = soldInRange.filter((s) => s.assignedToId === id);
      return {
        userId: id,
        name: id ? (nameOf.get(id) ?? "Ex integrante") : "Sin asignar",
        leads: mine.length,
        sales: sales.length,
        salesAmount: sales.reduce((sum, s) => sum + toNumber(s.saleAmount), 0),
        avgFirstResponseHours: avg(
          mine.filter((l) => l.firstContactAt).map((l) => hoursBetween(l.createdAt, l.firstContactAt!)),
        ),
      };
    });
    agents.sort((a, b) => b.sales - a.sales || b.salesAmount - a.salesAmount || b.leads - a.leads);

    return {
      scope: viewAll ? "all" : "mine",
      totals: {
        leads: leads.length,
        sold,
        lost,
        conversionPct: leads.length ? (sold / leads.length) * 100 : 0,
        stale: staleCount,
        salesAmount,
      },
      campaigns: campaignRows,
      funnel,
      firstResponse: {
        avgHours: avg(responseHours),
        medianHours: median(responseHours),
        contacted: responseHours.length,
        waiting: leads.length - responseHours.length,
      },
      agents,
    };
  });
}

/** Parses ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD in Mexico City time; defaults to the last 30 days. */
export function parseRange(desde?: string, hasta?: string, now = new Date()): DashboardRange {
  const ok = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const toDate = (v: string, endOfDay: boolean) => new Date(`${v}T${endOfDay ? "23:59:59.999" : "00:00:00"}-06:00`);
  const d = ok(desde);
  const h = ok(hasta);
  let from = d ? toDate(d, false) : new Date(now.getTime() - 30 * 86_400_000);
  let to = h ? new Date(toDate(h, true).getTime() + 1) : new Date(now.getTime() + 1);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    from = new Date(now.getTime() - 30 * 86_400_000);
    to = new Date(now.getTime() + 1);
  }
  if (from >= to) from = new Date(to.getTime() - 86_400_000);
  // Cap at 2 years to keep queries bounded.
  const min = new Date(to.getTime() - 2 * 365 * 86_400_000);
  if (from < min) from = min;
  return { from, to };
}

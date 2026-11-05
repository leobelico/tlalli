import "server-only";
import type { Ctx } from "@/server/auth/permissions";
import { listCampaignsForSelect } from "./campaigns";
import { listDevelopments, listUnitsForSelect } from "./inventory";
import { listActiveAgents } from "./organization";

/** Options for lead forms (campaigns, developments, units, agents). */
export async function leadFormOptions(ctx: Ctx) {
  const [campaigns, developments, units, agents] = await Promise.all([
    listCampaignsForSelect(ctx),
    listDevelopments(ctx),
    listUnitsForSelect(ctx),
    listActiveAgents(ctx),
  ]);
  return {
    campaigns,
    developments: developments.map((d) => ({ id: d.id, name: d.name })),
    units: units.map((u) => ({ ...u, price: u.price.toString() })),
    agents,
  };
}

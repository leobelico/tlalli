import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { getPipeline } from "@/server/services/pipeline";
import { listDevelopments } from "@/server/services/inventory";
import { listCampaignsForSelect } from "@/server/services/campaigns";
import { listActiveAgents } from "@/server/services/organization";
import { isStale } from "@/lib/stale";
import { timeAgo } from "@/lib/format";
import { isUuid } from "@/lib/validation/common";
import { Board, type BoardColumn } from "./board";

export const metadata: Metadata = { title: "Pipeline" };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function PipelinePage({ searchParams }: PageProps<"/app/pipeline">) {
  const { ctx } = await requireCtx();
  const sp = await searchParams;
  const isAdmin = can(ctx.role, "leads:viewAll");
  const filters = {
    developmentId: isUuid(str(sp.desarrollo)) ? str(sp.desarrollo) : undefined,
    campaignId: isUuid(str(sp.campana)) ? str(sp.campana) : undefined,
    assignedToId: isAdmin && isUuid(str(sp.asesor)) ? str(sp.asesor) : undefined,
    q: str(sp.q)?.slice(0, 80),
  };
  const [{ columns, stalePolicy, closedWindowDays }, devs, campaigns, agents] = await Promise.all([
    getPipeline(ctx, filters),
    listDevelopments(ctx),
    listCampaignsForSelect(ctx),
    listActiveAgents(ctx),
  ]);
  const agentName = Object.fromEntries(agents.map((a) => [a.id, a.name]));
  const now = new Date();
  const board: BoardColumn[] = columns.map((c) => ({
    stage: c.stage,
    count: c.count,
    cards: c.leads.map((l) => ({
      id: l.id,
      name: [l.firstName, l.lastName].filter(Boolean).join(" "),
      campaign: l.campaign?.code ?? null,
      development: l.development?.name ?? null,
      unit: l.unit?.code ?? null,
      assignee: l.assignedToId ? (agentName[l.assignedToId] ?? null) : null,
      lastTouchLabel: l.lastContactAt ? `contacto ${timeAgo(l.lastContactAt, now)}` : `alta ${timeAgo(l.createdAt, now)}`,
      stale: isStale({ ...l, hasUpcomingTask: l.tasks.length > 0 }, stalePolicy, now),
      stage: l.stage,
    })),
  }));

  return (
    <>
      <PageHeader
        title="Pipeline"
        description={`Arrastra las tarjetas entre etapas. Vendidos y perdidos de los últimos ${closedWindowDays} días. Frío = pasó el límite sin contacto de su etapa y no tiene tarea próxima (se ajusta en Configuración).`}
      />
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={filters.q} placeholder="Buscar nombre" className="input w-48" />
        <select name="desarrollo" defaultValue={filters.developmentId ?? ""} className="input w-auto" aria-label="Desarrollo">
          <option value="">Todos los desarrollos</option>
          {devs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select name="campana" defaultValue={filters.campaignId ?? ""} className="input w-auto" aria-label="Campaña">
          <option value="">Todas las campañas</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
        {isAdmin ? (
          <select name="asesor" defaultValue={filters.assignedToId ?? ""} className="input w-auto" aria-label="Asesor">
            <option value="">Todos los asesores</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        ) : null}
        <button className="btn-secondary">Filtrar</button>
      </form>
      <Board initial={board} showAssignee={isAdmin} />
    </>
  );
}

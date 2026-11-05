import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { listLeads } from "@/server/services/leads";
import { listCampaignsForSelect } from "@/server/services/campaigns";
import { listActiveAgents } from "@/server/services/organization";
import { CHANNEL_LABEL, STAGES, STAGE_LABEL, STAGE_TONE } from "@/lib/labels";
import { formatDate, timeAgo } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { isStale } from "@/lib/stale";
import { isUuid } from "@/lib/validation/common";
import { channelSchema } from "@/lib/validation/leads";
import type { Stage } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Leads" };

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

export default async function LeadsPage({ searchParams }: PageProps<"/app/leads">) {
  const { ctx } = await requireCtx();
  const sp = await searchParams;
  const isAdmin = can(ctx.role, "leads:viewAll");
  const stage = STAGES.includes(str(sp.etapa) as Stage) ? (str(sp.etapa) as Stage) : undefined;
  const asesor = str(sp.asesor);
  const filters = {
    q: str(sp.q),
    stage,
    campaignId: isUuid(str(sp.campana)) ? str(sp.campana) : undefined,
    channel: channelSchema.safeParse(str(sp.canal)).data,
    assignedToId: asesor === "none" || isUuid(asesor) ? asesor : undefined,
    staleOnly: str(sp.frios) === "1",
    page: Number(str(sp.pagina) ?? 1) || 1,
  };
  const [{ leads, total, page, pages, staleLeadHours }, campaigns, agents] = await Promise.all([
    listLeads(ctx, filters),
    listCampaignsForSelect(ctx),
    listActiveAgents(ctx),
  ]);
  const agentName = Object.fromEntries(agents.map((a) => [a.id, a.name]));
  const qs = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, str(v)])), ...patch })) {
      if (v) params.set(k, v);
    }
    return `?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Leads"
        description={`${total} ${total === 1 ? "lead" : "leads"}${isAdmin ? "" : " asignados a ti"}.`}
        actions={
          <>
            {can(ctx.role, "leads:import") ? (
              <LinkButton href="/app/leads/importar" variant="secondary">
                Importar CSV
              </LinkButton>
            ) : null}
            <LinkButton href="/app/leads/nuevo">Nuevo lead</LinkButton>
          </>
        }
      />
      {str(sp.eliminado) ? (
        <p className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">Lead eliminado.</p>
      ) : null}

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" method="get">
        <input name="q" defaultValue={filters.q} placeholder="Buscar nombre, teléfono o correo" className="input lg:col-span-2" />
        <select name="etapa" defaultValue={stage ?? ""} className="input" aria-label="Etapa">
          <option value="">Todas las etapas</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
        <select name="campana" defaultValue={filters.campaignId ?? ""} className="input" aria-label="Campaña">
          <option value="">Todas las campañas</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
        {isAdmin ? (
          <select name="asesor" defaultValue={asesor ?? ""} className="input" aria-label="Asesor">
            <option value="">Todos los asesores</option>
            <option value="none">Sin asignar</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="hidden lg:block" />
        )}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <input type="checkbox" name="frios" value="1" defaultChecked={filters.staleOnly} /> Solo fríos
          </label>
          <button className="btn-secondary py-1.5">Filtrar</button>
        </div>
      </form>

      {leads.length === 0 ? (
        <EmptyState title="No hay leads con estos filtros" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Origen</th>
                <th>Etapa</th>
                {isAdmin ? <th>Asesor</th> : null}
                <th>Último contacto</th>
                <th>Alta</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const stale = isStale(l, staleLeadHours);
                return (
                  <tr key={l.id} className={stale ? "bg-red-50/50" : undefined}>
                    <td>
                      <Link href={`/app/leads/${l.id}`} className="font-medium hover:text-brand-700 hover:underline">
                        {l.firstName} {l.lastName}
                      </Link>
                      {l.development ? <p className="text-xs text-stone-500">{l.development.name}</p> : null}
                    </td>
                    <td className="whitespace-nowrap tabular-nums">{formatPhone(l.phone)}</td>
                    <td>
                      {l.campaign ? (
                        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">{l.campaign.code}</code>
                      ) : (
                        <span className="text-xs text-stone-600">{CHANNEL_LABEL[l.channel]}</span>
                      )}
                    </td>
                    <td>
                      <Badge tone={STAGE_TONE[l.stage]}>{STAGE_LABEL[l.stage]}</Badge>
                    </td>
                    {isAdmin ? (
                      <td className="text-stone-600">
                        {l.assignedToId ? (agentName[l.assignedToId] ?? "—") : <Badge tone="amber">Sin asignar</Badge>}
                      </td>
                    ) : null}
                    <td className="whitespace-nowrap">
                      {stale ? <Badge tone="red">Frío · {timeAgo(l.lastContactAt ?? l.createdAt)}</Badge> : timeAgo(l.lastContactAt)}
                    </td>
                    <td className="whitespace-nowrap text-stone-500">{formatDate(l.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs({ pagina: String(page - 1) })} className="btn-secondary py-1">← Anterior</Link> : <span />}
          <span className="text-stone-500">
            Página {page} de {pages}
          </span>
          {page < pages ? <Link href={qs({ pagina: String(page + 1) })} className="btn-secondary py-1">Siguiente →</Link> : <span />}
        </div>
      ) : null}
    </>
  );
}

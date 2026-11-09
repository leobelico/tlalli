import Link from "next/link";
import type { Metadata } from "next";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { AiBadge, InsightsPanel } from "@/components/ai-panels";
import { getAiStatus } from "@/server/services/ai";
import { PLANS } from "@/lib/plans";
import { getDashboard, parseRange } from "@/server/services/dashboard";
import { CHANNEL_LABEL, STAGE_LABEL } from "@/lib/labels";
import { formatHours, formatMoney, toDateTimeLocal } from "@/lib/format";

export const metadata: Metadata = { title: "Inicio" };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const pct = (n: number) => `${n.toFixed(n >= 10 || n === 0 ? 0 : 1)}%`;

export default async function AppHome({ searchParams }: PageProps<"/app">) {
  const { ctx, session } = await requireCtx();
  const sp = await searchParams;
  const range = parseRange(str(sp.desde), str(sp.hasta));
  const [d, ai] = await Promise.all([getDashboard(ctx, range), getAiStatus(ctx)]);
  const isAdmin = d.scope === "all";
  const fromValue = toDateTimeLocal(range.from).slice(0, 10);
  const toValue = toDateTimeLocal(new Date(range.to.getTime() - 1)).slice(0, 10);
  const maxCampaign = Math.max(1, ...d.campaigns.map((c) => c.leads));
  const maxAgent = Math.max(1, ...d.agents.map((a) => a.salesAmount));

  return (
    <>
      {str(sp.error) === "permiso" ? (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No tienes permiso para entrar a esa sección. Si la necesitas, pídesela a tu administrador.
        </p>
      ) : null}
      <PageHeader
        title={`Hola, ${session.user.name.split(" ")[0]}`}
        description={isAdmin ? `Resumen de ${session.active!.organization.name}.` : "Resumen de tus leads."}
        actions={
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-stone-600">
              Desde
              <input type="date" name="desde" defaultValue={fromValue} className="input mt-0.5 py-1.5" />
            </label>
            <label className="text-xs text-stone-600">
              Hasta
              <input type="date" name="hasta" defaultValue={toValue} className="input mt-0.5 py-1.5" />
            </label>
            <button className="btn-secondary">Aplicar</button>
          </form>
        }
      />
      <p className="-mt-3 mb-5 text-xs text-stone-500">
        Leads creados en el periodo. Las ventas cuentan por fecha de venta.
      </p>

      <section aria-label="Indicadores" className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Leads nuevos" value={String(d.totals.leads)} />
        <Kpi label="Ventas" value={String(d.totals.sold)} hint={formatMoney(d.totals.salesAmount, false)} />
        <Kpi label="Conversión a venta" value={pct(d.totals.conversionPct)} hint={`${d.totals.lost} perdidos`} />
        <Kpi
          label="Primera respuesta"
          value={formatHours(d.firstResponse.avgHours)}
          hint={
            d.firstResponse.medianHours !== null
              ? `mediana ${formatHours(d.firstResponse.medianHours)} · ${d.firstResponse.waiting} sin contactar`
              : `${d.firstResponse.waiting} sin contactar`
          }
        />
        <Kpi label="Leads fríos ahora" value={String(d.totals.stale)} tone={d.totals.stale ? "alert" : undefined} href="/app/leads?frios=1" />
      </section>

      {isAdmin ? (
        <Card className="mb-6 border-ink/30">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            Análisis de tu operación <AiBadge />
          </h2>
          {ai.enabled ? (
            <>
              <p className="mb-3 text-sm text-stone-600">La IA lee las métricas de este periodo y te dice qué funciona, dónde se pierden prospectos y qué hacer.</p>
              <InsightsPanel desde={fromValue} hasta={toValue} used={ai.used} limit={ai.limit} />
            </>
          ) : (
            <p className="text-sm text-stone-600">
              Con el plan {PLANS.ELITE.name}, la IA analiza tus campañas, tu embudo y a tu equipo, y te propone tres acciones cada semana.{" "}
              <Link href="/precios" className="text-brand-700 underline">
                Ver el plan
              </Link>
            </p>
          )}
        </Card>
      ) : null}

      {d.totals.leads === 0 && d.totals.sold === 0 ? (
        <EmptyState title="Sin datos en este periodo">Captura o importa leads, o amplía el rango de fechas.</EmptyState>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <h2 className="mb-1 font-semibold">Leads por campaña</h2>
            <p className="mb-4 text-xs text-stone-500">
              {isAdmin ? "Costo por lead = gasto de la campaña ÷ leads del periodo (captura el gasto en Campañas)." : "Solo tus leads."}
            </p>
            <ul className="space-y-3">
              {d.campaigns.map((c) => (
                <li key={c.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{c.label}</span>{" "}
                      <span className="text-xs text-stone-500">
                        {c.code ?? (c.channel ? CHANNEL_LABEL[c.channel] : "")}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <strong>{c.leads}</strong> <span className="text-xs text-stone-500">leads · {c.sold} {c.sold === 1 ? "venta" : "ventas"}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(c.leads / maxCampaign) * 100}%` }} />
                  </div>
                  {isAdmin ? (
                    <p className="mt-0.5 text-xs text-stone-500">
                      {c.spend ? `Gasto ${formatMoney(c.spend, false)} · ` : "Sin gasto capturado · "}
                      {c.costPerLead ? `CPL ${formatMoney(c.costPerLead, false)}` : "CPL —"}
                      {c.costPerSale ? ` · costo por venta ${formatMoney(c.costPerSale, false)}` : ""}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="mb-1 font-semibold">Conversión por etapa</h2>
            <p className="mb-4 text-xs text-stone-500">Leads del periodo que llegaron a cada etapa, y % respecto a la etapa anterior.</p>
            <ol className="space-y-2.5">
              {d.funnel.map((f) => (
                <li key={f.stage}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{STAGE_LABEL[f.stage]}</span>
                    <span className="tabular-nums">
                      <strong>{f.reached}</strong>{" "}
                      <span className="text-xs text-stone-500">
                        {pct(f.pctOfLeads)} del total{f.pctOfPrevious !== null ? ` · ${pct(f.pctOfPrevious)} de la anterior` : ""}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${f.pctOfLeads}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="xl:col-span-2">
            <h2 className="mb-3 font-semibold">{isAdmin ? "Ventas por asesor" : "Mis resultados"}</h2>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Asesor</th>
                    <th className="text-right">Leads</th>
                    <th className="text-right">Ventas</th>
                    <th>Monto vendido</th>
                    <th className="text-right">1ª respuesta (prom.)</th>
                  </tr>
                </thead>
                <tbody>
                  {d.agents.map((a) => (
                    <tr key={a.userId ?? "none"}>
                      <td className="font-medium">{a.name}</td>
                      <td className="text-right tabular-nums">{a.leads}</td>
                      <td className="text-right tabular-nums">{a.sales}</td>
                      <td className="min-w-48">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(a.salesAmount / maxAgent) * 100}%` }} />
                          </div>
                          <span className="w-28 text-right text-xs tabular-nums">{formatMoney(a.salesAmount, false)}</span>
                        </div>
                      </td>
                      <td className="text-right tabular-nums">{formatHours(a.avgFirstResponseHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function Kpi({ label, value, hint, tone, href }: { label: string; value: string; hint?: string; tone?: "alert"; href?: string }) {
  const body = (
    <div className={`card h-full p-4 ${tone === "alert" ? "border-red-200 bg-red-50" : ""}`}>
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${tone === "alert" ? "text-red-700" : ""}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

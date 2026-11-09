import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { requireCtx } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { NotFoundError } from "@/server/errors";
import { getLeadDetail } from "@/server/services/leads";
import { leadFormOptions } from "@/server/services/lead-options";
import { ACTIVITY_LABEL, CHANNEL_LABEL, SOURCE_LABEL, LOST_REASON_LABEL } from "@/lib/labels";
import { formatDateTime, formatMoney, timeAgo } from "@/lib/format";
import { formatPhone, waDigits } from "@/lib/phone";
import { hoursWithoutContact, isStale, staleHoursFor } from "@/lib/stale";
import { isUuid } from "@/lib/validation/common";
import { LeadFields } from "../lead-fields";
import { StageControl } from "../../pipeline/stage-control";
import { TaskForm } from "../../tareas/task-form";
import { TaskItem } from "../../tareas/task-item";
import { WhatsAppPanel } from "./whatsapp-panel";
import { AiBadge, LeadAssistant } from "@/components/ai-panels";
import { getAiStatus } from "@/server/services/ai";
import { PLANS } from "@/lib/plans";
import { consentAction } from "./whatsapp-actions";
import { getWhatsAppProvider } from "@/server/whatsapp/providers";
import { addActivityAction, deleteLeadAction, updateLeadAction } from "../actions";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadDetailPage({ params, searchParams }: PageProps<"/app/leads/[id]">) {
  const { ctx, session } = await requireCtx();
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  let detail;
  try {
    detail = await getLeadDetail(ctx, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const { lead, users, stalePolicy } = detail;
  const [options, ai] = await Promise.all([leadFormOptions(ctx), getAiStatus(ctx)]);
  const now = new Date();
  const stale = isStale({ ...lead, hasUpcomingTask: lead.tasks.some((t) => !t.completedAt && t.dueAt > now) }, stalePolicy, now);
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/app/leads" className="text-brand-700 hover:underline">
          ← Leads
        </Link>
      </p>
      {sp.duplicado ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Ya existía un lead con ese teléfono; registramos el nuevo contacto en su historial en lugar de duplicarlo.
        </p>
      ) : null}
      <PageHeader
        title={fullName}
        description={[formatPhone(lead.phone), lead.email].filter(Boolean).join(" · ")}
        actions={
          <>
            <Link className="btn-secondary" href={`/app/cotizador?lead=${lead.id}${lead.unitId ? `&unidad=${lead.unitId}` : ""}`}>
              Cotizar
            </Link>
            <a className="btn-secondary" href={`tel:${lead.phone}`}>
              Llamar
            </a>
            <a className="btn-secondary" href={`https://wa.me/${waDigits(lead.phone)}`} target="_blank" rel="noreferrer">
              Abrir WhatsApp
            </a>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StageControl leadId={lead.id} name={fullName} stage={lead.stage} />
        {lead.stage === "PERDIDO" && lead.lostReason ? (
          <span className="text-sm text-stone-600">Motivo: {LOST_REASON_LABEL[lead.lostReason]}</span>
        ) : null}
        {stale ? (
          <Badge tone="red">
            Sin contacto desde hace {Math.floor(hoursWithoutContact(lead))} h (límite de la etapa: {staleHoursFor(lead.stage, stalePolicy)} h)
          </Badge>
        ) : null}
        <span className="text-sm text-stone-500">
          Asesor: {lead.assignedToId ? (users[lead.assignedToId] ?? "—") : "sin asignar"}
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-1 flex items-center gap-2 font-semibold">
              Asistente <AiBadge />
            </h2>
            {ai.enabled ? (
              <>
                <p className="mb-3 text-sm text-stone-600">Resume el caso, mide qué tan cerca está de comprar y sugiere qué hacer y qué escribirle.</p>
                <LeadAssistant leadId={lead.id} used={ai.used} limit={ai.limit} />
              </>
            ) : (
              <p className="text-sm text-stone-600">
                El asistente de IA resume cada lead, sugiere el siguiente paso y redacta borradores de WhatsApp. Está incluido en el plan{" "}
                <Link href="/precios" className="text-brand-700 underline">
                  {PLANS.ELITE.name}
                </Link>
                .
              </p>
            )}
          </Card>

          <WhatsAppPanel
            lead={lead}
            messages={lead.messages}
            providerName={getWhatsAppProvider().name}
            context={{
              development: lead.development?.name ?? "nuestros desarrollos",
              agentName: (lead.assignedToId && users[lead.assignedToId]) || session.user.name,
              orgName: session.active!.organization.name,
            }}
          />

          <Card>
            <h2 className="mb-3 font-semibold">Registrar actividad</h2>
            <ActionForm action={addActivityAction} resetOnSuccess className="space-y-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <div className="flex flex-wrap gap-3">
                {(["LLAMADA", "NOTA", "VISITA", "CORREO"] as const).map((t, i) => (
                  <label key={t} className="flex items-center gap-1.5 text-sm">
                    <input type="radio" name="type" value={t} defaultChecked={i === 0} /> {ACTIVITY_LABEL[t]}
                  </label>
                ))}
              </div>
              <Field label="Detalle" name="body">
                <textarea id="body" name="body" rows={3} className="input" placeholder="¿Qué platicaron? ¿Cuál es el siguiente paso?" />
              </Field>
              <SubmitButton>Guardar</SubmitButton>
              <p className="text-xs text-stone-500">Llamadas, visitas y correos cuentan como contacto y reinician la alerta de lead frío.</p>
            </ActionForm>
          </Card>

          <Card>
            <h2 className="mb-1 font-semibold">Tareas y recordatorios</h2>
            {lead.tasks.length ? (
              <ul className="mb-4 divide-y divide-stone-100">
                {lead.tasks.map((t) => (
                  <TaskItem key={t.id} task={{ ...t, assignee: users[t.assignedToId] }} />
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-stone-500">Sin tareas. Agenda el siguiente paso para no perder al lead.</p>
            )}
            <TaskForm
              leadId={lead.id}
              agents={can(ctx.role, "leads:assign") ? options.agents : undefined}
              defaultAssignee={null}
            />
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Historial</h2>
            <ol className="space-y-4">
              {lead.activities.map((a) => (
                <li key={a.id} className="border-l-2 border-stone-200 pl-4">
                  <p className="text-xs text-stone-500">
                    <span className="font-medium text-stone-700">{ACTIVITY_LABEL[a.type]}</span>
                    {a.userId ? ` · ${users[a.userId] ?? ""}` : ""} · {formatDateTime(a.createdAt)}
                  </p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{a.body}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold">Origen</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-stone-500">Campaña</dt>
              <dd>{lead.campaign ? `${lead.campaign.name} (${lead.campaign.code})` : "—"}</dd>
              <dt className="text-stone-500">Canal</dt>
              <dd>{CHANNEL_LABEL[lead.channel]}</dd>
              <dt className="text-stone-500">Entrada</dt>
              <dd>{SOURCE_LABEL[lead.source]}</dd>
              <dt className="text-stone-500">Alta</dt>
              <dd>{formatDateTime(lead.createdAt)}</dd>
              <dt className="text-stone-500">1er contacto</dt>
              <dd>{lead.firstContactAt ? formatDateTime(lead.firstContactAt) : "Pendiente"}</dd>
              <dt className="text-stone-500">Último</dt>
              <dd>{timeAgo(lead.lastContactAt)}</dd>
              <dt className="text-stone-500">Interés</dt>
              <dd>
                {lead.development?.name ?? "—"}
                {lead.unit ? ` · ${lead.unit.code} (${formatMoney(lead.unit.price, false)})` : ""}
              </dd>
              {lead.budget ? (
                <>
                  <dt className="text-stone-500">Presupuesto</dt>
                  <dd>{formatMoney(lead.budget, false)}</dd>
                </>
              ) : null}
            </dl>
          </Card>

          <Card>
            <details>
              <summary className="cursor-pointer font-semibold">Editar datos</summary>
              <ActionForm action={updateLeadAction} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={lead.id} />
                <LeadFields
                  options={options}
                  canAssign={can(ctx.role, "leads:assign")}
                  initial={{ ...lead, budget: lead.budget?.toString() ?? null }}
                />
                <SubmitButton>Guardar</SubmitButton>
              </ActionForm>
            </details>
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold">Consentimiento (LFPDPPP)</h2>
            {lead.consents.length === 0 ? (
              <p className="text-sm text-amber-700">Sin registro de consentimiento.</p>
            ) : (
              <ul className="space-y-1 text-xs text-stone-600">
                {lead.consents.map((c) => (
                  <li key={c.id}>
                    {c.granted ? "✔ Aceptó" : "✘ Revocó"} aviso v{c.privacyNotice?.version ?? "?"} · {SOURCE_LABEL[c.source]} ·{" "}
                    {formatDateTime(c.createdAt)}
                    {c.ip ? ` · IP ${c.ip}` : ""}
                  </li>
                ))}
              </ul>
            )}
            {lead.consentAt ? (
              <form action={consentAction} className="mt-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="granted" value="0" />
                <button className="text-xs text-stone-500 underline hover:text-red-700">Registrar revocación del consentimiento</button>
              </form>
            ) : null}
            {can(ctx.role, "leads:delete") ? (
              <form action={deleteLeadAction} className="mt-4 border-t border-stone-100 pt-3">
                <input type="hidden" name="id" value={lead.id} />
                <p className="mb-2 text-xs text-stone-500">
                  Si la persona ejerce su derecho de cancelación (ARCO), elimina sus datos de forma permanente.
                </p>
                <ConfirmButton
                  message="¿Eliminar permanentemente a este lead y todo su historial? No se puede deshacer."
                  className="btn-ghost px-2 py-1 text-xs text-red-700"
                >
                  Eliminar lead y su historial
                </ConfirmButton>
              </form>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}

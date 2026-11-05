import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { listCampaigns } from "@/server/services/campaigns";
import { listDevelopments } from "@/server/services/inventory";
import { getOrganization } from "@/server/services/organization";
import { CHANNEL_LABEL } from "@/lib/labels";
import { formatDate, formatMoney, toNumber } from "@/lib/format";
import { CampaignFields } from "./campaign-fields";
import { createCampaignAction, updateCampaignAction } from "./actions";

export const metadata: Metadata = { title: "Campañas" };

const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);

export default async function CampaignsPage() {
  const { ctx } = await requireCtx("campaigns:write");
  const [campaigns, devs, org] = await Promise.all([listCampaigns(ctx), listDevelopments(ctx), getOrganization(ctx)]);
  const appUrl = process.env.APP_URL ?? "";

  return (
    <>
      <PageHeader
        title="Campañas"
        description="Cada campaña tiene un código único para saber de dónde llegó cada lead y cuánto te cuesta."
      />
      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Nueva campaña</h2>
        <ActionForm action={createCampaignAction} resetOnSuccess className="space-y-3">
          <CampaignFields developments={devs} />
          <SubmitButton>Crear campaña</SubmitButton>
        </ActionForm>
      </Card>

      {campaigns.length === 0 ? (
        <EmptyState title="Aún no hay campañas">Crea una por cada anuncio: spot de radio, espectacular, campaña de Facebook…</EmptyState>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const spend = toNumber(c.spend);
            const cpl = spend && c.leadCount ? spend / c.leadCount : null;
            const formUrl = `${appUrl}/f/${org.slug}?c=${encodeURIComponent(c.code)}`;
            return (
              <Card key={c.id} className="p-0">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
                  <div className="min-w-48 flex-1">
                    <p className="font-semibold">
                      {c.name} {!c.active ? <Badge>Inactiva</Badge> : null}
                    </p>
                    <p className="text-xs text-stone-500">
                      <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-stone-800">{c.code}</code> ·{" "}
                      {CHANNEL_LABEL[c.channel]}
                      {c.development ? ` · ${c.development.name}` : ""}
                      {c.startDate ? ` · ${formatDate(c.startDate)} – ${formatDate(c.endDate)}` : ""}
                    </p>
                  </div>
                  <Stat label="Leads" value={String(c.leadCount)} href={`/app/leads?campana=${c.id}`} />
                  <Stat label="Ventas" value={String(c.soldCount)} />
                  <Stat label="Gasto" value={spend ? formatMoney(spend, false) : "—"} />
                  <Stat label="Costo por lead" value={cpl ? formatMoney(cpl, false) : "—"} />
                </div>
                <details className="border-t border-stone-100 px-5 py-3">
                  <summary className="cursor-pointer text-sm text-brand-700">Editar y liga del formulario</summary>
                  <p className="mt-3 text-xs text-stone-600">
                    Formulario público con esta campaña (útil para QR en espectaculares y volantes):{" "}
                    <a href={formUrl} target="_blank" rel="noreferrer" className="break-all text-brand-700 underline">
                      {formUrl}
                    </a>
                  </p>
                  <ActionForm action={updateCampaignAction} className="mt-3 space-y-3">
                    <input type="hidden" name="id" value={c.id} />
                    <CampaignFields
                      idPrefix={`c-${c.id}-`}
                      developments={devs}
                      initial={{
                        name: c.name,
                        channel: c.channel,
                        code: c.code,
                        spend: c.spend?.toString(),
                        startDate: isoDate(c.startDate),
                        endDate: isoDate(c.endDate),
                        developmentId: c.developmentId ?? undefined,
                      }}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="active" defaultChecked={c.active} /> Activa
                    </label>
                    <SubmitButton>Guardar cambios</SubmitButton>
                  </ActionForm>
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="min-w-20 hover:text-brand-700">
      {inner}
    </Link>
  ) : (
    <div className="min-w-20">{inner}</div>
  );
}

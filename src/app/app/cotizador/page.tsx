import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { listUnitsForSelect } from "@/server/services/inventory";
import { listLeads } from "@/server/services/leads";
import { isUuid } from "@/lib/validation/common";
import { formatMoney, toNumber } from "@/lib/format";
import { UNIT_STATUS_LABEL } from "@/lib/labels";
import { QuoteForm } from "./quote-form";

export const metadata: Metadata = { title: "Cotizador" };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function QuoterPage({ searchParams }: PageProps<"/app/cotizador">) {
  const { ctx } = await requireCtx("quotes:create");
  const sp = await searchParams;
  const [units, { leads }] = await Promise.all([listUnitsForSelect(ctx), listLeads(ctx, {})]);
  const quotable = units.filter((u) => u.status !== "VENDIDO");
  return (
    <>
      <PageHeader title="Cotizador" description="Enganche, mensualidades y plazo para una unidad. Genera un PDF para enviar al cliente." />
      <QuoteForm
        units={quotable.map((u) => ({
          id: u.id,
          price: toNumber(u.price),
          label: `${u.development.name} · ${u.code} · ${formatMoney(u.price, false)}${u.status !== "DISPONIBLE" ? ` (${UNIT_STATUS_LABEL[u.status]})` : ""}`,
        }))}
        leads={leads.map((l) => ({ id: l.id, label: [l.firstName, l.lastName].filter(Boolean).join(" ") }))}
        initialUnitId={isUuid(str(sp.unidad)) ? str(sp.unidad) : undefined}
        initialLeadId={isUuid(str(sp.lead)) ? str(sp.lead) : undefined}
      />
    </>
  );
}

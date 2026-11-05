import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { NotFoundError } from "@/server/errors";
import { getQuote } from "@/server/services/quotes";
import { isUuid } from "@/lib/validation/common";
import { formatMoney, toNumber } from "@/lib/format";
import { waDigits } from "@/lib/phone";

export const metadata: Metadata = { title: "Cotización" };

export default async function QuotePage({ params }: PageProps<"/app/cotizador/[id]">) {
  const { ctx } = await requireCtx();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  let detail;
  try {
    detail = await getQuote(ctx, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const { quote } = detail;
  const pdfUrl = `/api/quotes/${quote.id}/pdf`;
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={quote.lead ? `/app/leads/${quote.lead.id}` : "/app/cotizador"} className="text-brand-700 hover:underline">
          ← {quote.lead ? "Volver al lead" : "Cotizador"}
        </Link>
      </p>
      <PageHeader
        title={`Cotización ${quote.unit.code}`}
        description={`${quote.unit.development.name}${quote.lead ? ` · ${quote.lead.firstName} ${quote.lead.lastName ?? ""}` : ""}`}
        actions={
          <>
            <a href={pdfUrl} target="_blank" className="btn-primary">
              Abrir PDF
            </a>
            {quote.lead ? (
              <a
                className="btn-secondary"
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/${waDigits(quote.lead.phone)}?text=${encodeURIComponent(`Hola ${quote.lead.firstName}, te comparto tu cotización de ${quote.unit.code}.`)}`}
              >
                Enviar por WhatsApp
              </a>
            ) : null}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <dl className="space-y-2 text-sm">
            {[
              ["Precio de lista", formatMoney(quote.price)],
              ...(toNumber(quote.discount) ? [["Descuento", formatMoney(quote.discount)]] : []),
              [`Enganche (${toNumber(quote.downPaymentPct)}%)`, formatMoney(quote.downPayment)],
              ["Plazo", quote.months ? `${quote.months} meses` : "Contado"],
              ["Tasa anual", toNumber(quote.annualRatePct) ? `${toNumber(quote.annualRatePct)}%` : "Sin intereses"],
              ["Mensualidad", formatMoney(quote.monthlyPayment)],
              ["Total a pagar", formatMoney(quote.totalPaid)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-stone-600">{k}</dt>
                <dd className="font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <iframe src={pdfUrl} title="Vista previa del PDF" className="h-[720px] w-full rounded-xl border border-stone-200 bg-white" />
      </div>
    </>
  );
}

import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withOrg } from "@/server/db/tenant";
import { assertCan, can, leadScope, type Ctx } from "@/server/auth/permissions";
import { DomainError, NotFoundError } from "@/server/errors";
import { calculateQuote, QuoteInputError } from "@/lib/quote";
import { toNumber } from "@/lib/format";
import { requireLead } from "./leads";
import { changeStage } from "./pipeline";

export type CreateQuoteInput = {
  unitId: string;
  leadId?: string;
  discount?: number;
  downPaymentPct: number;
  months: number;
  annualRatePct?: number;
};

const EARLY_STAGES = ["NUEVO", "CONTACTADO", "CITA_AGENDADA", "VISITA_REALIZADA"];

export async function createQuote(ctx: Ctx, input: CreateQuoteInput) {
  assertCan(ctx, "quotes:create");
  const quote = await withOrg(ctx.orgId, async (tx) => {
    const unit = await tx.unit.findUnique({ where: { id: input.unitId } });
    if (!unit) throw new NotFoundError("Unidad no encontrada.");
    if (unit.status === "VENDIDO") throw new DomainError(`La unidad ${unit.code} ya está vendida.`);
    if (input.leadId) await requireLead(tx, ctx, input.leadId);

    let calc;
    try {
      calc = calculateQuote({
        price: toNumber(unit.price),
        discount: input.discount,
        downPaymentPct: input.downPaymentPct,
        months: input.months,
        annualRatePct: input.annualRatePct,
      });
    } catch (e) {
      if (e instanceof QuoteInputError) throw new DomainError(e.message);
      throw e;
    }
    const q = await tx.quote.create({
      data: {
        organizationId: ctx.orgId,
        unitId: unit.id,
        leadId: input.leadId,
        createdById: ctx.userId,
        price: calc.price,
        discount: calc.discount,
        downPaymentPct: calc.downPaymentPct,
        downPayment: calc.downPayment,
        months: calc.months,
        annualRatePct: calc.annualRatePct,
        monthlyPayment: calc.monthlyPayment,
        totalPaid: calc.totalPaid,
      },
    });
    if (input.leadId) {
      await tx.activity.create({
        data: {
          organizationId: ctx.orgId,
          leadId: input.leadId,
          userId: ctx.userId,
          type: "SISTEMA",
          body: `Cotización de ${unit.code}: enganche ${calc.downPaymentPct}% y ${calc.months} mensualidades de $${calc.monthlyPayment.toLocaleString("es-MX", { minimumFractionDigits: 2 })}.`,
        },
      });
    }
    return q;
  });

  // Quoting moves an early-stage lead to "Cotización".
  if (input.leadId) {
    const lead = await withOrg(ctx.orgId, (tx) => tx.lead.findUnique({ where: { id: input.leadId }, select: { stage: true } }));
    if (lead && EARLY_STAGES.includes(lead.stage)) await changeStage(ctx, input.leadId, { stage: "COTIZACION" });
  }
  return quote;
}

/** Full quote with unit, development, lead and org data (for the summary page and PDF). */
export async function getQuote(ctx: Ctx, quoteId: string) {
  return withOrg(ctx.orgId, async (tx) => {
    const where: Prisma.QuoteWhereInput = { id: quoteId };
    if (!can(ctx.role, "leads:viewAll")) {
      // Asesores: their own quotes or quotes for leads assigned to them.
      where.OR = [{ createdById: ctx.userId }, { lead: leadScope(ctx) }];
    }
    const quote = await tx.quote.findFirst({
      where,
      include: {
        unit: { include: { development: true } },
        lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      },
    });
    if (!quote) throw new NotFoundError("Cotización no encontrada.");
    const [org, author] = await Promise.all([
      tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { name: true, waDisplayPhone: true } }),
      tx.user.findUnique({ where: { id: quote.createdById }, select: { name: true, email: true } }),
    ]);
    return { quote, org, author };
  });
}

export type QuoteDetail = Awaited<ReturnType<typeof getQuote>>;

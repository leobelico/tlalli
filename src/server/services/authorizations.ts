import "server-only";
import type { AuthorizationKind, AuthorizationStatus } from "@/generated/prisma/enums";
import { withOrg } from "@/server/db/tenant";
import { assertCan, can, type Ctx } from "@/server/auth/permissions";
import { AuthorizationPendingError, DomainError, NotFoundError } from "@/server/errors";
import { sendEmail } from "@/server/notify/email";
import { authorizationDecidedEmail, authorizationRequestedEmail } from "@/server/notify/templates";

/** JSON with sorted keys and no undefined: Postgres JSONB does not keep the key order we wrote. */
const canonical = (v: unknown): string =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val as Record<string, unknown>).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)))
      : val,
  );

const appUrl = () => (process.env.APP_URL ?? "").replace(/\/$/, "");

export type QuotePayload = {
  unitId: string;
  leadId?: string;
  discount?: number;
  downPaymentPct: number;
  months: number;
  annualRatePct?: number;
};
export type SalePayload = { leadId: string; saleAmount: number };

/**
 * Records that an asesor needs an admin's OK and tells the admins by email. Returns the error to
 * throw (it is a normal outcome, not a failure). An identical pending request is reused, so
 * retrying does not pile up duplicates or emails.
 */
export async function requestAuthorization(
  ctx: Ctx,
  p: { kind: AuthorizationKind; leadId?: string; unitId?: string; summary: string; payload: QuotePayload | SalePayload; message: string },
): Promise<AuthorizationPendingError> {
  const payloadJson = canonical(p.payload);
  const { created, requesterName } = await withOrg(ctx.orgId, async (tx) => {
    const same = await tx.authorizationRequest.findMany({
      where: { kind: p.kind, status: "PENDIENTE", requestedById: ctx.userId, leadId: p.leadId ?? null, unitId: p.unitId ?? null },
      select: { payload: true },
    });
    const user = await tx.user.findUnique({ where: { id: ctx.userId }, select: { name: true } });
    if (same.some((r) => canonical(r.payload) === payloadJson)) return { created: false, requesterName: user?.name ?? "Un asesor" };
    await tx.authorizationRequest.create({
      data: {
        organizationId: ctx.orgId,
        kind: p.kind,
        requestedById: ctx.userId,
        leadId: p.leadId,
        unitId: p.unitId,
        summary: p.summary,
        payload: p.payload as object,
      },
    });
    return { created: true, requesterName: user?.name ?? "Un asesor" };
  });
  if (created) await notifyAdmins(ctx, requesterName, p.summary);
  return new AuthorizationPendingError(p.message);
}

async function notifyAdmins(ctx: Ctx, requesterName: string, summary: string) {
  try {
    const admins = await withOrg(ctx.orgId, (tx) =>
      tx.membership.findMany({ where: { active: true, role: "ADMIN" }, select: { user: { select: { email: true } } } }),
    );
    for (const a of admins) {
      await sendEmail({ to: a.user.email, ...authorizationRequestedEmail({ requester: requesterName, summary, link: `${appUrl()}/app/autorizaciones` }) });
    }
  } catch (e) {
    console.error("notifyAdmins:", e instanceof Error ? e.message : e);
  }
}

/** Admins see every request of the organization; asesores only their own. */
export async function listAuthorizationRequests(ctx: Ctx) {
  return withOrg(ctx.orgId, async (tx) => {
    const rows = await tx.authorizationRequest.findMany({
      where: can(ctx.role, "pricing:override") ? {} : { requestedById: ctx.userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    const ids = [...new Set(rows.flatMap((r) => [r.requestedById, r.decidedById].filter((x): x is string => !!x)))];
    const users = await tx.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    const name = Object.fromEntries(users.map((u) => [u.id, u.name]));
    return rows.map((r) => ({ ...r, requestedByName: name[r.requestedById] ?? "—", decidedByName: r.decidedById ? (name[r.decidedById] ?? "—") : null }));
  });
}

export async function countPendingAuthorizations(ctx: Ctx): Promise<number> {
  return withOrg(ctx.orgId, (tx) =>
    tx.authorizationRequest.count({
      where: { status: "PENDIENTE", ...(can(ctx.role, "pricing:override") ? {} : { requestedById: ctx.userId }) },
    }),
  );
}

/**
 * Approves or rejects. Approving runs the original action as the admin (quote on behalf of the asesor,
 * or the sale). The request is claimed first (PENDIENTE -> decided) so a double click cannot run it
 * twice; if the action fails (e.g. the unit was sold meanwhile) the claim is released.
 */
export async function decideAuthorization(ctx: Ctx, id: string, d: { approve: boolean; note?: string }) {
  assertCan(ctx, "pricing:override");
  const req = await withOrg(ctx.orgId, (tx) => tx.authorizationRequest.findUnique({ where: { id } }));
  if (!req) throw new NotFoundError("Solicitud no encontrada.");
  if (req.status !== "PENDIENTE") throw new DomainError("Esa solicitud ya fue resuelta.");
  const note = d.note?.trim().slice(0, 500) || null;
  const status: AuthorizationStatus = d.approve ? "APROBADA" : "RECHAZADA";

  const claimed = await withOrg(ctx.orgId, (tx) =>
    tx.authorizationRequest.updateMany({
      where: { id, status: "PENDIENTE" },
      data: { status, decidedById: ctx.userId, decidedAt: new Date(), decisionNote: note },
    }),
  );
  if (claimed.count === 0) throw new DomainError("Esa solicitud ya fue resuelta.");

  let quoteId: string | null = null;
  try {
    if (d.approve) {
      // Imported lazily: quotes/pipeline import this module to create requests.
      if (req.kind === "DESCUENTO") {
        const { createQuote } = await import("./quotes");
        quoteId = (await createQuote(ctx, req.payload as QuotePayload, { onBehalfOf: req.requestedById, skipCap: true })).id;
      } else {
        const { changeStage } = await import("./pipeline");
        const p = req.payload as SalePayload;
        await changeStage(ctx, p.leadId, { stage: "VENDIDO", saleAmount: p.saleAmount });
      }
    }
  } catch (e) {
    await withOrg(ctx.orgId, (tx) =>
      tx.authorizationRequest.update({ where: { id }, data: { status: "PENDIENTE", decidedById: null, decidedAt: null, decisionNote: null } }),
    );
    throw e;
  }
  await withOrg(ctx.orgId, async (tx) => {
    if (quoteId) await tx.authorizationRequest.update({ where: { id }, data: { resultQuoteId: quoteId } });
    if (req.leadId) {
      const who = (await tx.user.findUnique({ where: { id: ctx.userId }, select: { name: true } }))?.name ?? "Un administrador";
      await tx.activity.create({
        data: {
          organizationId: ctx.orgId,
          leadId: req.leadId,
          userId: ctx.userId,
          type: "SISTEMA",
          body: `${who} ${d.approve ? "autorizó" : "rechazó"}: ${req.summary}.${note ? ` Nota: ${note}` : ""}`,
        },
      });
    }
  });
  await notifyRequester(ctx, req.requestedById, req.summary, d.approve, note, quoteId, req.leadId);
  return { status, quoteId };
}

async function notifyRequester(ctx: Ctx, requesterId: string, summary: string, approved: boolean, note: string | null, quoteId: string | null, leadId: string | null) {
  try {
    const user = await withOrg(ctx.orgId, (tx) => tx.user.findUnique({ where: { id: requesterId }, select: { email: true } }));
    if (!user) return;
    const link = quoteId ? `${appUrl()}/app/cotizador/${quoteId}` : leadId ? `${appUrl()}/app/leads/${leadId}` : `${appUrl()}/app/autorizaciones`;
    await sendEmail({ to: user.email, ...authorizationDecidedEmail({ approved, summary, note, link }) });
  } catch (e) {
    console.error("notifyRequester:", e instanceof Error ? e.message : e);
  }
}

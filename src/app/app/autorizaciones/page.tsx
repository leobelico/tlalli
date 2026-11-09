import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { listAuthorizationRequests } from "@/server/services/authorizations";
import { formatDateTime, timeAgo } from "@/lib/format";
import { DecisionForm } from "./decision-form";

export const metadata: Metadata = { title: "Autorizaciones" };

const KIND = { DESCUENTO: "Descuento", VENTA: "Venta por debajo de lista" } as const;
const STATUS = { PENDIENTE: ["amber", "Pendiente"], APROBADA: ["green", "Autorizada"], RECHAZADA: ["red", "Rechazada"] } as const;

export default async function AuthorizationsPage() {
  const { ctx } = await requireCtx();
  const isAdmin = can(ctx.role, "pricing:override");
  const all = await listAuthorizationRequests(ctx);
  const pending = all.filter((r) => r.status === "PENDIENTE");
  const done = all.filter((r) => r.status !== "PENDIENTE");
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Autorizaciones"
        description={
          isAdmin
            ? "Descuentos y ventas que los asesores no pueden dar por su cuenta. Aprueba o rechaza; ellos reciben el aviso."
            : "Tus solicitudes a un administrador. Cuando respondan, te llega un correo y lo verás aquí."
        }
      />

      <h2 className="mb-2 font-semibold">{isAdmin ? "Por autorizar" : "Pendientes"}</h2>
      {pending.length === 0 ? (
        <EmptyState title="No hay solicitudes pendientes" />
      ) : (
        <div className="mb-8 space-y-3">
          {pending.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="amber">{KIND[r.kind]}</Badge>
                <span className="text-xs text-stone-500">
                  {isAdmin ? `${r.requestedByName} · ` : ""}{timeAgo(r.createdAt, now)}
                </span>
              </div>
              <p className="mt-2 text-sm">{r.summary}</p>
              {r.leadId ? (
                <Link href={`/app/leads/${r.leadId}`} className="mt-1 inline-block text-xs text-brand-700 hover:underline">
                  Ver al cliente
                </Link>
              ) : null}
              {isAdmin ? <DecisionForm id={r.id} /> : <p className="mt-2 text-xs text-stone-500">Esperando respuesta de un administrador.</p>}
            </Card>
          ))}
        </div>
      )}

      {done.length ? (
        <>
          <h2 className="mb-2 font-semibold">Historial</h2>
          <div className="space-y-2">
            {done.map((r) => {
              const [tone, label] = STATUS[r.status];
              return (
                <Card key={r.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={tone}>{label}</Badge>
                    <Badge>{KIND[r.kind]}</Badge>
                    <span className="text-xs text-stone-500">
                      {isAdmin ? `${r.requestedByName} · ` : ""}
                      {r.decidedAt ? `${label.toLowerCase()} por ${r.decidedByName ?? "un administrador"} el ${formatDateTime(r.decidedAt)}` : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{r.summary}</p>
                  {r.decisionNote ? <p className="mt-1 text-sm text-stone-600">Nota: {r.decisionNote}</p> : null}
                  {r.resultQuoteId ? (
                    <Link href={`/app/cotizador/${r.resultQuoteId}`} className="mt-1 inline-block text-xs text-brand-700 hover:underline">
                      Ver la cotización
                    </Link>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
    </>
  );
}

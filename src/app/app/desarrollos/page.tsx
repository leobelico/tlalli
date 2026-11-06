import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { listDevelopments } from "@/server/services/inventory";
import { createDevelopmentAction } from "./actions";

export const metadata: Metadata = { title: "Desarrollos" };

export default async function DevelopmentsPage() {
  const { ctx } = await requireCtx();
  const isAdmin = can(ctx.role, "developments:write");
  const devs = await listDevelopments(ctx, { includeInactive: isAdmin });

  return (
    <>
      <PageHeader title="Desarrollos" description="Tus proyectos y su inventario de lotes, casas y departamentos." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {devs.length === 0 ? (
            <div className="sm:col-span-2">
              <EmptyState title="Aún no hay desarrollos">
                {isAdmin ? "Crea tu primer desarrollo con el formulario." : "Pide a tu administrador que los dé de alta."}
              </EmptyState>
            </div>
          ) : null}
          {devs.map((d) => {
            const pctSold = d.totalUnits ? Math.round(((d.unitCounts.VENDIDO + d.unitCounts.APARTADO) / d.totalUnits) * 100) : 0;
            return (
              <Link key={d.id} href={`/app/desarrollos/${d.id}`} className="card block p-5 transition hover:border-brand-300">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{d.name}</h2>
                  {!d.active ? <Badge>Inactivo</Badge> : null}
                </div>
                <p className="text-sm text-stone-500">{d.city}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100" aria-hidden>
                  <div className="h-full bg-brand-500" style={{ width: `${pctSold}%` }} />
                </div>
                <p className="mt-2 text-xs text-stone-600">
                  {d.totalUnits} unidades · {d.unitCounts.DISPONIBLE} disponibles · {d.unitCounts.APARTADO} apartadas ·{" "}
                  {d.unitCounts.VENDIDO} vendidas
                </p>
              </Link>
            );
          })}
        </div>
        {isAdmin ? (
          <Card className="h-fit">
            <h2 className="mb-3 font-semibold">Nuevo desarrollo</h2>
            <ActionForm action={createDevelopmentAction} className="space-y-3">
              <Field label="Nombre" name="name">
                <input id="name" name="name" className="input" placeholder="Ej. Residencial Las Lomas" required />
              </Field>
              <Field label="Ciudad" name="city">
                <input id="city" name="city" className="input" placeholder="Ej. Monterrey" />
              </Field>
              <Field label="Dirección" name="address">
                <input id="address" name="address" className="input" />
              </Field>
              <Field label="Descripción" name="description">
                <textarea id="description" name="description" rows={3} className="input" />
              </Field>
              <SubmitButton>Crear desarrollo</SubmitButton>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </>
  );
}

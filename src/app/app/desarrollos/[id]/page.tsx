import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { NotFoundError } from "@/server/errors";
import { getDevelopment } from "@/server/services/inventory";
import { hasPlan, listPlanUnits } from "@/server/services/plans";
import { formatMoney, toNumber } from "@/lib/format";
import { UNIT_STATUS_LABEL, UNIT_STATUS_TONE, UNIT_TYPE_LABEL } from "@/lib/labels";
import { isUuid } from "@/lib/validation/common";
import { unitStatusSchema } from "@/lib/validation/inventory";
import { bulkUnitsAction, createUnitAction, updateDevelopmentAction } from "../actions";
import { DeleteUnitButton, UnitStatusSelect } from "./unit-controls";
import { PlanBoard } from "./plan-board";
import { DeletePlanButton, PlanUpload } from "./plan-upload";

export const metadata: Metadata = { title: "Desarrollo" };

const TYPE_OPTIONS = Object.entries(UNIT_TYPE_LABEL);

export default async function DevelopmentDetail({ params, searchParams }: PageProps<"/app/desarrollos/[id]">) {
  const { ctx } = await requireCtx();
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const statusFilter = unitStatusSchema.safeParse(sp.estatus).data;
  const isAdmin = can(ctx.role, "units:write");
  const view = sp.vista === "plano" ? "plano" : "tabla";

  let dev;
  try {
    dev = await getDevelopment(ctx, id, statusFilter);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  const plan = view === "plano" ? await hasPlan(ctx, id) : null;
  const planUnits = view === "plano" && plan ? await listPlanUnits(ctx, id) : [];

  const tabs: { label: string; value?: string }[] = [
    { label: "Todas" },
    ...Object.entries(UNIT_STATUS_LABEL).map(([value, label]) => ({
      label,
      value,
    })),
  ];

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/app/desarrollos" className="text-brand-700 hover:underline">
          ← Desarrollos
        </Link>
      </p>
      <PageHeader
        title={dev.name}
        description={[dev.city, dev.address].filter(Boolean).join(" · ")}
        actions={!dev.active ? <Badge>Inactivo</Badge> : undefined}
      />

      <div className="mb-4 flex gap-1 border-b border-stone-200" role="tablist" aria-label="Vista del desarrollo">
        {[
          { v: "tabla", label: "Inventario", href: "?" },
          { v: "plano", label: "Plano", href: "?vista=plano" },
        ].map((t) => (
          <Link
            key={t.v}
            href={t.href}
            role="tab"
            aria-selected={view === t.v}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${view === t.v ? "border-brand-600 text-brand-700" : "border-transparent text-stone-500 hover:text-stone-800"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {view === "plano" ? (
        plan ? (
          <>
            {isAdmin ? (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <PlanUpload developmentId={dev.id} replace />
                <DeletePlanButton developmentId={dev.id} />
              </div>
            ) : null}
            <PlanBoard
              developmentId={dev.id}
              imageUrl={`/api/developments/${dev.id}/plan?v=${plan.updatedAt.getTime()}`}
              isAdmin={isAdmin}
              units={planUnits.map((u) => ({
                id: u.id,
                code: u.code,
                typeLabel: UNIT_TYPE_LABEL[u.type],
                status: u.status,
                statusLabel: UNIT_STATUS_LABEL[u.status],
                area: toNumber(u.areaM2) || null,
                priceLabel: formatMoney(u.price, false),
                shape: u.shape,
              }))}
            />
          </>
        ) : (
          <EmptyState title="Este desarrollo aún no tiene plano">
            {isAdmin ? (
              <div className="space-y-3">
                <p>
                  Sube una imagen del plano (PNG, JPG o WebP, hasta 5 MB). Después marcas cada lote sobre el plano y se
                  pintará según su estatus.
                </p>
                <PlanUpload developmentId={dev.id} />
              </div>
            ) : (
              "Pide a un administrador que suba el plano."
            )}
          </EmptyState>
        )
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div>
            <div className="mb-3 flex flex-wrap gap-1">
              {tabs.map((t) => {
                const active = (t.value ?? undefined) === statusFilter;
                return (
                  <Link
                    key={t.label}
                    href={t.value ? `?estatus=${t.value}` : "?"}
                    className={`rounded-full px-3 py-1 text-sm ${active ? "bg-brand-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"}`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>
            {dev.units.length === 0 ? (
              <EmptyState title="Sin unidades en esta vista">
                {isAdmin ? "Agrega unidades una por una o en bloque con el formulario." : null}
              </EmptyState>
            ) : (
              <Card className="overflow-x-auto p-0">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Clave</th>
                      <th>Tipo</th>
                      <th className="text-right">m²</th>
                      <th className="text-right">Precio</th>
                      <th className="text-right">$/m²</th>
                      <th>Estatus</th>
                      {isAdmin ? <th /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {dev.units.map((u) => {
                      const area = toNumber(u.areaM2);
                      return (
                        <tr key={u.id}>
                          <td className="font-medium">
                            <Link className="hover:underline" href={`/app/cotizador?unidad=${u.id}`} title="Cotizar">
                              {u.code}
                            </Link>
                          </td>
                          <td>{UNIT_TYPE_LABEL[u.type]}</td>
                          <td className="text-right tabular-nums">{area ? area.toLocaleString("es-MX") : "—"}</td>
                          <td className="text-right tabular-nums">{formatMoney(u.price, false)}</td>
                          <td className="text-right tabular-nums text-stone-500">
                            {area ? formatMoney(toNumber(u.price) / area, false) : "—"}
                          </td>
                          <td>
                            {isAdmin ? (
                              <UnitStatusSelect id={u.id} developmentId={dev.id} status={u.status} />
                            ) : (
                              <Badge tone={UNIT_STATUS_TONE[u.status]}>{UNIT_STATUS_LABEL[u.status]}</Badge>
                            )}
                          </td>
                          {isAdmin ? (
                            <td className="text-right">
                              <DeleteUnitButton id={u.id} developmentId={dev.id} code={u.code} />
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </div>

          {isAdmin ? (
            <div className="space-y-6">
              <Card>
                <h2 className="mb-3 font-semibold">Agregar unidad</h2>
                <ActionForm action={createUnitAction} resetOnSuccess className="space-y-3">
                  <input type="hidden" name="developmentId" value={dev.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Clave" name="code">
                      <input id="code" name="code" className="input" placeholder="Lote 12" />
                    </Field>
                    <Field label="Tipo" name="type">
                      <select id="type" name="type" className="input">
                        {TYPE_OPTIONS.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Superficie m²" name="areaM2">
                      <input id="areaM2" name="areaM2" type="number" step="0.01" min="0" className="input" />
                    </Field>
                    <Field label="Precio (MXN)" name="price">
                      <input id="price" name="price" type="number" step="0.01" min="0" className="input" />
                    </Field>
                  </div>
                  <input type="hidden" name="status" value="DISPONIBLE" />
                  <SubmitButton>Agregar</SubmitButton>
                </ActionForm>
              </Card>

              <Card>
                <h2 className="mb-1 font-semibold">Alta en bloque</h2>
                <p className="mb-3 text-xs text-stone-500">
                  Ej. prefijo &quot;Lote &quot; del 1 al 40 crea Lote 1 … Lote 40.
                </p>
                <ActionForm action={bulkUnitsAction} resetOnSuccess className="space-y-3">
                  <input type="hidden" name="developmentId" value={dev.id} />
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Prefijo" name="prefix">
                      <input id="prefix" name="prefix" className="input" defaultValue="Lote " />
                    </Field>
                    <Field label="Del" name="from">
                      <input id="from" name="from" type="number" min="0" className="input" defaultValue={1} />
                    </Field>
                    <Field label="Al" name="to">
                      <input id="to" name="to" type="number" min="0" className="input" defaultValue={20} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Tipo" name="type">
                      <select id="bulk-type" name="type" className="input">
                        {TYPE_OPTIONS.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="m²" name="areaM2">
                      <input id="bulk-area" name="areaM2" type="number" step="0.01" min="0" className="input" />
                    </Field>
                    <Field label="Precio" name="price">
                      <input id="bulk-price" name="price" type="number" step="0.01" min="0" className="input" />
                    </Field>
                  </div>
                  <SubmitButton>Crear unidades</SubmitButton>
                </ActionForm>
              </Card>

              <Card>
                <details>
                  <summary className="cursor-pointer font-semibold">Editar desarrollo</summary>
                  <ActionForm action={updateDevelopmentAction} className="mt-3 space-y-3">
                    <input type="hidden" name="id" value={dev.id} />
                    <Field label="Nombre" name="name">
                      <input id="dev-name" name="name" className="input" defaultValue={dev.name} />
                    </Field>
                    <Field label="Ciudad" name="city">
                      <input id="dev-city" name="city" className="input" defaultValue={dev.city} />
                    </Field>
                    <Field label="Dirección" name="address">
                      <input id="dev-address" name="address" className="input" defaultValue={dev.address ?? ""} />
                    </Field>
                    <Field label="Descripción" name="description">
                      <textarea
                        id="dev-description"
                        name="description"
                        rows={3}
                        className="input"
                        defaultValue={dev.description ?? ""}
                      />
                    </Field>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="active" defaultChecked={dev.active} /> Activo
                    </label>
                    <SubmitButton>Guardar</SubmitButton>
                  </ActionForm>
                </details>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

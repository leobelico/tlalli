import Link from "next/link";
import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { listCampaignsForSelect } from "@/server/services/campaigns";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Importar leads" };

export default async function ImportPage() {
  const { ctx } = await requireCtx("leads:import");
  const campaigns = await listCampaignsForSelect(ctx);
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/app/leads" className="text-brand-700 hover:underline">
          ← Leads
        </Link>
      </p>
      <PageHeader title="Importar leads desde CSV" description="Trae tu base de Excel. Los teléfonos repetidos no se duplican." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <ImportForm campaigns={campaigns} />
        </Card>
        <Card className="h-fit text-sm text-stone-700">
          <h2 className="mb-2 font-semibold">Formato</h2>
          <p>
            En Excel: <em>Archivo → Guardar como → CSV UTF-8</em>. Columnas reconocidas (en cualquier orden):
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            <li>
              <strong>nombre</strong> y <strong>telefono</strong> (obligatorias)
            </li>
            <li>apellido, correo, campana (código), canal, desarrollo, notas, presupuesto</li>
          </ul>
          <p className="mt-2">Máximo 2,000 filas / 2 MB por archivo.</p>
          <a href="/plantilla-leads.csv" download className="btn-secondary mt-3 text-xs">
            Descargar plantilla
          </a>
        </Card>
      </div>
    </>
  );
}

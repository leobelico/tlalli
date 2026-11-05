import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, FieldError, SubmitButton } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { leadFormOptions } from "@/server/services/lead-options";
import { getOrganization } from "@/server/services/organization";
import { LeadFields } from "../lead-fields";
import { createLeadAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo lead" };

export default async function NewLeadPage() {
  const { ctx } = await requireCtx("leads:create");
  const [options, org] = await Promise.all([leadFormOptions(ctx), getOrganization(ctx)]);
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/app/leads" className="text-brand-700 hover:underline">
          ← Leads
        </Link>
      </p>
      <PageHeader title="Nuevo lead" description="Captura a un prospecto que llamó, escribió o llegó a la oficina." />
      <Card className="max-w-3xl">
        <ActionForm action={createLeadAction} className="space-y-4">
          <LeadFields options={options} canAssign={can(ctx.role, "leads:assign")} defaultAssignee={ctx.userId} />
          <div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="consent" className="mt-1" />
              <span>
                El prospecto conoce y acepta el{" "}
                <a href={`/aviso-privacidad/${org.slug}`} target="_blank" className="text-brand-700 underline">
                  aviso de privacidad
                </a>{" "}
                (se le compartió por teléfono, WhatsApp o en persona).
              </span>
            </label>
            <FieldError name="consent" />
          </div>
          <SubmitButton>Guardar lead</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}

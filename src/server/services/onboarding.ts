import "server-only";
import { withOrg } from "@/server/db/tenant";
import { can, type Ctx } from "@/server/auth/permissions";

export type OnboardingStep = { key: "desarrollo" | "leads" | "asesores" | "tope"; title: string; description: string; href: string; cta: string; done: boolean };

/**
 * First-day guide for an administrator of a new organization (QA2 B38). Each step is "done" when the
 * real thing exists, so nothing needs to be ticked by hand. Returns null for asesores.
 */
export async function getOnboarding(ctx: Ctx): Promise<{ steps: OnboardingStep[]; doneCount: number; complete: boolean } | null> {
  if (!can(ctx.role, "org:settings")) return null;
  const f = await withOrg(ctx.orgId, async (tx) => {
    const [developments, leads, members, invitations, org] = await Promise.all([
      tx.development.count(),
      tx.lead.count(),
      tx.membership.count({ where: { active: true } }),
      tx.invitation.count({ where: { revokedAt: null } }),
      tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { discountPolicySetAt: true } }),
    ]);
    return { developments, leads, members, invitations, capSet: org.discountPolicySetAt !== null };
  });
  const steps: OnboardingStep[] = [
    { key: "desarrollo", title: "Crea tu primer desarrollo", description: "Un fraccionamiento, torre o proyecto con sus lotes o departamentos y precios.", href: "/app/desarrollos", cta: "Crear desarrollo", done: f.developments > 0 },
    { key: "leads", title: "Importa tus leads", description: "Sube tu lista de Excel (CSV) o captura el primero a mano.", href: "/app/leads/importar", cta: "Importar leads", done: f.leads > 0 },
    { key: "asesores", title: "Invita a tus asesores", description: "Cada asesor ve solo sus leads. Les llega una liga para entrar.", href: "/app/equipo", cta: "Invitar asesores", done: f.members > 1 || f.invitations > 0 },
    { key: "tope", title: "Define tu tope de descuento", description: "Hasta cuánto puede dar un asesor sin que tú lo autorices.", href: "/app/configuracion", cta: "Definir tope", done: f.capSet },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return { steps, doneCount, complete: doneCount === steps.length };
}

import type { Metadata } from "next";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { seatUsage } from "@/server/auth/invitations";
import { listMembers, listPendingInvitations } from "@/server/services/organization";
import { PLANS } from "@/lib/plans";
import { formatDate } from "@/lib/format";
import { InviteForm } from "./invite-form";
import { MemberRowActions } from "./member-row-actions";
import { revokeInvitationAction } from "./actions";

export const metadata: Metadata = { title: "Equipo" };

export default async function TeamPage() {
  const { ctx } = await requireCtx("members:manage");
  const [members, invitations, seats] = await Promise.all([
    listMembers(ctx),
    listPendingInvitations(ctx),
    seatUsage(ctx),
  ]);

  return (
    <>
      <PageHeader
        title="Equipo"
        description={`Plan ${PLANS[seats.plan].name}: ${seats.used} de ${seats.limit} lugares ocupados (incluye invitaciones pendientes).`}
      />
      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Invitar a alguien</h2>
        <InviteForm />
      </Card>

      <Card className="mb-6 overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estatus</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td className="font-medium">{m.user.name}</td>
                <td className="text-stone-600">{m.user.email}</td>
                <td>
                  <Badge tone={m.role === "ADMIN" ? "violet" : "blue"}>
                    {m.role === "ADMIN" ? "Administrador" : "Asesor"}
                  </Badge>
                </td>
                <td>{m.active ? <Badge tone="green">Activo</Badge> : <Badge>Inactivo</Badge>}</td>
                <td className="text-right">
                  <MemberRowActions id={m.id} active={m.active} role={m.role} isSelf={m.userId === ctx.userId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {invitations.length ? (
        <Card className="overflow-x-auto p-0">
          <h2 className="px-5 pt-4 font-semibold">Invitaciones pendientes</h2>
          <table className="table-base mt-2">
            <thead>
              <tr>
                <th>Correo</th>
                <th>Rol</th>
                <th>Vence</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invitations.map((i) => (
                <tr key={i.id}>
                  <td>{i.email}</td>
                  <td>{i.role === "ADMIN" ? "Administrador" : "Asesor"}</td>
                  <td>{formatDate(i.expiresAt)}</td>
                  <td className="text-right">
                    <form action={revokeInvitationAction}>
                      <input type="hidden" name="id" value={i.id} />
                      <button className="btn-ghost px-2 py-1 text-xs text-red-700">Cancelar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </>
  );
}

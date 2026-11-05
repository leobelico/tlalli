import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { findValidInvitation } from "@/server/auth/invitations";
import { getAuthUser } from "@/server/auth/session";
import { acceptInvitationAction, logoutAction, signupFromInvitationAction } from "../../actions";

export const metadata: Metadata = { title: "Invitación", robots: { index: false } };

const ROLE_LABEL = { ADMIN: "administrador", ASESOR: "asesor" } as const;

export default async function InvitationPage({ params }: PageProps<"/invitacion/[token]">) {
  const { token } = await params;
  const inv = await findValidInvitation(token);
  if (!inv) {
    return (
      <>
        <h1 className="text-xl font-semibold">Invitación no válida</h1>
        <p className="mt-2 text-sm text-stone-600">
          El enlace expiró, ya se usó o fue cancelado. Pide a tu administrador uno nuevo.
        </p>
      </>
    );
  }

  const authUser = await getAuthUser();
  const header = (
    <>
      <h1 className="text-xl font-semibold">Te invitaron a {inv.organization.name}</h1>
      <p className="mt-1 mb-6 text-sm text-stone-600">
        Te unirás como <strong>{ROLE_LABEL[inv.role]}</strong> con el correo <strong>{inv.email}</strong>.
      </p>
    </>
  );

  if (authUser) {
    if ((authUser.email ?? "").toLowerCase() !== inv.email) {
      return (
        <>
          {header}
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Iniciaste sesión como {authUser.email}. Cierra sesión y entra con {inv.email}.
          </p>
          <form action={logoutAction} className="mt-4">
            <button className="btn-secondary w-full">Cerrar sesión</button>
          </form>
        </>
      );
    }
    return (
      <>
        {header}
        <ActionForm action={acceptInvitationAction}>
          <input type="hidden" name="token" value={token} />
          <SubmitButton pendingText="Uniéndote…" className="btn-primary w-full">
            Aceptar invitación
          </SubmitButton>
        </ActionForm>
      </>
    );
  }

  return (
    <>
      {header}
      <ActionForm action={signupFromInvitationAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label="Tu nombre" name="name">
          <input id="name" name="name" autoComplete="name" required className="input" />
        </Field>
        <Field label="Crea una contraseña" name="password" hint="Mínimo 8 caracteres.">
          <input id="password" name="password" type="password" autoComplete="new-password" required className="input" />
        </Field>
        <SubmitButton pendingText="Creando cuenta…" className="btn-primary w-full">
          Crear cuenta y unirme
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-stone-600">
        ¿Ya tienes cuenta?{" "}
        <Link href={`/login?next=/invitacion/${token}`} className="font-medium text-brand-700 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}

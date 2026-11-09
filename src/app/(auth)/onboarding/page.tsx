import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { deactivatedOrgNames, ensureUserProfile, getAuthUser, getSession } from "@/server/auth/session";
import { logoutAction, onboardingAction } from "../actions";

export const metadata: Metadata = { title: "Crea tu organización" };

export default async function OnboardingPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");
  const session = await getSession();
  if (session?.active) redirect("/app");
  const removedFrom = await deactivatedOrgNames((await ensureUserProfile(authUser)).id);
  const suggested =
    typeof authUser.user_metadata?.pending_org_name === "string" ? authUser.user_metadata.pending_org_name : "";

  return (
    <>
      {removedFrom.length ? (
        <p role="alert" className="mb-5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Tu acceso a {removedFrom.join(", ")} fue desactivado por un administrador, así que ya no puedes ver sus
          prospectos. Si es un error, pídele que te reactive.
        </p>
      ) : null}
      <h1 className="text-xl font-semibold">Crea tu organización</h1>
      <p className="mt-1 mb-6 text-sm text-stone-600">
        Aún no perteneces a ninguna inmobiliaria. Crea la tuya o pide a tu administrador un enlace de invitación.
      </p>
      <ActionForm action={onboardingAction} className="space-y-4">
        <Field label="Nombre de tu inmobiliaria o desarrolladora" name="orgName">
          <input id="orgName" name="orgName" defaultValue={suggested} required className="input" />
        </Field>
        <SubmitButton pendingText="Creando…" className="btn-primary w-full">
          Continuar
        </SubmitButton>
      </ActionForm>
      <form action={logoutAction} className="mt-4 text-center">
        <button className="text-sm text-stone-500 hover:underline">Cerrar sesión</button>
      </form>
    </>
  );
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { getAuthUser } from "@/server/auth/session";
import { setNewPasswordAction } from "../actions";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function NewPasswordPage() {
  // Only reachable with the session created by the emailed recovery link.
  if (!(await getAuthUser())) redirect("/recuperar?error=enlace");
  return (
    <>
      <h1 className="text-xl font-semibold">Crea tu contraseña nueva</h1>
      <p className="mt-1 mb-6 text-sm text-stone-600">Después de guardarla cerraremos tus otras sesiones abiertas.</p>
      <ActionForm action={setNewPasswordAction} className="space-y-4">
        <Field label="Contraseña nueva" name="password" hint="Mínimo 8 caracteres.">
          <input id="password" name="password" type="password" autoComplete="new-password" required className="input" />
        </Field>
        <SubmitButton pendingText="Guardando…" className="btn-primary w-full">
          Guardar contraseña
        </SubmitButton>
      </ActionForm>
    </>
  );
}

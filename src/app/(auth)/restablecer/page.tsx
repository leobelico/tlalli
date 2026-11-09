import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/form";
import { confirmRecoveryAction } from "../actions";

export const metadata: Metadata = { title: "Restablecer contraseña" };

// Landing page of the emailed recovery link. Verifying the token needs a click on purpose: mail
// scanners (Outlook SafeLinks, antivirus) open links automatically and would burn a one-time token.
export default async function ResetLandingPage({ searchParams }: PageProps<"/restablecer">) {
  const { token_hash } = await searchParams;
  if (typeof token_hash !== "string" || !/^[\w-]{10,200}$/.test(token_hash)) redirect("/recuperar?error=enlace");
  return (
    <>
      <h1 className="text-xl font-semibold">Crea tu contraseña nueva</h1>
      <p className="mt-1 mb-6 text-sm text-stone-600">Confirma que quieres cambiar la contraseña de tu cuenta.</p>
      <ActionForm action={confirmRecoveryAction} className="space-y-4">
        <input type="hidden" name="token_hash" value={token_hash} />
        <SubmitButton pendingText="Verificando…" className="btn-primary w-full">
          Continuar
        </SubmitButton>
      </ActionForm>
    </>
  );
}

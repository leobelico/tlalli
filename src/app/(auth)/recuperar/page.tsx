import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { requestPasswordResetAction } from "../actions";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default async function RecoverPage({ searchParams }: PageProps<"/recuperar">) {
  const { error } = await searchParams;
  return (
    <>
      <h1 className="text-xl font-semibold">Recupera tu contraseña</h1>
      <p className="mt-1 mb-6 text-sm text-stone-600">
        Escribe el correo de tu cuenta y te enviamos un enlace para crear una contraseña nueva.
      </p>
      {error === "enlace" ? (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          El enlace no es válido o ya venció. Pide uno nuevo aquí abajo.
        </p>
      ) : null}
      <ActionForm action={requestPasswordResetAction} className="space-y-4">
        <Field label="Correo electrónico" name="email">
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </Field>
        <SubmitButton pendingText="Enviando…" className="btn-primary w-full">
          Enviar enlace
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-stone-600">
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </>
  );
}

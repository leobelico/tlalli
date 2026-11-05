import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { loginAction } from "../actions";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-xl font-semibold">Inicia sesión</h1>
      <p className="mt-1 mb-6 text-sm text-stone-600">Entra a tu cuenta para dar seguimiento a tus leads.</p>
      <ActionForm action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={typeof next === "string" ? next : ""} />
        <Field label="Correo electrónico" name="email">
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </Field>
        <Field label="Contraseña" name="password">
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </Field>
        <SubmitButton pendingText="Entrando…" className="btn-primary w-full">
          Entrar
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-stone-600">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-brand-700 hover:underline">
          Prueba gratis 14 días
        </Link>
      </p>
    </>
  );
}

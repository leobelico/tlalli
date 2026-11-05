import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, Field, FieldError, SubmitButton } from "@/components/form";
import { signupAction } from "../actions";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Crea tu cuenta</h1>
      <p className="mt-1 mb-6 text-sm text-stone-600">14 días de prueba, sin tarjeta.</p>
      <ActionForm action={signupAction} className="space-y-4">
        <Field label="Tu nombre" name="name">
          <input id="name" name="name" autoComplete="name" required className="input" />
        </Field>
        <Field label="Nombre de tu inmobiliaria o desarrolladora" name="orgName">
          <input id="orgName" name="orgName" required className="input" placeholder="Ej. Desarrollos del Potosí" />
        </Field>
        <Field label="Correo electrónico" name="email">
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </Field>
        <Field label="Contraseña" name="password" hint="Mínimo 8 caracteres.">
          <input id="password" name="password" type="password" autoComplete="new-password" required className="input" />
        </Field>
        <div>
          <label className="flex items-start gap-2 text-sm text-stone-700">
            <input type="checkbox" name="terms" className="mt-1" required />
            <span>
              Acepto los{" "}
              <Link href="/terminos" className="text-brand-700 underline">
                términos del servicio
              </Link>{" "}
              y el{" "}
              <Link href="/privacidad" className="text-brand-700 underline">
                aviso de privacidad
              </Link>
              .
            </span>
          </label>
          <FieldError name="terms" />
        </div>
        <SubmitButton pendingText="Creando cuenta…" className="btn-primary w-full">
          Crear cuenta
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-stone-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findOrgBySlug } from "@/server/public/lead-intake";

export const metadata: Metadata = { title: "Solicita información", robots: { index: false } };

/**
 * Hosted lead form. Works without JavaScript: posts straight to the public webhook,
 * which redirects to /f/[slug]/gracias. Use ?c=CODE to tag the campaign (e.g. QR on a billboard).
 */
export default async function HostedFormPage({ params, searchParams }: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const org = await findOrgBySlug(slug);
  if (!org) notFound();
  const code = typeof sp.c === "string" ? sp.c.slice(0, 30) : "";
  const appUrl = process.env.APP_URL ?? "";

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
      <p className="mt-1 mb-6 text-stone-600">Déjanos tus datos y un asesor te contactará por WhatsApp.</p>
      <form method="post" action="/api/public/leads" className="card space-y-4 p-6">
        <input type="hidden" name="form_key" value={org.leadFormKey} />
        <input type="hidden" name="campana" value={code} />
        <input type="hidden" name="redirect" value={`${appUrl}/f/${org.slug}/gracias`} />
        <div aria-hidden className="absolute -left-[9999px]">
          <label>
            No llenar <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <div>
          <label htmlFor="nombre" className="label">
            Nombre
          </label>
          <input id="nombre" name="nombre" required maxLength={80} className="input" autoComplete="given-name" />
        </div>
        <div>
          <label htmlFor="apellido" className="label">
            Apellidos
          </label>
          <input id="apellido" name="apellido" maxLength={80} className="input" autoComplete="family-name" />
        </div>
        <div>
          <label htmlFor="telefono" className="label">
            WhatsApp (10 dígitos)
          </label>
          <input id="telefono" name="telefono" type="tel" required className="input" autoComplete="tel" placeholder="444 123 4567" />
        </div>
        <div>
          <label htmlFor="email" className="label">
            Correo (opcional)
          </label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" />
        </div>
        <div>
          <label htmlFor="mensaje" className="label">
            ¿Qué te interesa?
          </label>
          <textarea id="mensaje" name="mensaje" rows={3} maxLength={1000} className="input" />
        </div>
        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input type="checkbox" name="acepta_privacidad" value="si" required className="mt-1" />
          <span>
            He leído y acepto el{" "}
            <a href={`/aviso-privacidad/${org.slug}`} target="_blank" className="text-brand-700 underline">
              aviso de privacidad
            </a>
            .
          </span>
        </label>
        <button className="btn-primary w-full">Quiero información</button>
      </form>
    </main>
  );
}

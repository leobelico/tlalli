import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell, Section } from "@/components/marketing";
import { PricingCards } from "@/components/pricing-cards";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name} — CRM de leads con WhatsApp para inmobiliarias en San Luis Potosí` },
  description:
    "Sabe de qué campaña llegó cada prospecto y no dejes que ningún lead se enfríe. CRM con WhatsApp para inmobiliarias y desarrolladoras de San Luis Potosí.",
};

const FEATURES = [
  {
    title: "Cada lead con su campaña de origen",
    body: "Un código único por spot de radio, espectacular o anuncio. Sabrás qué medio te trae prospectos y cuánto te cuesta cada uno.",
  },
  {
    title: "Alerta de leads fríos",
    body: "Define en cuántas horas un prospecto sin contacto debe encender la alarma. Tus asesores lo ven en cada pantalla hasta que lo atienden.",
  },
  {
    title: "WhatsApp dentro del CRM",
    body: "Conversaciones guardadas en la ficha del lead, plantillas aprobadas y respuestas en la ventana de 24 horas. Conectado a la API oficial de Meta.",
  },
  {
    title: "Pipeline visual",
    body: "De nuevo a vendido en un tablero: arrastra, registra el motivo de pérdida y mantén el inventario apartado o vendido al día.",
  },
  {
    title: "Cotizador en PDF",
    body: "Enganche, mensualidades y plazo para cualquier lote o casa. Un PDF limpio con tu nombre, listo para mandar por WhatsApp.",
  },
  {
    title: "Tus números, sin Excel",
    body: "Leads por campaña, costo por lead, conversión por etapa, tiempo de primera respuesta y ventas por asesor.",
  },
];

const STEPS = [
  { n: "1", title: "Importa tu base", body: "Sube tu Excel (CSV) o conecta el formulario de tu página. Los teléfonos repetidos no se duplican." },
  { n: "2", title: "Asigna campañas y asesores", body: "Crea los códigos de tus anuncios y reparte los leads entre tu equipo automáticamente." },
  { n: "3", title: "Da seguimiento y vende", body: "Tareas, recordatorios y WhatsApp en un solo lugar. El sistema te avisa quién se está enfriando." },
];

const FAQ = [
  {
    q: "¿Necesito cambiar mi número de WhatsApp?",
    a: "Usamos la API oficial de WhatsApp Business (Meta). El número que conectes no puede estar activo en la app normal de WhatsApp; te acompañamos en el proceso.",
  },
  {
    q: "¿Mis datos y los de mis prospectos están separados de otras inmobiliarias?",
    a: "Sí. Cada organización tiene sus datos aislados a nivel base de datos, y cada asesor solo ve los leads que le asignaste.",
  },
  {
    q: "¿Cumple con la ley de protección de datos (LFPDPPP)?",
    a: "Incluye aviso de privacidad configurable y registro del consentimiento de cada lead (fecha, versión del aviso y origen). Tu aviso legal definitivo debe ser revisado por tu asesor jurídico.",
  },
  {
    q: "¿Qué pasa al terminar la prueba?",
    a: "Elige un plan para continuar. Si no lo haces, no se te cobra nada: tus datos se conservan para que puedas exportarlos.",
  },
];

export default function Home() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:pt-24 sm:pb-16">
        <p className="mb-4 inline-block rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-800">
          Hecho para desarrolladoras e inmobiliarias de San Luis Potosí
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Que ningún lead se enfríe. Y sabe de qué anuncio llegó cada uno.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-stone-600">
          Si hoy das seguimiento en Excel o en tu WhatsApp personal, {BRAND.name} reúne tus prospectos, tus campañas de radio,
          espectaculares y redes, y la conversación por WhatsApp en un solo lugar.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/registro" className="btn-primary px-6 py-3 text-base">
            Prueba gratis 14 días
          </Link>
          <Link href="/precios" className="btn-secondary px-6 py-3 text-base">
            Ver precios
          </Link>
        </div>
        <p className="mt-3 text-sm text-stone-500">Sin tarjeta. Precios en pesos mexicanos.</p>
      </div>

      <Section
        id="funciones"
        title="Lo que necesitas para vender más con los leads que ya pagas"
        intro="Sin módulos innecesarios: lo esencial de una inmobiliaria que anuncia y necesita dar seguimiento."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-2xl border border-stone-200 bg-white p-6">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-stone-600">{f.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <div className="bg-white">
        <Section title="Empieza en una tarde">
          <ol className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="grid size-9 place-items-center rounded-full bg-brand-600 font-semibold text-white">{s.n}</span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-stone-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      <Section title="Precios claros, por número de asesores" intro="Todos los planes incluyen leads ilimitados, WhatsApp, pipeline y cotizador. Cambia de plan cuando crezca tu equipo.">
        <PricingCards />
        <p className="mt-4 text-center text-sm text-stone-500">
          <Link href="/precios" className="text-brand-700 underline">
            Ver comparativo completo y preguntas frecuentes
          </Link>
        </p>
      </Section>

      <div className="bg-white">
        <Section title="Preguntas frecuentes">
          <dl className="grid gap-6 md:grid-cols-2">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-1 text-sm text-stone-600">{f.a}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Deja de perder prospectos por falta de seguimiento</h2>
        <Link href="/registro" className="btn-primary mt-6 px-6 py-3 text-base">
          Crear mi cuenta gratis
        </Link>
      </section>
    </MarketingShell>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell, Section } from "@/components/marketing";
import { Plano } from "@/components/plano";
import { PricingCards } from "@/components/pricing-cards";
import { BRAND } from "@/lib/brand";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name} — CRM inmobiliario con WhatsApp e IA para México` },
  description:
    "Sabe qué campaña trajo cada prospecto, no dejes que ningún lead se enfríe y cierra más escrituras. CRM con WhatsApp e inteligencia artificial para inmobiliarias y desarrolladoras.",
};

/** Before/after rows: the table structure carries the content. */
const AREAS = [
  ["Los prospectos viven en Excel y en chats personales.", "Un registro por persona con historial, tareas y la conversación de WhatsApp."],
  ["No sabes qué anuncio trae compradores y cuál solo trae curiosos.", "Cada lead lleva el código de su campaña, y ves cuánto cuesta cada uno."],
  ["Un lead se enfría y nadie se entera hasta que ya compró en otro lado.", "Una alerta visible en cada pantalla cuando pasan X horas sin contacto."],
  ["Cotizar toma una tarde de hojas de cálculo.", "Enganche, mensualidades y plazo en un PDF listo para mandar."],
  ["El inventario se desactualiza: se vende un lote que ya estaba apartado.", "Apartado y vendido se sincronizan con la etapa del cliente."],
  ["Nadie tiene tiempo de revisar los números.", "Un tablero con conversión por etapa y, en el plan Élite, un análisis escrito por IA."],
] as const;

const CHANNELS = ["Radio", "Espectaculares", "Facebook", "Instagram", "Google", "TikTok", "Portales", "Referidos", "Volantes y expos", "Tu sitio web"];

const FAQ = [
  {
    q: "¿Necesito cambiar mi número de WhatsApp?",
    a: "Usamos la API oficial de WhatsApp Business (Meta). El número que conectes no puede estar activo en la app normal de WhatsApp; te acompañamos en el proceso.",
  },
  {
    q: "¿La IA le escribe a mis clientes?",
    a: "No. La IA propone: resume el caso, sugiere el siguiente paso y redacta un borrador. Siempre lo revisa y lo envía una persona de tu equipo.",
  },
  {
    q: "¿Qué datos de mis prospectos ve la IA?",
    a: "Solo el nombre de pila, la etapa, el origen, tus notas y la conversación del lead. No ve su teléfono, correo ni apellido. Se procesa con Anthropic (Claude) a través de su API; tu aviso de privacidad debe mencionar el uso de proveedores tecnológicos.",
  },
  {
    q: "¿Mis datos están separados de los de otras inmobiliarias?",
    a: "Sí. Cada organización tiene sus datos aislados a nivel base de datos, y cada asesor solo ve los leads que le asignaste.",
  },
  {
    q: "¿Cumple con la LFPDPPP?",
    a: "Incluye aviso de privacidad configurable y registro del consentimiento de cada lead (fecha, versión del aviso y origen). Tu aviso definitivo debe revisarlo tu asesor jurídico.",
  },
  {
    q: "¿Qué pasa al terminar la prueba?",
    a: "Elige un plan para continuar. Si no lo haces, no se te cobra nada y tus datos se conservan para que puedas exportarlos.",
  },
];

export default function Home() {
  return (
    <MarketingShell>
      {/* Hero: the subdivision plan is the product in one picture. */}
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] lg:pt-20 lg:pb-20">
        <div>
          <h1 className="text-5xl leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl xl:text-7xl">De cada contacto a la escritura.</h1>
          <p className="mt-6 max-w-lg text-lg text-stone-700">
            {BRAND.name} reúne los leads de tu radio, espectaculares, redes, portales y referidos, te dice qué campaña trajo a cada uno y te avisa cuando
            alguno se está enfriando.
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
        <div className="border border-ink/25 bg-white p-1 sm:p-2">
          <Plano className="h-auto w-full" />
        </div>
      </div>

      <div className="border-y border-ink/15 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 text-sm text-stone-600">
          <p className="mb-2 font-medium text-ink">Funciona con cualquier canal con el que ya anuncias</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {CHANNELS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>

      <Section
        id="funciones"
        title="Lo que cambia cuando dejas el Excel"
        intro="Sin módulos de relleno: lo esencial de una inmobiliaria que anuncia, da seguimiento y cotiza."
      >
        <div className="overflow-x-auto border border-ink/25 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/25 bg-ink/[0.04]">
                <th scope="col" className="w-1/2 px-5 py-3 font-semibold">
                  Hoy
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Con {BRAND.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {AREAS.map(([before, after]) => (
                <tr key={before} className="border-b border-ink/10 last:border-0">
                  <td className="px-5 py-4 text-stone-600">{before}</td>
                  <td className="px-5 py-4 font-medium">{after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* AI: dark band with a faithful mock of what the assistant returns. */}
      <section id="ia" className="scroll-mt-16 bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Un asistente que lee cada caso antes de que tu asesor marque.</h2>
            <p className="mt-4 max-w-lg text-paper/75">
              En el plan {PLANS.ELITE.name}, la IA resume la historia de cada lead, mide qué tan cerca está de comprar y propone qué hacer y qué escribirle. Cada
              semana lee tus métricas y te dice dónde se pierden prospectos.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-paper/85">
              <li>La IA propone, tu equipo decide: nunca envía mensajes sola.</li>
              <li>No ve el teléfono, el correo ni el apellido del prospecto.</li>
              <li>Cada consulta queda contada: 500 al mes incluidas en el plan.</li>
            </ul>
            <Link href="/precios" className="btn mt-8 bg-paper text-ink hover:bg-white">
              Ver el plan {PLANS.ELITE.name}
            </Link>
          </div>
          <div className="bg-paper p-5 text-ink" aria-label="Ejemplo de respuesta del asistente">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-stake/15 px-2.5 py-0.5 text-xs font-semibold text-[#a63a10]">Caliente</span>
              <span className="text-stone-600">Pidió precios del lote 14 y preguntó por la fecha de entrega.</span>
            </div>
            <p className="mt-4 text-sm">
              Mariana busca un lote de 160 m² para construir en 2027. Llegó por el espectacular de la carretera, visitó el desarrollo el sábado y comparó con otro
              fraccionamiento. Lleva 30 horas sin respuesta del equipo.
            </p>
            <div className="mt-4 border-l-2 border-brand-600 pl-3 text-sm">
              <p className="font-medium">Siguiente paso</p>
              <p className="text-stone-700">Llamarle hoy para ofrecerle apartar el lote 14 y mandarle la cotización a 24 meses.</p>
            </div>
            <p className="mt-4 mb-1 text-sm font-medium">Borrador para WhatsApp</p>
            <p className="rounded-lg bg-[#d9fdd3] p-3 text-sm">
              Hola Mariana, gracias por visitarnos el sábado. Te preparé la cotización del lote 14 a 24 meses. ¿Te la envío por aquí y platicamos hoy por la tarde?
            </p>
            <p className="mt-2 text-xs text-stone-500">Ejemplo ilustrativo. Tu asesor revisa y envía.</p>
          </div>
        </div>
      </section>

      <Section id="precios" title="Precios claros, por número de usuarios" intro="Todos los planes incluyen leads ilimitados, WhatsApp, pipeline y cotizador. Cambia de plan cuando crezca tu equipo.">
        <PricingCards />
        <p className="mt-4 text-sm text-stone-500">
          <Link href="/precios" className="text-brand-700 underline">
            Ver el comparativo completo
          </Link>
        </p>
      </Section>

      <div className="border-t border-ink/15 bg-white">
        <Section title="Preguntas frecuentes">
          <dl className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-1 text-sm text-stone-600">{f.a}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Cada lead sin seguimiento es una escritura que se queda sin firmar.</h2>
        <Link href="/registro" className="btn-primary mt-6 px-6 py-3 text-base">
          Crear mi cuenta gratis
        </Link>
      </section>
    </MarketingShell>
  );
}

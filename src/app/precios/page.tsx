import type { Metadata } from "next";
import { MarketingShell, Section } from "@/components/marketing";
import { PricingCards } from "@/components/pricing-cards";
import { PLAN_LIST } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Precios",
  description: "Planes por número de asesores, en pesos mexicanos. Prueba gratis 14 días, sin tarjeta.",
};

const ROWS: { label: string; values: (string | boolean)[] }[] = [
  { label: "Usuarios (asesores + administradores)", values: PLAN_LIST.map((p) => String(p.seats)) },
  { label: "Desarrollos activos", values: ["1", "Ilimitados", "Ilimitados"] },
  { label: "Leads y unidades", values: ["Ilimitados", "Ilimitados", "Ilimitados"] },
  { label: "Campañas con código único", values: [true, true, true] },
  { label: "Importación CSV y formulario web", values: [true, true, true] },
  { label: "Pipeline kanban y alertas de leads fríos", values: [true, true, true] },
  { label: "WhatsApp (API oficial de Meta)", values: [true, true, true] },
  { label: "Cotizador en PDF", values: [true, true, true] },
  { label: "Dashboard con costo por lead y ventas por asesor", values: [true, true, true] },
  { label: "Soporte por WhatsApp", values: ["Correo", "Horario laboral", "Prioritario"] },
  { label: "Acompañamiento para conectar WhatsApp", values: [false, false, true] },
  { label: "Importación asistida y capacitación", values: [false, false, true] },
];

const FAQ = [
  { q: "¿Los precios incluyen IVA?", a: "No. Los precios son mensuales en pesos mexicanos más IVA. Emitimos factura." },
  { q: "¿Qué cuenta como usuario?", a: "Cada persona con acceso al CRM, ya sea asesor o administrador. Las invitaciones pendientes también ocupan un lugar." },
  {
    q: "¿Cuánto cuesta WhatsApp?",
    a: "El CRM está incluido en el plan. Meta cobra aparte las conversaciones iniciadas con plantillas según su tarifa vigente para México; responder a quien te escribe primero dentro de 24 horas no genera ese cargo por plantilla.",
  },
  { q: "¿Puedo cambiar de plan?", a: "Sí, cuando quieras. Si bajas de plan, primero debes tener menos usuarios activos que el límite del plan nuevo." },
  { q: "¿Hay contrato forzoso?", a: "No. Pagas mes a mes y puedes cancelar cuando quieras." },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-4 pt-14 text-center sm:pt-20">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Precios simples, por número de asesores</h1>
        <p className="mx-auto mt-4 max-w-2xl text-stone-600">
          Leads, desarrollos y mensajes sin límites artificiales. Pagas según el tamaño de tu equipo de ventas. 14 días de prueba, sin tarjeta.
        </p>
      </div>
      <Section title="Elige tu plan">
        <PricingCards />
      </Section>

      <Section title="Comparativo">
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                <th scope="col" className="px-4 py-3 font-medium text-stone-500">
                  <span className="sr-only">Característica</span>
                </th>
                {PLAN_LIST.map((p) => (
                  <th key={p.id} scope="col" className="px-4 py-3 text-base font-semibold">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-b border-stone-100 last:border-0">
                  <th scope="row" className="px-4 py-3 font-normal text-stone-700">
                    {r.label}
                  </th>
                  {r.values.map((v, i) => (
                    <td key={i} className="px-4 py-3">
                      {v === true ? (
                        <span className="text-brand-600" aria-label="Incluido">
                          ✓
                        </span>
                      ) : v === false ? (
                        <span className="text-stone-400" aria-label="No incluido">
                          —
                        </span>
                      ) : (
                        v
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Preguntas sobre precios">
        <dl className="grid gap-6 md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold">{f.q}</dt>
              <dd className="mt-1 text-sm text-stone-600">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </MarketingShell>
  );
}

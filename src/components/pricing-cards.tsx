import Link from "next/link";
import { PLAN_LIST } from "@/lib/plans";
import { formatMoney } from "@/lib/format";

export function PricingCards() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {PLAN_LIST.map((plan) => (
        <div
          key={plan.id}
          className={`relative flex flex-col rounded-2xl border bg-white p-6 ${
            plan.highlighted ? "border-brand-500 shadow-lg ring-1 ring-brand-500" : "border-stone-200"
          }`}
        >
          {plan.highlighted ? (
            <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white">
              El más elegido
            </span>
          ) : null}
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="mt-1 min-h-10 text-sm text-stone-600">{plan.tagline}</p>
          <p className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatMoney(plan.priceMxn, false)}</span>
            <span className="text-sm text-stone-500">MXN / mes + IVA</span>
          </p>
          <p className="mt-1 text-sm font-medium text-brand-700">Hasta {plan.seats} usuarios (asesores y administradores)</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden className="mt-0.5 text-brand-600">
                  ✓
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link href="/registro" className={`mt-6 ${plan.highlighted ? "btn-primary" : "btn-secondary"}`}>
            Empezar prueba de 14 días
          </Link>
        </div>
      ))}
    </div>
  );
}

import Link from "next/link";
import { PLAN_LIST } from "@/lib/plans";
import { formatMoney } from "@/lib/format";

export function PricingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {PLAN_LIST.map((plan) => {
        const dark = plan.ai;
        return (
          <div
            key={plan.id}
            className={`flex flex-col border p-6 ${
              dark
                ? "border-ink bg-ink text-paper"
                : plan.highlighted
                  ? "border-ink/25 border-t-4 border-t-brand-600 bg-white"
                  : "border-ink/20 bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              {plan.highlighted ? <span className="text-xs font-medium text-brand-700">El más elegido</span> : null}
              {dark ? <span className="rounded-sm bg-paper px-1.5 py-0.5 text-[10px] font-semibold text-ink">IA incluida</span> : null}
            </div>
            <p className={`mt-1 min-h-12 text-sm ${dark ? "text-paper/70" : "text-stone-600"}`}>{plan.tagline}</p>
            <p className="mt-5 flex items-baseline gap-1">
              <span className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight tabular-nums">
                {formatMoney(plan.priceMxn, false)}
              </span>
              <span className={`text-sm ${dark ? "text-paper/60" : "text-stone-500"}`}>MXN/mes + IVA</span>
            </p>
            <ul className="mt-5 flex-1 space-y-2 border-t border-current/15 pt-5 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span aria-hidden className={dark ? "text-[#8aaedb]" : "text-brand-600"}>
                    ✓
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/registro"
              className={`mt-6 ${dark ? "btn bg-paper text-ink hover:bg-white" : plan.highlighted ? "btn-primary" : "btn-secondary"}`}
            >
              Empezar prueba de 14 días
            </Link>
          </div>
        );
      })}
    </div>
  );
}

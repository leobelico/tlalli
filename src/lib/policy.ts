import type { QuoteResult } from "@/lib/quote";

/**
 * Commercial guard rails. Asesores (commission sellers) may not discount or sell below this
 * percentage of the list price without an administrator (QA B04/B05). The default is 5%; each
 * organization can change it in Configuración.
 */
export const DEFAULT_MAX_DISCOUNT_PCT = 5;
/** @deprecated Each organization now sets its own cap (organizations.max_asesor_discount_pct). */
export const ASESOR_MAX_DISCOUNT_PCT = DEFAULT_MAX_DISCOUNT_PCT;

// ---------------------------------------------------------------------------------------------
// Quote guard rails for asesores (QA2 B32). Pure functions shared by the server and the form.
// ---------------------------------------------------------------------------------------------

export type QuotePolicy = {
  /** Largest discount, % of list price, without an administrator. */
  capPct: number;
  /** Annual % used to value the client's payments (the developer's cost of money). 0 = ignore financing. */
  referenceRatePct: number;
  /** Smallest down payment (%) an asesor may quote. */
  minDownPct: number;
  /** Smallest annual interest (%) an asesor may quote when there is a balance to finance. */
  minRatePct: number;
  /** Longest term (months) an asesor may quote when there is a balance to finance. */
  maxMonths: number;
};

export const DEFAULT_QUOTE_POLICY: QuotePolicy = {
  capPct: DEFAULT_MAX_DISCOUNT_PCT,
  referenceRatePct: 4,
  minDownPct: 10,
  minRatePct: 0,
  maxMonths: 120,
};

/**
 * "Descuento equivalente" (MXN): list price minus the present value of everything the client pays,
 * discounting each monthly payment at the reference rate (payments at the end of each month):
 *
 *     PV = down payment + sum over k of payment_k / (1 + r/12)^k        (r = reference rate)
 *     equivalent discount = list price - PV
 *
 * With interest at the reference rate it equals the explicit discount; interest-free installments
 * or long terms make it larger, which is exactly the value an asesor could give away without it
 * showing as a "discount".
 */
export function equivalentDiscount(calc: QuoteResult, referenceRatePct: number): number {
  const r = referenceRatePct / 100 / 12;
  const f = (k: number) => (r === 0 ? 1 : Math.pow(1 + r, -k));
  let pv = calc.downPayment;
  if (calc.months > 0) {
    for (let k = 1; k < calc.months; k++) pv += calc.monthlyPayment * f(k);
    pv += calc.lastPayment * f(calc.months);
  }
  return Math.round((calc.price - pv) * 100) / 100;
}

export type PolicyReason = { code: "DESCUENTO" | "ENGANCHE" | "TASA" | "PLAZO"; text: string };

const money = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct1 = (n: number) => `${Math.round(n * 10) / 10}%`;

/**
 * Everything in `calc` that an asesor may not give without authorization (empty = allowed).
 * The explicit discount and the equivalent discount are each compared with the cap, so a high
 * interest rate cannot hide a large explicit discount.
 */
export function policyReasons(calc: QuoteResult, p: QuotePolicy): PolicyReason[] {
  const out: PolicyReason[] = [];
  const cap = (calc.price * p.capPct) / 100 + 0.005;
  const explicit = calc.discount;
  const equivalent = equivalentDiscount(calc, p.referenceRatePct);
  if (explicit > cap) {
    out.push({ code: "DESCUENTO", text: `Descuento de ${money(explicit)} (${pct1((explicit / calc.price) * 100)})` });
  } else if (equivalent > cap + 1 + calc.months * 0.005) {  // + the cents each rounded payment can add up to
    out.push({
      code: "DESCUENTO",
      text: `Descuento equivalente de ${money(equivalent)} (${pct1((equivalent / calc.price) * 100)}) por las condiciones de pago`,
    });
  }
  if (calc.downPaymentPct < p.minDownPct) {
    out.push({ code: "ENGANCHE", text: `Enganche de ${pct1(calc.downPaymentPct)} (mínimo para asesores ${pct1(p.minDownPct)})` });
  }
  if (calc.financed > 0 && calc.annualRatePct < p.minRatePct) {
    out.push({ code: "TASA", text: `Tasa de ${pct1(calc.annualRatePct)} (mínimo para asesores ${pct1(p.minRatePct)})` });
  }
  if (calc.financed > 0 && calc.months > p.maxMonths) {
    out.push({ code: "PLAZO", text: `Plazo de ${calc.months} meses (máximo para asesores ${p.maxMonths})` });
  }
  return out;
}

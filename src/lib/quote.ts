/**
 * Payment plan for a unit: down payment (enganche) + equal monthly installments.
 * All math is done in integer cents. With interest, installments use the standard
 * amortization formula; the last installment absorbs rounding so totals are exact.
 */
export type QuoteInput = {
  price: number;
  discount?: number;
  downPaymentPct: number;
  months: number;
  annualRatePct?: number;
};

export type QuoteResult = {
  price: number;
  discount: number;
  netPrice: number;
  downPaymentPct: number;
  downPayment: number;
  financed: number;
  months: number;
  annualRatePct: number;
  monthlyPayment: number;
  lastPayment: number;
  totalInterest: number;
  totalPaid: number;
};

export class QuoteInputError extends Error {}

const toCents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;

export function calculateQuote(input: QuoteInput): QuoteResult {
  const price = toCents(input.price);
  const discount = toCents(input.discount ?? 0);
  const pct = input.downPaymentPct;
  const months = input.months;
  const rate = input.annualRatePct ?? 0;

  if (!Number.isFinite(price) || price <= 0) throw new QuoteInputError("El precio debe ser mayor a 0.");
  if (!Number.isFinite(discount) || discount < 0) throw new QuoteInputError("El descuento no puede ser negativo.");
  if (discount >= price) throw new QuoteInputError("El descuento no puede ser mayor o igual al precio.");
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new QuoteInputError("El enganche debe estar entre 0% y 100%.");
  if (!Number.isInteger(months) || months < 0 || months > 360) {
    throw new QuoteInputError("El plazo debe ser de 0 a 360 meses.");
  }
  if (!Number.isFinite(rate) || rate < 0 || rate > 60) throw new QuoteInputError("La tasa anual debe estar entre 0% y 60%.");

  const net = price - discount;
  const down = Math.round((net * pct) / 100);
  const financed = net - down;

  if (financed > 0 && months === 0) throw new QuoteInputError("Indica el plazo en meses para el saldo.");

  let monthly = 0;
  let last = 0;
  let totalInstallments = 0;
  if (financed > 0) {
    if (rate === 0) {
      monthly = Math.floor(financed / months);
      last = financed - monthly * (months - 1);
    } else {
      const r = rate / 100 / 12;
      monthly = Math.round((financed * r) / (1 - Math.pow(1 + r, -months)));
      // Exact amortization in cents to size the last installment.
      let balance = financed;
      for (let i = 1; i < months; i++) {
        const interest = Math.round(balance * r);
        balance = balance + interest - monthly;
      }
      last = balance + Math.round(balance * r);
    }
    totalInstallments = monthly * (months - 1) + last;
  }

  return {
    price: fromCents(price),
    discount: fromCents(discount),
    netPrice: fromCents(net),
    downPaymentPct: pct,
    downPayment: fromCents(down),
    financed: fromCents(financed),
    months: financed > 0 ? months : 0,
    annualRatePct: rate,
    monthlyPayment: fromCents(monthly),
    lastPayment: fromCents(last),
    totalInterest: fromCents(totalInstallments - financed),
    totalPaid: fromCents(down + totalInstallments),
  };
}

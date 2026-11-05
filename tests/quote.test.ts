import { describe, expect, it } from "vitest";
import { calculateQuote, QuoteInputError } from "@/lib/quote";

describe("calculateQuote", () => {
  it("interest-free plan: enganche + equal installments", () => {
    const q = calculateQuote({ price: 600_000, downPaymentPct: 20, months: 24 });
    expect(q.downPayment).toBe(120_000);
    expect(q.financed).toBe(480_000);
    expect(q.monthlyPayment).toBe(20_000);
    expect(q.lastPayment).toBe(20_000);
    expect(q.totalInterest).toBe(0);
    expect(q.totalPaid).toBe(600_000);
  });

  it("last installment absorbs rounding so the total is exact", () => {
    const q = calculateQuote({ price: 100_000, downPaymentPct: 0, months: 3 });
    expect(q.monthlyPayment).toBe(33_333.33);
    expect(q.lastPayment).toBe(33_333.34);
    expect(q.monthlyPayment * 2 + q.lastPayment).toBeCloseTo(100_000, 6);
    expect(q.totalPaid).toBe(100_000);
  });

  it("applies discount before computing the down payment", () => {
    const q = calculateQuote({ price: 500_000, discount: 25_000, downPaymentPct: 10, months: 12 });
    expect(q.netPrice).toBe(475_000);
    expect(q.downPayment).toBe(47_500);
    expect(q.financed).toBe(427_500);
    expect(q.monthlyPayment).toBe(35_625);
    expect(q.totalPaid).toBe(475_000);
  });

  it("amortizes with interest (matches the standard annuity formula)", () => {
    // 1,000,000 financed at 12% annual for 12 months -> 88,848.79 per month
    const q = calculateQuote({ price: 1_000_000, downPaymentPct: 0, months: 12, annualRatePct: 12 });
    expect(q.monthlyPayment).toBe(88_848.79);
    expect(Math.abs(q.lastPayment - q.monthlyPayment)).toBeLessThan(0.1);
    expect(q.totalInterest).toBeCloseTo(66_185.45, 0);
    expect(q.totalPaid).toBeCloseTo(q.netPrice + q.totalInterest, 6);
  });

  it("100% down payment (contado) has no installments", () => {
    const q = calculateQuote({ price: 450_000, downPaymentPct: 100, months: 0 });
    expect(q).toMatchObject({ downPayment: 450_000, financed: 0, months: 0, monthlyPayment: 0, totalPaid: 450_000 });
  });

  it("single installment", () => {
    const q = calculateQuote({ price: 10_000.5, downPaymentPct: 50, months: 1 });
    expect(q.downPayment).toBe(5_000.25);
    expect(q.lastPayment).toBe(5_000.25);
    expect(q.totalPaid).toBe(10_000.5);
  });

  it("handles fractional percentages and cents", () => {
    const q = calculateQuote({ price: 333_333.33, downPaymentPct: 12.5, months: 7 });
    expect(q.downPayment).toBe(41_666.67);
    expect(q.totalPaid).toBe(333_333.33);
  });

  it.each([
    [{ price: 0, downPaymentPct: 10, months: 12 }, /precio/],
    [{ price: 100, discount: 100, downPaymentPct: 10, months: 12 }, /descuento/],
    [{ price: 100, discount: -1, downPaymentPct: 10, months: 12 }, /negativo/],
    [{ price: 100, downPaymentPct: 101, months: 12 }, /enganche/],
    [{ price: 100, downPaymentPct: 10, months: 0 }, /plazo/],
    [{ price: 100, downPaymentPct: 10, months: 12.5 }, /plazo/],
    [{ price: 100, downPaymentPct: 10, months: 400 }, /plazo/],
    [{ price: 100, downPaymentPct: 10, months: 12, annualRatePct: -1 }, /tasa/],
    [{ price: Number.NaN, downPaymentPct: 10, months: 12 }, /precio/],
  ])("rejects invalid input %#", (input, msg) => {
    expect(() => calculateQuote(input)).toThrow(QuoteInputError);
    expect(() => calculateQuote(input)).toThrow(msg);
  });
});

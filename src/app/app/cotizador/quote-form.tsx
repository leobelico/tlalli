"use client";

import { useMemo, useState } from "react";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { calculateQuote, type QuoteResult } from "@/lib/quote";
import { policyReasons, type QuotePolicy } from "@/lib/policy";
import { formatMoney } from "@/lib/format";
import { createQuoteAction } from "./actions";

export type UnitOption = { id: string; label: string; price: number };
export type LeadOption = { id: string; label: string };

export function QuoteForm({
  units,
  leads,
  initialUnitId,
  initialLeadId,
  policy,
}: {
  units: UnitOption[];
  leads: LeadOption[];
  initialUnitId?: string;
  initialLeadId?: string;
  /** Asesor guard rails (null = no limit, e.g. admins). */
  policy?: QuotePolicy | null;
}) {
  const [unitId, setUnitId] = useState(initialUnitId ?? "");
  const [discount, setDiscount] = useState("");
  const [pct, setPct] = useState("20");
  const [months, setMonths] = useState("24");
  const [rate, setRate] = useState("0");
  const unit = units.find((u) => u.id === unitId);
  const maxDiscountPct = policy?.capPct ?? null;

  // Live preview uses the same pure function as the server.
  const preview = useMemo<{ r?: QuoteResult; error?: string }>(() => {
    if (!unit) return {};
    try {
      return {
        r: calculateQuote({
          price: unit.price,
          discount: Number(discount) || 0,
          downPaymentPct: Number(pct),
          months: Number(months),
          annualRatePct: Number(rate) || 0,
        }),
      };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [unit, discount, pct, months, rate]);

  const reasons = useMemo(() => (policy && preview.r ? policyReasons(preview.r, policy).map((r) => r.text) : []), [policy, preview.r]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <ActionForm action={createQuoteAction} className="card space-y-4 p-5">
        <Field label="Unidad" name="unitId">
          <select id="unitId" name="unitId" className="input" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">Selecciona una unidad…</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cliente (opcional)" name="leadId" hint="Si eliges un lead, la cotización queda en su historial y pasa a la etapa Cotización.">
          <select id="leadId" name="leadId" className="input" defaultValue={initialLeadId ?? ""}>
            <option value="">— Público en general —</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Descuento (MXN)"
            name="discount"
            hint={
              maxDiscountPct == null
                ? undefined
                : unit
                  ? `Sin autorización puedes dar hasta ${maxDiscountPct}% (${formatMoney((unit.price * maxDiscountPct) / 100)}). Arriba de eso se envía a un administrador.`
                  : `Sin autorización puedes dar hasta ${maxDiscountPct}%. Arriba de eso se envía a un administrador.`
            }
          >
            <input id="discount" name="discount" type="number" min="0" step="0.01" className="input" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </Field>
          <Field label="Enganche (%)" name="downPaymentPct">
            <input id="downPaymentPct" name="downPaymentPct" type="number" min="0" max="100" step="0.5" className="input" value={pct} onChange={(e) => setPct(e.target.value)} />
          </Field>
          <Field label="Plazo (meses)" name="months">
            <input id="months" name="months" type="number" min="0" max="360" step="1" className="input" value={months} onChange={(e) => setMonths(e.target.value)} />
          </Field>
          <Field label="Tasa anual (%)" name="annualRatePct" hint="0 = sin intereses">
            <input id="annualRatePct" name="annualRatePct" type="number" min="0" max="60" step="0.1" className="input" value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
        </div>
        <SubmitButton pendingText="Generando…">Guardar y generar PDF</SubmitButton>
      </ActionForm>

      <aside className="card h-fit p-5" aria-live="polite">
        <h2 className="mb-3 font-semibold">Vista previa</h2>
        {!unit ? (
          <p className="text-sm text-stone-500">Selecciona una unidad para calcular.</p>
        ) : preview.error ? (
          <p className="text-sm text-red-600">{preview.error}</p>
        ) : preview.r ? (
          <dl className="space-y-2 text-sm">
            <Row label="Precio" value={formatMoney(preview.r.netPrice)} />
            <Row label={`Enganche (${preview.r.downPaymentPct}%)`} value={formatMoney(preview.r.downPayment)} />
            <Row label="Saldo" value={formatMoney(preview.r.financed)} />
            <Row label={`Mensualidad × ${preview.r.months}`} value={formatMoney(preview.r.monthlyPayment)} strong />
            {preview.r.totalInterest > 0 ? <Row label="Intereses" value={formatMoney(preview.r.totalInterest)} /> : null}
            <Row label="Total" value={formatMoney(preview.r.totalPaid)} strong />
            {reasons.length ? (
              <div role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                <p className="font-medium">Necesita autorización de un administrador:</p>
                <ul className="ml-4 list-disc">
                  {reasons.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </dl>
        ) : null}
      </aside>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "font-semibold" : ""}`}>
      <dt className="text-stone-600">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import { ActionForm, SubmitButton, useFormState } from "@/components/form";
import { analyzeLeadAction, insightsAction } from "@/app/app/ai-actions";
import type { LeadAnalysis, Insights } from "@/server/services/ai";
import { guardNetwork } from "@/lib/safe-action";

const TEMP: Record<LeadAnalysis["temperatura"], { label: string; cls: string }> = {
  caliente: { label: "Caliente", cls: "bg-stake/15 text-[#a63a10]" },
  tibio: { label: "Tibio", cls: "bg-amber-100 text-amber-800" },
  frio: { label: "Frío", cls: "bg-sky-100 text-sky-800" },
};

function parse<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function AiBadge() {
  return <span className="rounded-sm bg-ink px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-paper">IA</span>;
}

export function LeadAssistant({ leadId, used, limit }: { leadId: string; used: number; limit: number }) {
  const [state, action, pending] = useActionState(guardNetwork(analyzeLeadAction), {});
  const [copied, setCopied] = useState(false);
  const r = parse<LeadAnalysis>(state.data?.result);
  return (
    <div>
      <form action={action}>
        <input type="hidden" name="leadId" value={leadId} />
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={pending}>
            {pending ? "Analizando…" : r ? "Analizar de nuevo" : "Analizar este lead"}
          </button>
          <span className="text-xs text-stone-500">
            {used} de {limit} consultas usadas este mes
          </span>
        </div>
      </form>
      {state.error ? (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {r ? (
        <div className="mt-4 space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TEMP[r.temperatura].cls}`}>{TEMP[r.temperatura].label}</span>
            <span className="text-stone-600">{r.motivo_temperatura}</span>
          </div>
          <p>{r.resumen}</p>
          <div className="border-l-2 border-brand-600 pl-3">
            <p className="font-medium">Siguiente paso</p>
            <p className="text-stone-700">{r.siguiente_paso}</p>
          </div>
          {r.borrador_whatsapp ? (
            <div>
              <p className="mb-1 font-medium">Borrador para WhatsApp</p>
              <p className="rounded-lg bg-[#d9fdd3] p-3 whitespace-pre-wrap">{r.borrador_whatsapp}</p>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  className="btn-secondary py-1 text-xs"
                  onClick={async () => {
                    await navigator.clipboard.writeText(r.borrador_whatsapp);
                    setCopied(true);
                  }}
                >
                  {copied ? "Copiado" : "Copiar borrador"}
                </button>
                <span className="text-xs text-stone-500">Revísalo antes de enviarlo: lo envías tú.</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function InsightsPanel({ desde, hasta, used, limit }: { desde: string; hasta: string; used: number; limit: number }) {
  return (
    <ActionForm action={insightsAction} className="space-y-3">
      <input type="hidden" name="desde" value={desde} />
      <input type="hidden" name="hasta" value={hasta} />
      <InsightsResult />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Analizando…">Analizar el periodo con IA</SubmitButton>
        <span className="text-xs text-stone-500">
          {used} de {limit} consultas usadas este mes
        </span>
      </div>
    </ActionForm>
  );
}


function InsightsResult() {
  const state = useFormState();
  const r = parse<Insights>(state.data?.result);
  if (!r) return null;
  return (
    <div className="space-y-4 text-sm">
      <p>{r.diagnostico}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1 font-medium">Qué encontramos</p>
          <ul className="list-disc space-y-1 pl-5 text-stone-700">
            {r.hallazgos.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-medium">Qué hacer esta semana</p>
          <ol className="list-decimal space-y-1 pl-5 text-stone-700">
            {r.acciones.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

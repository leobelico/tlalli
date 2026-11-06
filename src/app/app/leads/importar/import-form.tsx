"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/form";
import { importCsvAction } from "../actions";

export function ImportForm({ campaigns }: { campaigns: { id: string; name: string; code: string }[] }) {
  const [state, action] = useActionState(importCsvAction, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="file" className="label">
          Archivo CSV
        </label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" className="input" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="assign" className="label">
            Asignación
          </label>
          <select id="assign" name="assign" className="input" defaultValue="auto">
            <option value="auto">Repartir entre asesores (por carga de trabajo)</option>
            <option value="me">Asignarme todos</option>
            <option value="none">Dejar sin asignar</option>
          </select>
        </div>
        <div>
          <label htmlFor="campaignId" className="label">
            Campaña por defecto
          </label>
          <select id="campaignId" name="campaignId" className="input" defaultValue="">
            <option value="">— Usar la columna &quot;campana&quot; —</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" className="mt-1" />
        <span>
          Confirmo que las personas de este archivo nos dieron sus datos y aceptaron nuestro aviso de privacidad
          (LFPDPPP). Quedará registrado a mi nombre.
        </span>
      </label>
      <SubmitButton pendingText="Importando…">Importar</SubmitButton>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
          {state.fieldErrors?.consent ? ` ${state.fieldErrors.consent[0]}` : ""}
        </p>
      ) : null}
      {state.ok ? (
        <div className="space-y-2">
          <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {state.message}
          </p>
          {state.data?.unknownHeaders ? (
            <p className="text-xs text-stone-500">Columnas ignoradas: {state.data.unknownHeaders}</p>
          ) : null}
          {state.data?.errors ? (
            <pre className="max-h-64 overflow-auto rounded-lg bg-stone-100 p-3 text-xs whitespace-pre-wrap">
              {state.data.errors}
            </pre>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

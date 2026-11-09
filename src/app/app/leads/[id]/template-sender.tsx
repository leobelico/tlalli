"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/form";
import { sendTemplateAction } from "./whatsapp-actions";

export type TemplateOption = {
  name: string;
  label: string;
  body: string;
  variables: { label: string; value: string }[];
};

export function TemplateSender({ leadId, templates, disabledReason }: { leadId: string; templates: TemplateOption[]; disabledReason?: string }) {
  const [name, setName] = useState(templates[0]?.name ?? "");
  const tpl = templates.find((t) => t.name === name);
  const [values, setValues] = useState<Record<string, string[]>>(
    Object.fromEntries(templates.map((t) => [t.name, t.variables.map((v) => v.value)])),
  );
  if (!tpl) return null;
  const vals = values[tpl.name];
  // Placeholders never reach the screen: an empty field shows its plain name in brackets.
  const preview = tpl.body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => vals[Number(n) - 1] || `[${tpl.variables[Number(n) - 1]?.label ?? "dato"}]`);

  return (
    <ActionForm action={sendTemplateAction} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      <div>
        <label htmlFor="template" className="label">
          Mensaje predefinido
        </label>
        <select id="template" name="template" className="input" value={name} onChange={(e) => setName(e.target.value)}>
          {templates.map((t) => (
            <option key={t.name} value={t.name}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {tpl.variables.map((v, i) => (
          <div key={`${tpl.name}-${i}`}>
            <label className="mb-0.5 block text-xs text-stone-600" htmlFor={`var-${i}`}>
              {v.label}
            </label>
            <input
              id={`var-${i}`}
              name="vars"
              className="input py-1.5"
              value={vals[i] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [tpl.name]: prev[tpl.name].map((x, j) => (j === i ? e.target.value : x)) }))
              }
            />
          </div>
        ))}
      </div>
      <p className="rounded-lg bg-[#e7fbe6] p-3 text-sm text-stone-800">{preview}</p>
      {disabledReason ? <p className="text-xs text-amber-700">{disabledReason}</p> : null}
      <SubmitButton pendingText="Enviando…">Enviar plantilla</SubmitButton>
    </ActionForm>
  );
}

"use client";

import { useState } from "react";
import { Field } from "@/components/form";
import { CHANNEL_LABEL } from "@/lib/labels";
import { suggestCampaignCode as suggest } from "@/lib/campaign-code";

type Dev = { id: string; name: string };
type Initial = {
  name?: string;
  channel?: string;
  code?: string;
  spend?: string;
  startDate?: string;
  endDate?: string;
  developmentId?: string;
};

export function CampaignFields({ developments, initial = {}, idPrefix = "" }: { developments: Dev[]; initial?: Initial; idPrefix?: string }) {
  const [name, setName] = useState(initial.name ?? "");
  const [channel, setChannel] = useState(initial.channel ?? "RADIO");
  const [code, setCode] = useState(initial.code ?? "");
  const [touched, setTouched] = useState(Boolean(initial.code));
  const shownCode = touched ? code : suggest(channel, name);
  const id = (s: string) => `${idPrefix}${s}`;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nombre" name="name">
        <input id={id("name")} name="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Radio Exa octubre" />
      </Field>
      <Field label="Canal" name="channel">
        <select id={id("channel")} name="channel" className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
          {Object.entries(CHANNEL_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Código único" name="code" hint="Úsalo en el anuncio, la URL (?c=) o el formulario.">
        <input
          id={id("code")}
          name="code"
          className="input font-mono uppercase"
          value={shownCode}
          onChange={(e) => {
            setTouched(true);
            setCode(e.target.value.toUpperCase());
          }}
        />
      </Field>
      <Field label="Gasto total (MXN)" name="spend" hint="Para calcular costo por lead.">
        <input id={id("spend")} name="spend" type="number" min="0" step="0.01" className="input" defaultValue={initial.spend} />
      </Field>
      <Field label="Inicio" name="startDate">
        <input id={id("startDate")} name="startDate" type="date" className="input" defaultValue={initial.startDate} />
      </Field>
      <Field label="Fin" name="endDate">
        <input id={id("endDate")} name="endDate" type="date" className="input" defaultValue={initial.endDate} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Desarrollo que anuncia (opcional)" name="developmentId">
          <select id={id("developmentId")} name="developmentId" className="input" defaultValue={initial.developmentId ?? ""}>
            <option value="">— Varios / ninguno —</option>
            {developments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

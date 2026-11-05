import { Field } from "@/components/form";
import { CHANNEL_LABEL, UNIT_STATUS_LABEL } from "@/lib/labels";
import { formatMoney } from "@/lib/format";
import { formatPhone } from "@/lib/phone";

export type LeadFormOptions = {
  campaigns: { id: string; name: string; code: string }[];
  developments: { id: string; name: string }[];
  units: { id: string; code: string; price: unknown; status: keyof typeof UNIT_STATUS_LABEL; developmentId: string; development: { name: string } }[];
  agents: { id: string; name: string }[];
};

export type LeadInitial = {
  firstName?: string;
  lastName?: string | null;
  phone?: string;
  email?: string | null;
  campaignId?: string | null;
  channel?: string;
  developmentId?: string | null;
  unitId?: string | null;
  budget?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
};

export function LeadFields({
  options,
  initial = {},
  canAssign,
  defaultAssignee,
}: {
  options: LeadFormOptions;
  initial?: LeadInitial;
  canAssign: boolean;
  defaultAssignee?: string;
}) {
  const byDev = new Map<string, LeadFormOptions["units"]>();
  for (const u of options.units) {
    const list = byDev.get(u.development.name) ?? [];
    list.push(u);
    byDev.set(u.development.name, list);
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nombre(s)" name="firstName">
        <input id="firstName" name="firstName" className="input" defaultValue={initial.firstName} autoComplete="off" />
      </Field>
      <Field label="Apellidos" name="lastName">
        <input id="lastName" name="lastName" className="input" defaultValue={initial.lastName ?? ""} autoComplete="off" />
      </Field>
      <Field label="Teléfono / WhatsApp" name="phone" hint="10 dígitos. Se guarda como +52.">
        <input
          id="phone"
          name="phone"
          type="tel"
          className="input"
          defaultValue={initial.phone ? formatPhone(initial.phone) : ""}
          placeholder="444 123 4567"
        />
      </Field>
      <Field label="Correo" name="email">
        <input id="email" name="email" type="email" className="input" defaultValue={initial.email ?? ""} />
      </Field>
      <Field label="Campaña de origen" name="campaignId">
        <select id="campaignId" name="campaignId" className="input" defaultValue={initial.campaignId ?? ""}>
          <option value="">— Sin campaña —</option>
          {options.campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Canal (si no hay campaña)" name="channel">
        <select id="channel" name="channel" className="input" defaultValue={initial.channel ?? "OTRO"}>
          {Object.entries(CHANNEL_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Desarrollo de interés" name="developmentId">
        <select id="developmentId" name="developmentId" className="input" defaultValue={initial.developmentId ?? ""}>
          <option value="">— Sin definir —</option>
          {options.developments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Unidad de interés" name="unitId">
        <select id="unitId" name="unitId" className="input" defaultValue={initial.unitId ?? ""}>
          <option value="">— Ninguna —</option>
          {[...byDev.entries()].map(([dev, units]) => (
            <optgroup key={dev} label={dev}>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} · {formatMoney(String(u.price), false)} · {UNIT_STATUS_LABEL[u.status]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label="Presupuesto (MXN)" name="budget">
        <input id="budget" name="budget" type="number" min="0" step="1000" className="input" defaultValue={initial.budget ?? ""} />
      </Field>
      {canAssign ? (
        <Field label="Asesor asignado" name="assignedToId">
          <select
            id="assignedToId"
            name="assignedToId"
            className="input"
            defaultValue={initial.assignedToId ?? defaultAssignee ?? ""}
          >
            <option value="">— Sin asignar —</option>
            {options.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <input type="hidden" name="assignedToId" value={initial.assignedToId ?? defaultAssignee ?? ""} />
      )}
      <div className="sm:col-span-2">
        <Field label="Notas" name="notes">
          <textarea id="notes" name="notes" rows={3} className="input" defaultValue={initial.notes ?? ""} />
        </Field>
      </div>
    </div>
  );
}

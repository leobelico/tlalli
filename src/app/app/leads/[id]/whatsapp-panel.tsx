import { ActionForm, SubmitButton } from "@/components/form";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { TEMPLATES, type TemplateDef } from "@/server/whatsapp/templates";
import { isWithinServiceWindow } from "@/server/services/whatsapp";
import type { MessageStatus } from "@/generated/prisma/enums";
import { TemplateSender } from "./template-sender";
import { consentAction, sendTextAction, simulateInboundAction } from "./whatsapp-actions";

const STATUS_LABEL: Record<MessageStatus, string> = {
  EN_COLA: "En cola",
  ENVIADO: "✓ Enviado",
  ENTREGADO: "✓✓ Entregado",
  LEIDO: "✓✓ Leído",
  FALLIDO: "✕ Falló",
  RECIBIDO: "",
};

type Msg = {
  id: string;
  direction: "ENTRANTE" | "SALIENTE";
  body: string;
  templateName: string | null;
  status: MessageStatus;
  error: string | null;
  createdAt: Date;
};

export function WhatsAppPanel({
  lead,
  messages,
  context,
  providerName,
}: {
  lead: { id: string; firstName: string; consentAt: Date | null; lastInboundAt: Date | null };
  messages: Msg[];
  context: { development: string; agentName: string; orgName: string };
  providerName: "mock" | "cloud";
}) {
  const windowOpen = isWithinServiceWindow(lead.lastInboundAt);
  const valueFor = (source: TemplateDef["variables"][number]["source"]) =>
    ({
      leadFirstName: lead.firstName,
      development: context.development,
      agentName: context.agentName,
      orgName: context.orgName,
      free: "",
    })[source];
  const templates = TEMPLATES.map((t) => ({
    name: t.name,
    label: t.label,
    body: t.body,
    variables: t.variables.map((v) => ({ label: v.label, value: valueFor(v.source) })),
  }));

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">WhatsApp</h2>
        <span className="text-xs text-stone-500">
          {providerName === "mock" ? "Modo de prueba: no se envían mensajes reales" : "WhatsApp Business"} ·{" "}
          {windowOpen ? "te respondió hace menos de 24 h: puedes escribirle libremente" : "pasaron más de 24 h desde su último mensaje: solo mensajes predefinidos"}
        </span>
      </div>

      {!lead.consentAt ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <span>Sin consentimiento registrado: comparte el aviso de privacidad antes de enviar plantillas.</span>
          <form action={consentAction}>
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="granted" value="1" />
            <button className="btn-secondary py-1 text-xs">Registrar que aceptó el aviso</button>
          </form>
        </div>
      ) : null}

      <div className="mb-4 max-h-96 space-y-2 overflow-y-auto rounded-lg bg-[#efeae2] p-3">
        {messages.length === 0 ? <p className="text-center text-xs text-stone-500">Sin mensajes todavía.</p> : null}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.direction === "SALIENTE" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-xs ${
                m.direction === "SALIENTE" ? "bg-[#d9fdd3]" : "bg-white"
              }`}
            >
              {m.templateName ? <p className="mb-0.5 text-[10px] font-semibold text-stone-500 uppercase">Plantilla</p> : null}
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-right text-[10px] text-stone-500">
                {formatDateTime(m.createdAt)} {m.direction === "SALIENTE" ? STATUS_LABEL[m.status] : ""}
              </p>
              {m.error ? <p className="text-[11px] text-red-600">{m.error}</p> : null}
            </div>
          </div>
        ))}
      </div>

      {windowOpen ? (
        <ActionForm action={sendTextAction} resetOnSuccess className="mb-4 flex gap-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <input name="body" className="input" placeholder="Escribe una respuesta…" aria-label="Mensaje" />
          <SubmitButton pendingText="…">Enviar</SubmitButton>
        </ActionForm>
      ) : null}

      <details open={!windowOpen}>
        <summary className="cursor-pointer text-sm font-medium text-brand-700">Enviar plantilla</summary>
        <div className="mt-3">
          <TemplateSender
            leadId={lead.id}
            templates={templates}
            disabledReason={lead.consentAt ? undefined : "Requiere consentimiento registrado."}
          />
        </div>
      </details>

      {providerName === "mock" ? (
        <details className="mt-4 border-t border-stone-100 pt-3">
          <summary className="cursor-pointer text-xs text-stone-500">Simular mensaje entrante del prospecto (solo desarrollo)</summary>
          <ActionForm action={simulateInboundAction} resetOnSuccess className="mt-2 flex gap-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <input name="body" className="input" defaultValue="Hola, ¿me pasan precios y ubicación?" aria-label="Mensaje simulado" />
            <SubmitButton pendingText="…" className="btn-secondary">
              Simular
            </SubmitButton>
          </ActionForm>
        </details>
      ) : null}
    </Card>
  );
}

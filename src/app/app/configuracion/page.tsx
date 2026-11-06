import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { currentPrivacyNotice, getOrganization } from "@/server/services/organization";
import { getAiStatus } from "@/server/services/ai";
import { PLANS } from "@/lib/plans";
import { formatDate } from "@/lib/format";
import { privacyNoticeAction, regenerateFormKeyAction, settingsAction } from "./actions";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const { ctx } = await requireCtx("org:settings");
  const [org, notice, ai] = await Promise.all([getOrganization(ctx), currentPrivacyNotice(ctx), getAiStatus(ctx)]);
  const appUrl = process.env.APP_URL ?? "";
  const waProvider = process.env.WHATSAPP_PROVIDER === "cloud" ? "cloud" : "mock";
  const waConfigured = Boolean(process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_APP_SECRET);

  return (
    <>
      <PageHeader title="Configuración" description="Datos de tu organización, seguimiento, formularios y privacidad." />

      <Card className="mb-6">
        <h2 className="mb-1 font-semibold">Tu plan</h2>
        <p className="text-sm text-stone-700">
          Plan <strong>{PLANS[org.plan].name}</strong> · hasta {PLANS[org.plan].seats} usuarios ·{" "}
          {ai.enabled ? `IA: ${ai.used} de ${ai.limit} consultas usadas este mes` : "sin asistente de IA"}
        </p>
        <p className="mt-1 text-xs text-stone-500">Para cambiar de plan escríbenos; el cambio se aplica el mismo día.</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">General y seguimiento</h2>
          <ActionForm action={settingsAction} className="space-y-4">
            <Field label="Nombre de la organización" name="name">
              <input id="name" name="name" defaultValue={org.name} className="input" required />
            </Field>
            <Field
              label="Alerta de lead sin contacto (horas)"
              name="staleLeadHours"
              hint="Un lead activo se marca como 'frío' si pasa este tiempo sin que nadie lo contacte."
            >
              <input
                id="staleLeadHours"
                name="staleLeadHours"
                type="number"
                min={1}
                max={720}
                defaultValue={org.staleLeadHours}
                className="input"
              />
            </Field>
            <Field
              label="WhatsApp: Phone number ID (Meta)"
              name="waPhoneNumberId"
              hint="Lo encuentras en Meta for Developers → WhatsApp → Configuración de la API."
            >
              <input id="waPhoneNumberId" name="waPhoneNumberId" defaultValue={org.waPhoneNumberId ?? ""} className="input" inputMode="numeric" />
            </Field>
            <Field label="WhatsApp: número visible" name="waDisplayPhone">
              <input id="waDisplayPhone" name="waDisplayPhone" defaultValue={org.waDisplayPhone ?? ""} className="input" placeholder="+52 444 123 4567" />
            </Field>
            <SubmitButton>Guardar</SubmitButton>
          </ActionForm>
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold">Formulario web (webhook de leads)</h2>
          <p className="mb-3 text-sm text-stone-600">
            Usa esta llave en el formulario de tu sitio web o landing para enviar leads directamente al CRM. Es una
            llave pública de formulario: solo permite crear leads en tu organización.
          </p>
          <code className="block break-all rounded-lg bg-stone-100 p-3 text-xs">{org.leadFormKey}</code>
          <p className="mt-3 text-xs text-stone-500">
            Endpoint: <code>POST {appUrl}/api/public/leads</code>. Consulta el README para ver el formato.
          </p>
          <form action={regenerateFormKeyAction} className="mt-3">
            <button className="btn-secondary text-xs">Regenerar llave (la anterior dejará de funcionar)</button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-2 font-semibold">Conexión de WhatsApp</h2>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-stone-500">Proveedor</dt>
            <dd>{waProvider === "cloud" ? "WhatsApp Cloud API (Meta)" : "Simulado (desarrollo, no envía mensajes reales)"}</dd>
            <dt className="text-stone-500">URL del webhook</dt>
            <dd>
              <code className="break-all">{appUrl}/api/webhooks/whatsapp</code>
            </dd>
            <dt className="text-stone-500">Phone number ID</dt>
            <dd>{org.waPhoneNumberId ?? <span className="text-amber-700">Sin configurar (captúralo arriba)</span>}</dd>
            <dt className="text-stone-500">Token de verificación / App secret</dt>
            <dd>
              {waConfigured ? "Configurados en el servidor" : <span className="text-amber-700">Faltan variables de entorno</span>}
            </dd>
          </dl>
          <p className="mt-3 text-xs text-stone-500">
            Los pasos para conectar el número están en <code>docs/WHATSAPP.md</code>. Las plantillas deben aprobarse en Meta con el
            mismo nombre que usa el sistema.
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Aviso de privacidad (LFPDPPP)</h2>
          {notice ? (
            <p className="text-xs text-stone-500">
              Versión {notice.version} · publicada {formatDate(notice.createdAt)} ·{" "}
              <Link className="text-brand-700 underline" href={`/aviso-privacidad/${org.slug}`} target="_blank">
                ver página pública
              </Link>
            </p>
          ) : null}
        </div>
        <p className="mb-3 text-sm text-stone-600">
          Se muestra en tus formularios y en la liga pública. Cada cambio crea una nueva versión; el consentimiento de
          cada lead queda ligado a la versión que aceptó.
        </p>
        <ActionForm action={privacyNoticeAction} className="space-y-3">
          <Field label="Texto del aviso" name="content">
            <textarea id="content" name="content" rows={14} defaultValue={notice?.content ?? ""} className="input font-mono text-xs" />
          </Field>
          <SubmitButton pendingText="Publicando…">Publicar nueva versión</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}

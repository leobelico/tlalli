import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { currentPrivacyNotice, getOrganization } from "@/server/services/organization";
import { getAiStatus } from "@/server/services/ai";
import { PLANS } from "@/lib/plans";
import { formatDate } from "@/lib/format";
import { embedOriginsAction, privacyNoticeAction, regenerateFormKeyAction, settingsAction, stalePolicyAction, whatsAppSettingsAction } from "./actions";
import { BRAND } from "@/lib/brand";
import { DEFAULT_STAGE_HOURS, stalePolicy } from "@/lib/stale";
import { STAGE_LABEL } from "@/lib/labels";
import { TUNABLE_STAGES } from "@/server/services/organization";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const { ctx } = await requireCtx("org:settings");
  const [org, notice, ai] = await Promise.all([getOrganization(ctx), currentPrivacyNotice(ctx), getAiStatus(ctx)]);
  const policy = stalePolicy(org);
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
              label="Descuento máximo de los asesores (%)"
              name="maxAsesorDiscountPct"
              hint="Un asesor puede cotizar o vender con hasta este descuento sobre el precio de lista. Arriba de eso, la solicitud llega a un administrador para que la autorice. 0 = ningún descuento sin autorización."
            >
              <input
                id="maxAsesorDiscountPct"
                name="maxAsesorDiscountPct"
                type="number"
                min={0}
                max={100}
                defaultValue={org.maxAsesorDiscountPct}
                className="input"
              />
            </Field>
            <Field
              label="Tasa de referencia (% anual)"
              name="referenceRatePct"
              hint="Sirve para medir cuánto vale dar mensualidades sin intereses o a plazos largos. El descuento equivalente = precio de lista menos el valor presente de lo que paga el cliente a esta tasa. Si es mayor que el descuento máximo, el asesor necesita autorización. 0 = no medir el financiamiento."
            >
              <input id="referenceRatePct" name="referenceRatePct" type="number" min={0} max={60} step="0.5" defaultValue={org.referenceRatePct} className="input" />
            </Field>
            <Field label="Enganche mínimo para asesores (%)" name="asesorMinDownPct" hint="Con menos enganche, la cotización pasa a autorización.">
              <input id="asesorMinDownPct" name="asesorMinDownPct" type="number" min={0} max={100} step="0.5" defaultValue={org.asesorMinDownPct} className="input" />
            </Field>
            <Field label="Tasa anual mínima para asesores (%)" name="asesorMinRatePct" hint="0 = pueden cotizar sin intereses. Solo aplica si hay saldo a financiar.">
              <input id="asesorMinRatePct" name="asesorMinRatePct" type="number" min={0} max={60} step="0.5" defaultValue={org.asesorMinRatePct} className="input" />
            </Field>
            <Field label="Plazo máximo para asesores (meses)" name="asesorMaxMonths" hint="Más meses que esto pasa a autorización.">
              <input id="asesorMaxMonths" name="asesorMaxMonths" type="number" min={1} max={360} defaultValue={org.asesorMaxMonths} className="input" />
            </Field>
            <SubmitButton>Guardar</SubmitButton>
          </ActionForm>
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">Cuándo se considera frío un lead, por etapa</h2>
          <p className="mb-4 text-sm text-stone-600">
            Horas sin contacto antes de marcarlo en rojo. Un lead con una tarea o cita próxima nunca se marca como frío.
            &quot;Nuevo&quot; usa la alerta general de arriba. Deja vacío para usar el valor sugerido.
          </p>
          <ActionForm action={stalePolicyAction} className="grid gap-3 sm:grid-cols-2">
            {TUNABLE_STAGES.map((stage) => (
              <Field key={stage} label={STAGE_LABEL[stage]} name={stage} hint={`Sugerido: ${DEFAULT_STAGE_HOURS[stage]} h`}>
                <input
                  id={stage}
                  name={stage}
                  type="number"
                  min={1}
                  max={720}
                  className="input"
                  placeholder={String(DEFAULT_STAGE_HOURS[stage])}
                  defaultValue={policy.byStage[stage] ?? ""}
                />
              </Field>
            ))}
            <div className="sm:col-span-2">
              <SubmitButton>Guardar límites</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-1 font-semibold">Tu formulario de contacto</h2>
          <p className="mb-3 text-sm text-stone-600">
            Comparte esta liga (en redes, en un código QR o en un espectacular): quien la abra deja sus datos y entra directo a tu
            lista de leads, con su aviso de privacidad aceptado.
          </p>
          <code className="block break-all rounded-lg bg-stone-100 p-3 text-xs">{appUrl}/f/{org.slug}</code>
          <p className="mt-2 text-xs text-stone-500">
            Para saber de qué campaña viene cada persona, agrega <code>?c=</code> y el código de la campaña. Ejemplo:{" "}
            <code>{appUrl}/f/{org.slug}?c=RADIO-EXA</code>
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <details>
          <summary className="cursor-pointer font-semibold">Avanzado: WhatsApp y conexión con tu sitio web</summary>
          <p className="mt-3 text-sm text-stone-600">
            Esta parte normalmente la configura nuestro equipo contigo. <strong>No necesitas tocarla para empezar a usar {BRAND.name}.</strong>{" "}
            Si quieres conectarla tú o necesitas ayuda, escríbenos a {BRAND.supportEmail}.
          </p>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <section>
              <h3 className="mb-2 text-sm font-semibold">WhatsApp Business</h3>
              <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                <dt className="text-stone-500">Estado</dt>
                <dd>
                  {waProvider === "cloud" && waConfigured ? "Conectado a WhatsApp Business" : <span className="text-amber-700">Modo de prueba: los mensajes no se envían de verdad</span>}
                </dd>
                <dt className="text-stone-500">Número</dt>
                <dd>{org.waPhoneNumberId ? "Registrado" : <span className="text-amber-700">Aún sin registrar</span>}</dd>
                <dt className="text-stone-500">Claves del servidor</dt>
                <dd>{waConfigured ? "Configuradas" : <span className="text-amber-700">Faltan (las pone el equipo técnico)</span>}</dd>
              </dl>
              <ActionForm action={whatsAppSettingsAction} className="mt-4 space-y-3">
                <Field
                  label="Identificador de tu número de WhatsApp Business"
                  name="waPhoneNumberId"
                  hint="Es un número largo que aparece en la cuenta de WhatsApp Business de tu empresa. Si no lo tienes, déjalo vacío y escríbenos."
                >
                  <input id="waPhoneNumberId" name="waPhoneNumberId" defaultValue={org.waPhoneNumberId ?? ""} className="input" inputMode="numeric" />
                </Field>
                <Field label="Teléfono que ven tus clientes" name="waDisplayPhone">
                  <input id="waDisplayPhone" name="waDisplayPhone" defaultValue={org.waDisplayPhone ?? ""} className="input" placeholder="+52 444 123 4567" />
                </Field>
                <SubmitButton>Guardar datos de WhatsApp</SubmitButton>
              </ActionForm>
              <p className="mt-3 text-xs text-stone-500">
                Dirección de recepción de mensajes (para quien conecte el número): <code className="break-all">{appUrl}/api/webhooks/whatsapp</code>
              </p>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Conectar el formulario de tu propio sitio web</h3>
              <p className="mb-3 text-sm text-stone-600">
                Si tu sitio ya tiene un formulario, tu programador puede enviar los datos a {BRAND.name} con esta llave. Solo sirve para
                registrar contactos nuevos en tu organización.
              </p>
              <code className="block break-all rounded-lg bg-stone-100 p-3 text-xs">{org.leadFormKey}</code>
              <p className="mt-3 text-xs text-stone-500">
                Dirección de envío: <code>POST {appUrl}/api/public/leads</code>
              </p>
              <form action={regenerateFormKeyAction} className="mt-3">
                <button className="btn-secondary text-xs">Generar una llave nueva (la anterior dejará de funcionar)</button>
              </form>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Mostrar tu formulario dentro de otra página</h3>
              <p className="mb-3 text-sm text-stone-600">
                Por seguridad, tu formulario ({appUrl}/f/{org.slug}) no puede aparecer dentro de otros sitios. Si quieres mostrarlo en tu propia
                página, escribe aquí el sitio (uno por línea, con https://). Solo esos sitios podrán hacerlo.
              </p>
              <ActionForm action={embedOriginsAction} className="space-y-3">
                <Field label="Sitios permitidos" name="origins" hint="Ejemplo: https://midesarrolladora.mx. Déjalo vacío para que nadie pueda.">
                  <textarea id="origins" name="origins" rows={3} className="input" defaultValue={org.formEmbedOrigins.join(", ")} />
                </Field>
                <SubmitButton>Guardar sitios</SubmitButton>
              </ActionForm>
            </section>
          </div>
        </details>
      </Card>

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

"use client";

import { useState } from "react";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import type { ActionState } from "@/lib/validation/common";
import { inviteAction } from "./actions";

export function InviteForm() {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <ActionForm
        action={inviteAction}
        resetOnSuccess
        onSuccess={(s: ActionState) => {
          setLink(s.data?.link ?? null);
          setCopied(false);
        }}
        className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end"
      >
        <Field label="Correo de la persona" name="email">
          <input id="email" name="email" type="email" required className="input" placeholder="asesor@tuinmobiliaria.mx" />
        </Field>
        <Field label="Rol" name="role">
          <select id="role" name="role" className="input" defaultValue="ASESOR">
            <option value="ASESOR">Asesor</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </Field>
        <SubmitButton pendingText="Generando…">Invitar</SubmitButton>
      </ActionForm>
      {link ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3">
          <code className="min-w-0 flex-1 truncate text-xs">{link}</code>
          <button
            type="button"
            className="btn-secondary py-1 text-xs"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
          <a
            className="btn-secondary py-1 text-xs"
            target="_blank"
            rel="noreferrer"
            href={`https://wa.me/?text=${encodeURIComponent(`Te invito a unirte a nuestro CRM: ${link}`)}`}
          >
            Enviar por WhatsApp
          </a>
        </div>
      ) : null}
    </div>
  );
}

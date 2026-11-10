"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePlanAction } from "../actions";

const MAX_BYTES = 5 * 1024 * 1024;

export function PlanUpload({ developmentId, replace = false }: { developmentId: string; replace?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function upload(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("El plano pesa más de 5 MB. Exporta una imagen más ligera.");
      return;
    }
    if (
      replace &&
      !confirm(
        "Se reemplazará el plano. Los lotes ya marcados conservan su posición, así que revísalos si el nuevo plano tiene otra proporción. ¿Continuar?",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(`/api/developments/${developmentId}/plan`, {
        method: "POST",
        body,
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(json.error ?? "No se pudo subir el plano.");
      else startTransition(() => router.refresh());
    } catch {
      setError("No se pudo subir el plano. Revisa tu conexión.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className={replace ? "btn btn-secondary cursor-pointer text-xs" : "btn btn-primary cursor-pointer"}>
        {busy ? "Subiendo…" : replace ? "Reemplazar plano" : "Subir plano"}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) void upload(f);
          }}
        />
      </label>
      {error ? (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DeletePlanButton({ developmentId }: { developmentId: string }) {
  const [state, action, pending] = useActionState(deletePlanAction, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("¿Quitar el plano? Se perderá el marcado de todos los lotes (las unidades no se borran)."))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="developmentId" value={developmentId} />
      <button className="btn btn-ghost text-xs text-red-700" disabled={pending}>
        Quitar plano
      </button>
      {state.error ? <p className="mt-1 text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { UNIT_STATUS_LABEL } from "@/lib/labels";
import { deleteUnitAction, unitStatusAction } from "../actions";
import { guardNetwork } from "@/lib/safe-action";

export function UnitStatusSelect({ id, developmentId, status }: { id: string; developmentId: string; status: string }) {
  const [state, action] = useActionState(guardNetwork(unitStatusAction), {});
  const formRef = useRef<HTMLFormElement>(null);
  // When the server refuses the change, put the select back to the real status.
  useEffect(() => {
    if (state.error) formRef.current?.reset();
  }, [state]);
  return (
    <form action={action} ref={formRef}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="developmentId" value={developmentId} />
      <select
        name="status"
        defaultValue={status}
        aria-label="Estatus de la unidad"
        className="input w-auto py-1 text-xs"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {Object.entries(UNIT_STATUS_LABEL).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {state.error ? <p role="alert" className="mt-1 max-w-56 text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function DeleteUnitButton({ id, developmentId, code }: { id: string; developmentId: string; code: string }) {
  const [state, action, pending] = useActionState(guardNetwork(deleteUnitAction), {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`¿Borrar la unidad ${code}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="developmentId" value={developmentId} />
      <button className="text-xs text-red-700 hover:underline" disabled={pending}>
        Borrar
      </button>
      {state.error ? <p className="mt-1 max-w-48 text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

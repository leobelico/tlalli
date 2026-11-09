"use client";

import { useActionState } from "react";
import { memberAction } from "./actions";
import { guardNetwork } from "@/lib/safe-action";

export function MemberRowActions({ id, active, role, isSelf }: { id: string; active: boolean; role: string; isSelf: boolean }) {
  const [state, action, pending] = useActionState(guardNetwork(memberAction), {});
  if (isSelf) return <span className="text-xs text-stone-400">Tú</span>;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="op" value="role" />
        <input type="hidden" name="role" value={role === "ADMIN" ? "ASESOR" : "ADMIN"} />
        <button className="btn-ghost px-2 py-1 text-xs" disabled={pending}>
          {role === "ADMIN" ? "Hacer asesor" : "Hacer admin"}
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="op" value={active ? "deactivate" : "activate"} />
        <button className="btn-ghost px-2 py-1 text-xs text-red-700" disabled={pending}>
          {active ? "Desactivar" : "Reactivar"}
        </button>
      </form>
      {state.error ? <span className="w-full text-right text-xs text-red-600">{state.error}</span> : null}
    </div>
  );
}

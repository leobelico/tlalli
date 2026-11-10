"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { UndoToast } from "../pipeline/undo-toast";
import { reassignFilteredAction, undoReassignAction } from "./actions";

/**
 * "Pasar estos leads a…" for the current filters (QA B17). Asks first, saying how many open leads it
 * touches, and offers "Deshacer" for 10 seconds afterwards (QA2 B37). Sold and lost leads never move.
 */
export function BulkReassign({
  total,
  filters,
  agents,
}: {
  total: number;
  filters: Record<string, string>;
  agents: { id: string; name: string }[];
}) {
  const [to, setTo] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [undo, setUndo] = useState<{ batchId: string; message: string } | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [busy, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const closeUndo = useCallback(() => setUndo(null), []);
  const targetName = to === "none" ? "sin asignar" : (agents.find((a) => a.id === to)?.name ?? "");
  const filtered = Object.keys(filters).length > 0;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (confirm && !d.open) d.showModal();
    else if (!confirm && d.open) d.close();
  }, [confirm]);

  function run() {
    setConfirm(false);
    setError("");
    setNotice("");
    setUndo(null);
    const fd = new FormData();
    for (const [k, v] of Object.entries(filters)) fd.set(k, v);
    fd.set("to", to);
    startTransition(async () => {
      const res = await reassignFilteredAction({}, fd);
      if (res.error) setError(res.error);
      else {
        setNotice(res.message ?? "");
        if (res.data?.batchId) setUndo({ batchId: res.data.batchId, message: res.message ?? "Listo." });
      }
    });
  }

  async function doUndo() {
    if (!undo) return;
    setUndoBusy(true);
    const res = await undoReassignAction(undo.batchId);
    setUndoBusy(false);
    setUndo(null);
    if (res.error) setError(res.error);
    else setNotice(res.message ?? "Se deshizo.");
  }

  return (
    <details className="card mb-4 p-4">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-brand-700">Reasignar los leads de esta lista</summary>
      <form
        className="mt-3 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (to) setConfirm(true);
        }}
      >
        <label className="text-sm">
          <span className="label">
            Pasar los {total} leads abiertos de esta lista a
          </span>
          <select name="to" className="input" value={to} onChange={(e) => setTo(e.target.value)} required>
            <option value="" disabled>
              Elige a alguien…
            </option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            <option value="none">Dejar sin asignar</option>
          </select>
        </label>
        <button className="btn-primary min-h-11" disabled={busy || !to}>
          {busy ? "Reasignando…" : "Reasignar"}
        </button>
        <p className="w-full text-xs text-stone-500">Los vendidos y perdidos conservan a su asesor. Al nuevo responsable le llega un aviso por correo.</p>
        {error ? (
          <p role="alert" className="w-full text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {notice && !undo ? (
          <p role="status" className="w-full text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}
      </form>

      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          setConfirm(false);
        }}
        className="m-auto w-full max-w-sm rounded-xl p-0 backdrop:bg-black/40"
      >
        {confirm ? (
          <div className="space-y-4 p-6">
            <h2 className="text-lg font-semibold">¿Reasignar {total} {total === 1 ? "lead" : "leads"}?</h2>
            <p className="text-sm text-stone-700">
              Vas a pasar <strong>{total}</strong> {total === 1 ? "lead abierto" : "leads abiertos"} a <strong>{targetName}</strong>
              {filtered ? " (los que muestran los filtros de esta lista)" : ", que son todos los leads abiertos de la organización"}. Los vendidos y perdidos no se mueven.
              Tendrás 10 segundos para deshacerlo.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary min-h-11" onClick={() => setConfirm(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary min-h-11" autoFocus onClick={run}>
                Reasignar {total}
              </button>
            </div>
          </div>
        ) : null}
      </dialog>

      {undo ? <UndoToast message={undo.message} busy={undoBusy} onUndo={doUndo} onClose={closeUndo} /> : null}
    </details>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { LOST_REASON_LABEL } from "@/lib/labels";

export type PendingMove = { leadId: string; name: string; stage: "PERDIDO" | "VENDIDO"; suggestedAmount?: string };

export function StageDialog({
  move,
  onCancel,
  onConfirm,
}: {
  move: PendingMove | null;
  onCancel: () => void;
  onConfirm: (extra: { lostReason?: string; lostNote?: string; saleAmount?: string }) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (move && !d.open) {
      setReason("");
      setNote("");
      setAmount(move.suggestedAmount ?? "");
      setError("");
      d.showModal();
    } else if (!move && d.open) d.close();
  }, [move]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-full max-w-md rounded-xl p-0 backdrop:bg-black/40"
    >
      {move ? (
        <form
          className="space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (move.stage === "PERDIDO") {
              if (!reason) return setError("Selecciona el motivo.");
              if (reason === "OTRO" && !note.trim()) return setError("Describe el motivo.");
              onConfirm({ lostReason: reason, lostNote: note });
            } else {
              onConfirm({ saleAmount: amount });
            }
          }}
        >
          <h2 className="text-lg font-semibold">
            {move.stage === "PERDIDO" ? `Marcar a ${move.name} como perdido` : `¡Venta! ${move.name}`}
          </h2>
          {move.stage === "PERDIDO" ? (
            <>
              <div>
                <label htmlFor="lostReason" className="label">
                  Motivo de pérdida
                </label>
                <select id="lostReason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option value="">Selecciona…</option>
                  {Object.entries(LOST_REASON_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lostNote" className="label">
                  Comentario {reason === "OTRO" ? "(obligatorio)" : "(opcional)"}
                </label>
                <textarea id="lostNote" rows={2} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="saleAmount" className="label">
                Monto de la venta (MXN)
              </label>
              <input
                id="saleAmount"
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Si lo dejas vacío se usa el precio de la unidad"
              />
            </div>
          )}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button className={move.stage === "PERDIDO" ? "btn-danger" : "btn-primary"}>Confirmar</button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}

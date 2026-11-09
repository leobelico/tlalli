"use client";

import { useEffect, useRef } from "react";

export type ConfirmMove = { name: string; fromLabel: string; toLabel: string };

/** "¿Mover a Juan de Nuevo a Contactado?" Sales and losses keep their own dialog (they ask for data). */
export function ConfirmMoveDialog({
  move,
  onCancel,
  onConfirm,
}: {
  move: ConfirmMove | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (move && !d.open) d.showModal();
    else if (!move && d.open) d.close();
  }, [move]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-full max-w-sm rounded-xl p-0 backdrop:bg-black/40"
    >
      {move ? (
        <div className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">¿Cambiar de etapa?</h2>
          <p className="text-sm text-stone-700">
            Vas a mover a <strong>{move.name}</strong> de <strong>{move.fromLabel}</strong> a <strong>{move.toLabel}</strong>.
            Si te equivocas, tendrás 10 segundos para deshacerlo.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" autoFocus onClick={onConfirm}>
              Mover
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

"use client";

import { useEffect, useState } from "react";

export const UNDO_SECONDS = 10;

/** Bottom notice after a stage change: "Moviste a X a Y. [Deshacer (8 s)]". Disappears on its own. */
export function UndoToast({
  message,
  busy,
  onUndo,
  onClose,
}: {
  message: string;
  busy: boolean;
  onUndo: () => void;
  onClose: () => void;
}) {
  const [left, setLeft] = useState(UNDO_SECONDS);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      const remaining = UNDO_SECONDS - Math.floor((Date.now() - started) / 1000);
      if (remaining <= 0) {
        clearInterval(id);
        onClose();
      } else setLeft(remaining);
    }, 250);
    return () => clearInterval(id);
  }, [onClose]);
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-3 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-lg sm:left-auto sm:max-w-md"
    >
      <span>{message}</span>
      <button type="button" disabled={busy} onClick={onUndo} className="shrink-0 rounded-lg bg-white px-3 py-1.5 font-medium text-stone-900 disabled:opacity-60">
        {busy ? "Deshaciendo…" : `Deshacer (${left} s)`}
      </button>
    </div>
  );
}

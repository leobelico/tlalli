"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { STAGE_LABEL, STAGES } from "@/lib/labels";
import type { Stage } from "@/generated/prisma/enums";
import { moveStageAction, undoStageAction } from "./actions";
import { StageDialog, type PendingMove } from "./stage-dialog";
import { ConfirmMoveDialog } from "./confirm-move-dialog";
import { UndoToast } from "./undo-toast";

export function StageControl({ leadId, name, stage }: { leadId: string; name: string; stage: Stage }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [confirm, setConfirm] = useState<Stage | null>(null);
  const [undo, setUndo] = useState<{ eventId: string; message: string } | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  const closeUndo = useCallback(() => setUndo(null), []);

  function commit(to: Stage, extra: Record<string, string | undefined> = {}) {
    setError("");
    setNotice("");
    setUndo(null);
    startTransition(async () => {
      const res = await moveStageAction({ leadId, stage: to, ...extra });
      if (res.error) setError(res.error);
      else {
        // Above the asesor's limit: nothing changed, an admin got a request (pilot item 5).
        if (res.data?.pending) setNotice(res.message ?? "");
        else if (res.data?.eventId) setUndo({ eventId: res.data.eventId, message: `Moviste a ${name} a ${STAGE_LABEL[to]}.` });
        router.refresh();
      }
    });
  }

  async function doUndo() {
    if (!undo) return;
    setUndoBusy(true);
    const res = await undoStageAction(undo.eventId);
    setUndoBusy(false);
    if (res.error) setError(res.error);
    setUndo(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="stage-control" className="text-sm text-stone-600">
        Etapa
      </label>
      <select
        id="stage-control"
        className="input w-auto py-1.5"
        value={stage}
        disabled={busy}
        onChange={(e) => {
          const to = e.target.value as Stage;
          if (to === "PERDIDO" || to === "VENDIDO") setPending({ leadId, name, stage: to });
          else setConfirm(to); // every other move asks first, then offers "Deshacer"
        }}
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABEL[s]}
          </option>
        ))}
      </select>
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
      {notice ? (
        <span role="status" className="w-full rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {notice}
        </span>
      ) : null}
      <StageDialog
        move={pending}
        onCancel={() => setPending(null)}
        onConfirm={(extra) => {
          if (pending) commit(pending.stage, extra);
          setPending(null);
        }}
      />
      <ConfirmMoveDialog
        move={confirm ? { name, fromLabel: STAGE_LABEL[stage], toLabel: STAGE_LABEL[confirm] } : null}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const to = confirm;
          setConfirm(null);
          if (to) commit(to);
        }}
      />
      {undo ? <UndoToast message={undo.message} busy={undoBusy} onUndo={doUndo} onClose={closeUndo} /> : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { STAGE_LABEL, STAGES } from "@/lib/labels";
import type { Stage } from "@/generated/prisma/enums";
import { moveStageAction } from "./actions";
import { StageDialog, type PendingMove } from "./stage-dialog";

export function StageControl({ leadId, name, stage }: { leadId: string; name: string; stage: Stage }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  function commit(to: Stage, extra: Record<string, string | undefined> = {}) {
    setError("");
    startTransition(async () => {
      const res = await moveStageAction({ leadId, stage: to, ...extra });
      if (res.error) setError(res.error);
      else router.refresh();
    });
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
          else commit(to);
        }}
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABEL[s]}
          </option>
        ))}
      </select>
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
      <StageDialog
        move={pending}
        onCancel={() => setPending(null)}
        onConfirm={(extra) => {
          if (pending) commit(pending.stage, extra);
          setPending(null);
        }}
      />
    </div>
  );
}

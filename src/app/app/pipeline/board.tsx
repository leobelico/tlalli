"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { STAGE_LABEL, STAGES } from "@/lib/labels";
import { moveStageAction } from "./actions";
import { StageDialog, type PendingMove } from "./stage-dialog";
import type { Stage } from "@/generated/prisma/enums";

export type BoardCard = {
  id: string;
  name: string;
  campaign: string | null;
  development: string | null;
  unit: string | null;
  assignee: string | null;
  lastTouchLabel: string;
  stale: boolean;
  stage: Stage;
};

export type BoardColumn = { stage: Stage; count: number; cards: BoardCard[] };

const COLUMN_ACCENT: Record<Stage, string> = {
  NUEVO: "border-t-sky-400",
  CONTACTADO: "border-t-violet-400",
  CITA_AGENDADA: "border-t-violet-500",
  VISITA_REALIZADA: "border-t-indigo-500",
  COTIZACION: "border-t-amber-400",
  APARTADO: "border-t-amber-500",
  VENDIDO: "border-t-emerald-500",
  PERDIDO: "border-t-red-400",
};

export function Board({ initial, showAssignee }: { initial: BoardColumn[]; showAssignee: boolean }) {
  const router = useRouter();
  const [columns, setColumns] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  // Sync with fresh server data after router.refresh().
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setColumns(initial);
  }

  const findCard = (id: string) => columns.flatMap((c) => c.cards).find((c) => c.id === id);

  function applyMove(id: string, to: Stage) {
    setColumns((cols) => {
      const card = cols.flatMap((c) => c.cards).find((c) => c.id === id);
      if (!card) return cols;
      return cols.map((c) => {
        if (c.stage === card.stage) return { ...c, count: c.count - 1, cards: c.cards.filter((x) => x.id !== id) };
        if (c.stage === to) return { ...c, count: c.count + 1, cards: [{ ...card, stage: to }, ...c.cards] };
        return c;
      });
    });
  }

  function commit(id: string, to: Stage, extra: Record<string, string | undefined> = {}) {
    const snapshot = columns;
    setError("");
    applyMove(id, to);
    startTransition(async () => {
      const res = await moveStageAction({ leadId: id, stage: to, ...extra });
      if (res.error) {
        setColumns(snapshot);
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  function requestMove(id: string, to: Stage) {
    const card = findCard(id);
    if (!card || card.stage === to) return;
    if (to === "PERDIDO" || to === "VENDIDO") setPending({ leadId: id, name: card.name, stage: to });
    else commit(id, to);
  }

  return (
    <>
      {error ? (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
        {columns.map((col) => (
          <section
            key={col.stage}
            aria-label={STAGE_LABEL[col.stage]}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(col.stage);
            }}
            onDragLeave={() => setOver((o) => (o === col.stage ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData("text/plain") || dragId;
              if (id) requestMove(id, col.stage);
              setDragId(null);
            }}
            className={`flex w-64 shrink-0 flex-col rounded-xl border border-t-4 border-stone-200 bg-stone-100/70 ${COLUMN_ACCENT[col.stage]} ${
              over === col.stage ? "ring-2 ring-brand-400" : ""
            }`}
          >
            <header className="flex items-center justify-between px-3 py-2">
              <h2 className="text-sm font-semibold">{STAGE_LABEL[col.stage]}</h2>
              <span className="rounded-full bg-white px-2 text-xs font-medium text-stone-600 tabular-nums">{col.count}</span>
            </header>
            <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2" style={{ maxHeight: "calc(100vh - 230px)" }}>
              {col.cards.map((card) => (
                <article
                  key={card.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", card.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragId(card.id);
                  }}
                  onDragEnd={() => setDragId(null)}
                  className={`cursor-grab rounded-lg border bg-white p-2.5 shadow-xs active:cursor-grabbing ${
                    card.stale ? "border-red-300" : "border-stone-200"
                  } ${dragId === card.id ? "opacity-50" : ""}`}
                >
                  <Link href={`/app/leads/${card.id}`} className="text-sm font-medium hover:text-brand-700 hover:underline">
                    {card.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-stone-500">
                    {[card.development, card.unit].filter(Boolean).join(" · ") || "Sin desarrollo"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {card.campaign ? <code className="rounded bg-stone-100 px-1.5 py-0.5">{card.campaign}</code> : null}
                    <span className={card.stale ? "font-semibold text-red-600" : "text-stone-500"}>
                      {card.stale ? "Frío · " : ""}
                      {card.lastTouchLabel}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {showAssignee ? <span className="truncate text-[11px] text-stone-500">{card.assignee ?? "Sin asignar"}</span> : <span />}
                    <select
                      aria-label={`Mover a ${card.name}`}
                      value=""
                      onChange={(e) => e.target.value && requestMove(card.id, e.target.value as Stage)}
                      className="max-w-24 rounded border border-stone-200 bg-white px-1 py-0.5 text-[11px] text-stone-600"
                    >
                      <option value="">Mover a…</option>
                      {STAGES.filter((s) => s !== card.stage).map((s) => (
                        <option key={s} value={s}>
                          {STAGE_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}
              {col.count > col.cards.length ? (
                <p className="px-1 text-center text-xs text-stone-500">+{col.count - col.cards.length} más (usa los filtros)</p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
      <StageDialog
        move={pending}
        onCancel={() => setPending(null)}
        onConfirm={(extra) => {
          if (pending) commit(pending.leadId, pending.stage, extra);
          setPending(null);
        }}
      />
    </>
  );
}

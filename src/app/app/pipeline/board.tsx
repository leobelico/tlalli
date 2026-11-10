"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { STAGE_LABEL, STAGES } from "@/lib/labels";
import { moveStageAction, undoStageAction } from "./actions";
import { StageDialog, type PendingMove } from "./stage-dialog";
import { ConfirmMoveDialog } from "./confirm-move-dialog";
import { UndoToast } from "./undo-toast";
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
  NUEVO: "border-t-[#c9a27c]",
  CONTACTADO: "border-t-[#b8744a]",
  CITA_AGENDADA: "border-t-[#a5522c]",
  VISITA_REALIZADA: "border-t-[#8a3f1e]",
  COTIZACION: "border-t-accent",
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
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<{ id: string; to: Stage } | null>(null);
  const [undo, setUndo] = useState<{ eventId: string; message: string } | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const closeUndo = useCallback(() => setUndo(null), []);
  const [, startTransition] = useTransition();
  // Phones show one collapsible list per stage; the first stage with leads starts open (QA B14).
  const [openStages, setOpenStages] = useState<Set<Stage>>(() => new Set(initial.filter((c) => c.cards.length).slice(0, 1).map((c) => c.stage)));

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
    setNotice("");
    setUndo(null);
    const moved = findCard(id);
    applyMove(id, to);
    startTransition(async () => {
      const res = await moveStageAction({ leadId: id, stage: to, ...extra });
      if (res.error) {
        setColumns(snapshot);
        setError(res.error);
      } else if (res.data?.pending) {
        // Nothing moved: the request is waiting for an admin (pilot item 5).
        setColumns(snapshot);
        setNotice(res.message ?? "");
      } else {
        if (res.data?.eventId && moved) setUndo({ eventId: res.data.eventId, message: `Moviste a ${moved.name} a ${STAGE_LABEL[to]}.` });
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

  function requestMove(id: string, to: Stage) {
    const card = findCard(id);
    if (!card || card.stage === to) return;
    if (to === "PERDIDO" || to === "VENDIDO") setPending({ leadId: id, name: card.name, stage: to });
    else setConfirm({ id, to }); // asks first; then "Deshacer" is offered for 10 s
  }

  return (
    <>
      {error ? (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {notice}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 pb-4 md:-mx-8 md:flex-row md:overflow-x-auto md:px-8">
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
            className={`flex w-full shrink-0 flex-col rounded-xl border md:w-64 border-t-4 border-stone-200 bg-stone-100/70 ${COLUMN_ACCENT[col.stage]} ${
              over === col.stage ? "ring-2 ring-brand-400" : ""
            }`}
          >
            <header>
              <button
                type="button"
                aria-expanded={openStages.has(col.stage)}
                onClick={() =>
                  setOpenStages((s) => {
                    const next = new Set(s);
                    if (!next.delete(col.stage)) next.add(col.stage);
                    return next;
                  })
                }
                className="flex w-full items-center justify-between px-3 py-2.5 text-left md:pointer-events-none md:py-2"
              >
                <h2 className="text-sm font-semibold">{STAGE_LABEL[col.stage]}</h2>
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-white px-2 text-xs font-medium text-stone-600 tabular-nums">{col.count}</span>
                  <span aria-hidden className="text-xs text-stone-500 md:hidden">{openStages.has(col.stage) ? "▲" : "▼"}</span>
                </span>
              </button>
            </header>
            <div
              className={`flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 md:min-h-24 md:max-h-[calc(100vh-230px)] ${
                openStages.has(col.stage) ? "" : "max-md:hidden"
              }`}
            >
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
      <ConfirmMoveDialog
        move={
          confirm && findCard(confirm.id)
            ? { name: findCard(confirm.id)!.name, fromLabel: STAGE_LABEL[findCard(confirm.id)!.stage], toLabel: STAGE_LABEL[confirm.to] }
            : null
        }
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const c = confirm;
          setConfirm(null);
          if (c) commit(c.id, c.to);
        }}
      />
      {undo ? <UndoToast message={undo.message} busy={undoBusy} onUndo={doUndo} onClose={closeUndo} /> : null}
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

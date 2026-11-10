"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { shapeCentroid, type PlanPoint, type PlanShape } from "@/lib/plan-shape";
import { setUnitShapeAction } from "../actions";

export type PlanUnit = {
  id: string;
  code: string;
  typeLabel: string;
  status: "DISPONIBLE" | "APARTADO" | "VENDIDO";
  statusLabel: string;
  area: number | null;
  priceLabel: string;
  shape: PlanShape | null;
};

const COLORS = {
  DISPONIBLE: { fill: "#10b981", stroke: "#047857" },
  APARTADO: { fill: "#f59e0b", stroke: "#b45309" },
  VENDIDO: { fill: "#5a4b3e", stroke: "#3b2f25" },
} as const;

type Tool = "rect" | "poly";
type Drawing = { unitId: string; points: PlanPoint[] };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const toPoints = (shape: PlanShape) => shape.map(([x, y]) => `${x},${y}`).join(" ");

function pointInPolygon([x, y]: PlanPoint, shape: PlanShape): boolean {
  let inside = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const [xi, yi] = shape[i];
    const [xj, yj] = shape[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function rectFrom(a: PlanPoint, b: PlanPoint): PlanShape {
  return [
    [Math.min(a[0], b[0]), Math.min(a[1], b[1])],
    [Math.max(a[0], b[0]), Math.min(a[1], b[1])],
    [Math.max(a[0], b[0]), Math.max(a[1], b[1])],
    [Math.min(a[0], b[0]), Math.max(a[1], b[1])],
  ];
}

export function PlanBoard({
  developmentId,
  imageUrl,
  units: initialUnits,
  isAdmin,
}: {
  developmentId: string;
  imageUrl: string;
  units: PlanUnit[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [units, setUnits] = useState(initialUnits);
  // Re-sync with the server after router.refresh() (adjusting state during render, per the React docs).
  const [seen, setSeen] = useState(initialUnits);
  if (seen !== initialUnits) {
    setSeen(initialUnits);
    setUnits(initialUnits);
  }

  const [editing, setEditing] = useState(false);
  const [tool, setTool] = useState<Tool>("rect");
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<PlanPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // View transform (pan/zoom) over the image.
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [box, setBox] = useState({ w: 0, h: 0, ratio: 0.66 }); // frame size and image height/width ratio

  const innerW = box.w;
  const innerH = box.w * box.ratio;

  const fit = useCallback((w: number, h: number, ratio: number) => {
    const ih = w * ratio;
    const scale = Math.min(1, h / ih);
    setView({ scale, x: (w - w * scale) / 2, y: (h - ih * scale) / 2 });
  }, []);

  const measure = useCallback(
    (ratio?: number) => {
      const el = frameRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const r = ratio ?? box.ratio;
      setBox({ w, h, ratio: r });
      return { w, h, r };
    },
    [box.ratio],
  );

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setBox((b) => ({ ...b, w: el.clientWidth, h: el.clientHeight }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function onImageLoad(img: HTMLImageElement) {
    const m = measure(img.naturalHeight / img.naturalWidth);
    if (m) fit(m.w, m.h, m.r);
  }

  function zoomAt(factor: number, cx: number, cy: number) {
    setView((v) => {
      const scale = Math.min(8, Math.max(0.3, v.scale * factor));
      const k = scale / v.scale;
      return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  }

  // Wheel zoom needs a non-passive listener to prevent the page from scrolling.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const toFraction = useCallback((clientX: number, clientY: number): PlanPoint => {
    const r = svgRef.current!.getBoundingClientRect();
    return [clamp01((clientX - r.left) / r.width), clamp01((clientY - r.top) / r.height)];
  }, []);

  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const marked = units.filter((u) => u.shape).length;
  const selected = selectedId ? (unitById.get(selectedId) ?? null) : null;

  async function persist(unitId: string, shape: PlanShape | null) {
    setSaving(true);
    setError(null);
    setUnits((us) => us.map((u) => (u.id === unitId ? { ...u, shape } : u)));
    const res = await setUnitShapeAction(developmentId, unitId, shape);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      setUnits(initialUnits);
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  function nextUnmarkedAfter(unitId: string, list: PlanUnit[]) {
    const i = list.findIndex((u) => u.id === unitId);
    const order = [...list.slice(i + 1), ...list.slice(0, i)];
    return order.find((u) => !u.shape)?.id ?? null;
  }

  async function finishShape(unitId: string, shape: PlanShape) {
    const next = nextUnmarkedAfter(
      unitId,
      units.map((u) => (u.id === unitId ? { ...u, shape } : u)),
    );
    setDrawing(null);
    setCursor(null);
    const ok = await persist(unitId, shape);
    if (ok) {
      setSelectedId(next ?? unitId);
      if (next) setDrawing({ unitId: next, points: [] });
    }
  }

  function startDrawing(unitId: string) {
    setSelectedId(unitId);
    setDrawing({ unitId, points: [] });
    setError(null);
  }

  function handleClick(clientX: number, clientY: number) {
    const p = toFraction(clientX, clientY);
    if (editing && drawing) {
      if (tool === "rect") {
        if (drawing.points.length === 0) setDrawing({ ...drawing, points: [p] });
        else void finishShape(drawing.unitId, rectFrom(drawing.points[0], p));
        return;
      }
      // Polygon: clicking near the first point (with 3+ points) closes it.
      const first = drawing.points[0];
      if (first && drawing.points.length >= 3) {
        const r = svgRef.current!.getBoundingClientRect();
        const dx = (p[0] - first[0]) * r.width;
        const dy = (p[1] - first[1]) * r.height;
        if (Math.hypot(dx, dy) < 12) {
          void finishShape(drawing.unitId, drawing.points);
          return;
        }
      }
      setDrawing({ ...drawing, points: [...drawing.points, p] });
      return;
    }
    // Not drawing: select the lot under the cursor (pointer capture means polygons never get the click).
    const hit = [...units].reverse().find((u) => u.shape && pointInPolygon(p, u.shape));
    setSelectedId(hit?.id ?? null);
  }

  // Keyboard shortcuts while drawing.
  useEffect(() => {
    if (!editing || !drawing) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return;
      if (e.key === "Escape") {
        setDrawing(null);
        setCursor(null);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setDrawing((d) => (d ? { ...d, points: d.points.slice(0, -1) } : d));
      } else if (e.key === "Enter" && tool === "poly" && drawing.points.length >= 3) {
        void finishShape(drawing.unitId, drawing.points);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, drawing, tool]);

  // Pointer handling: drag = pan, click = draw/select (4px threshold).
  const pointer = useRef<{
    id: number;
    sx: number;
    sy: number;
    vx: number;
    vy: number;
    moved: boolean;
  } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    pointer.current = {
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      vx: view.x,
      vy: view.y,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const p = pointer.current;
    if (p && p.id === e.pointerId) {
      const dx = e.clientX - p.sx;
      const dy = e.clientY - p.sy;
      if (!p.moved && Math.hypot(dx, dy) > 4) p.moved = true;
      if (p.moved) setView((v) => ({ ...v, x: p.vx + dx, y: p.vy + dy }));
    }
    if (editing && drawing && svgRef.current) setCursor(toFraction(e.clientX, e.clientY));
  }
  function onPointerUp(e: React.PointerEvent) {
    const p = pointer.current;
    pointer.current = null;
    if (p && !p.moved) handleClick(e.clientX, e.clientY);
  }

  // Vertex dragging for the selected, already-marked unit.
  const vertexDrag = useRef<{ unitId: string; index: number } | null>(null);
  function onVertexDown(e: React.PointerEvent, unitId: string, index: number) {
    e.stopPropagation();
    vertexDrag.current = { unitId, index };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onVertexMove(e: React.PointerEvent) {
    const d = vertexDrag.current;
    if (!d) return;
    e.stopPropagation();
    const p = toFraction(e.clientX, e.clientY);
    setUnits((us) =>
      us.map((u) =>
        u.id === d.unitId && u.shape
          ? {
              ...u,
              shape: u.shape.map((q, i) => (i === d.index ? p : q)) as PlanShape,
            }
          : u,
      ),
    );
  }
  function onVertexUp(e: React.PointerEvent) {
    const d = vertexDrag.current;
    vertexDrag.current = null;
    if (!d) return;
    e.stopPropagation();
    const u = unitById.get(d.unitId);
    if (u?.shape) void persist(d.unitId, u.shape);
  }

  const hover = hoverId ? unitById.get(hoverId) : null;
  const drawingUnit = drawing ? unitById.get(drawing.unitId) : null;
  const previewShape: PlanShape | null = useMemo(() => {
    if (!drawing || !cursor || drawing.points.length === 0) return null;
    if (tool === "rect") return rectFrom(drawing.points[0], cursor);
    return null;
  }, [drawing, cursor, tool]);

  const sidebarUnits = units;
  const ready = box.w > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <div className="flex flex-wrap gap-3 text-xs text-stone-600" aria-label="Leyenda">
            {(["DISPONIBLE", "APARTADO", "VENDIDO"] as const).map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span className="inline-block size-3 rounded-sm" style={{ background: COLORS[s].fill, opacity: 0.7 }} />
                {s === "DISPONIBLE" ? "Disponible" : s === "APARTADO" ? "Apartado" : "Vendido"}
              </span>
            ))}
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-3 rounded-sm border border-dashed border-stone-500" />
              Sin marcar
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className="btn btn-secondary px-2 py-1"
              aria-label="Acercar"
              onClick={() => zoomAt(1.3, box.w / 2, box.h / 2)}
            >
              +
            </button>
            <button
              type="button"
              className="btn btn-secondary px-2 py-1"
              aria-label="Alejar"
              onClick={() => zoomAt(1 / 1.3, box.w / 2, box.h / 2)}
            >
              −
            </button>
            <button
              type="button"
              className="btn btn-secondary px-2 py-1 text-xs"
              onClick={() => fit(box.w, box.h, box.ratio)}
            >
              Ajustar
            </button>
            {isAdmin ? (
              <button
                type="button"
                className={editing ? "btn btn-primary px-3 py-1" : "btn btn-secondary px-3 py-1"}
                onClick={() => {
                  setEditing((e) => !e);
                  setDrawing(null);
                  setCursor(null);
                  setError(null);
                }}
              >
                {editing ? "Terminar edición" : "Marcar lotes"}
              </button>
            ) : null}
          </div>
        </div>

        {editing ? (
          <div className="mb-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
            {drawing && drawingUnit ? (
              <>
                Marcando <strong>{drawingUnit.code}</strong>:{" "}
                {tool === "rect"
                  ? drawing.points.length === 0
                    ? "haz clic en una esquina del lote."
                    : "haz clic en la esquina opuesta."
                  : drawing.points.length < 3
                    ? `haz clic en cada vértice (${drawing.points.length}/3 mínimo).`
                    : "sigue con los vértices; cierra haciendo clic en el primer punto o con Enter."}{" "}
                <span className="text-brand-700">Esc cancela · Retroceso quita el último punto.</span>
              </>
            ) : (
              "Elige un lote de la lista y márcalo sobre el plano. Arrastra con el mouse para mover el plano; la rueda hace zoom."
            )}
            <div className="mt-2 flex gap-1" role="group" aria-label="Herramienta">
              {(
                [
                  ["rect", "Rectángulo (2 clics)"],
                  ["poly", "Polígono"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={tool === v}
                  onClick={() => {
                    setTool(v);
                    if (drawing) setDrawing({ ...drawing, points: [] });
                  }}
                  className={`rounded-md px-2 py-1 text-xs ${tool === v ? "bg-brand-600 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300"}`}
                >
                  {label}
                </button>
              ))}
              {drawing && tool === "poly" && drawing.points.length >= 3 ? (
                <button
                  type="button"
                  className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white"
                  onClick={() => void finishShape(drawing.unitId, drawing.points)}
                >
                  Terminar lote
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div
          ref={frameRef}
          className={`relative h-[70vh] min-h-80 touch-none overflow-hidden rounded-lg border border-stone-300 bg-stone-100 select-none ${editing && drawing ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (pointer.current = null)}
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: innerW || "100%",
              height: innerH || undefined,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              visibility: ready ? "visible" : "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Plano del desarrollo"
              draggable={false}
              className="block h-full w-full"
              onLoad={(e) => onImageLoad(e.currentTarget)}
            />
            <svg ref={svgRef} className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
              {units.map((u) => {
                if (!u.shape) return null;
                const c = COLORS[u.status];
                const isSel = u.id === selectedId;
                const isHover = u.id === hoverId;
                return (
                  <polygon
                    key={u.id}
                    points={toPoints(u.shape)}
                    fill={c.fill}
                    fillOpacity={isHover || isSel ? 0.7 : 0.45}
                    stroke={isSel ? "#f0531c" : c.stroke}
                    strokeWidth={isSel ? 3 : 1.5}
                    vectorEffect="non-scaling-stroke"
                    className="cursor-pointer"
                    onPointerEnter={() => setHoverId(u.id)}
                    onPointerLeave={() => setHoverId((h) => (h === u.id ? null : h))}
                  >
                    <title>{`${u.code} · ${u.statusLabel}`}</title>
                  </polygon>
                );
              })}
              {previewShape ? (
                <polygon
                  points={toPoints(previewShape)}
                  fill="#f0531c"
                  fillOpacity={0.2}
                  stroke="#f0531c"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {drawing && tool === "poly" && drawing.points.length > 0 ? (
                <polyline
                  points={toPoints(cursor ? [...drawing.points, cursor] : drawing.points)}
                  fill="none"
                  stroke="#f0531c"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </svg>

            {/* Labels and handles are HTML so they keep a constant on-screen size while zooming. */}
            {units.map((u) => {
              if (!u.shape || !ready) return null;
              const xs = u.shape.map((p) => p[0]);
              const ys = u.shape.map((p) => p[1]);
              const wPx = (Math.max(...xs) - Math.min(...xs)) * innerW * view.scale;
              const hPx = (Math.max(...ys) - Math.min(...ys)) * innerH * view.scale;
              if (wPx < 30 || hPx < 14) return null;
              const [cx, cy] = shapeCentroid(u.shape);
              return (
                <span
                  key={u.id}
                  className="pointer-events-none absolute rounded bg-white/85 px-1 text-[10px] leading-4 font-semibold text-stone-900 shadow-sm"
                  style={{
                    left: `${cx * 100}%`,
                    top: `${cy * 100}%`,
                    transform: `translate(-50%, -50%) scale(${1 / view.scale})`,
                  }}
                >
                  {u.code}
                </span>
              );
            })}
            {drawing?.points.map((p, i) => (
              <span
                key={i}
                className="pointer-events-none absolute size-2.5 rounded-full border-2 border-white bg-stake"
                style={{
                  left: `${p[0] * 100}%`,
                  top: `${p[1] * 100}%`,
                  transform: `translate(-50%, -50%) scale(${1 / view.scale})`,
                }}
              />
            ))}
            {editing && !drawing && selected?.shape
              ? selected.shape.map((p, i) => (
                  <span
                    key={i}
                    role="presentation"
                    className="absolute size-3.5 cursor-move rounded-full border-2 border-white bg-stake shadow"
                    style={{
                      left: `${p[0] * 100}%`,
                      top: `${p[1] * 100}%`,
                      transform: `translate(-50%, -50%) scale(${1 / view.scale})`,
                    }}
                    onPointerDown={(e) => onVertexDown(e, selected.id, i)}
                    onPointerMove={onVertexMove}
                    onPointerUp={onVertexUp}
                  />
                ))
              : null}
          </div>

          {hover && !(editing && drawing) ? (
            <div className="pointer-events-none absolute top-2 left-2 rounded-lg bg-ink/90 px-3 py-2 text-xs text-white shadow-lg">
              <p className="font-semibold">{hover.code}</p>
              <p>
                {hover.typeLabel} · {hover.statusLabel}
              </p>
              <p>
                {hover.area ? `${hover.area.toLocaleString("es-MX")} m² · ` : ""}
                {hover.priceLabel}
              </p>
            </div>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-stone-500">
          {marked} de {units.length} lotes marcados en el plano.
          {saving ? " Guardando…" : ""}
        </p>
      </div>

      <aside className="space-y-3">
        {selected && !editing ? (
          <div className="card p-4 text-sm">
            <p className="text-base font-semibold">{selected.code}</p>
            <p className="text-stone-600">
              {selected.typeLabel} · {selected.statusLabel}
            </p>
            <p className="mt-1">
              {selected.area ? `${selected.area.toLocaleString("es-MX")} m² · ` : ""}
              <strong>{selected.priceLabel}</strong>
            </p>
            <Link href={`/app/cotizador?unidad=${selected.id}`} className="btn btn-primary mt-3 w-full">
              Cotizar
            </Link>
          </div>
        ) : null}

        <div className="card max-h-[60vh] overflow-y-auto p-0">
          <p className="sticky top-0 border-b border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-500">
            {editing ? "Lotes (elige uno para marcarlo)" : "Lotes"}
          </p>
          <ul>
            {sidebarUnits.map((u) => {
              const active = u.id === selectedId;
              return (
                <li
                  key={u.id}
                  className={`flex items-center gap-2 border-b border-stone-100 px-3 py-1.5 text-sm ${active ? "bg-brand-50" : ""}`}
                >
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-sm"
                    style={{ background: COLORS[u.status].fill }}
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left hover:underline"
                    onClick={() => {
                      setSelectedId(u.id);
                      if (editing) {
                        if (u.shape) setDrawing(null);
                        else startDrawing(u.id);
                      }
                    }}
                  >
                    {u.code}
                  </button>
                  {!u.shape ? <span className="text-[10px] text-stone-400">sin marcar</span> : null}
                  {editing ? (
                    <span className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        className="text-brand-700 hover:underline"
                        onClick={() => startDrawing(u.id)}
                      >
                        {u.shape ? "Redibujar" : "Marcar"}
                      </button>
                      {u.shape ? (
                        <button
                          type="button"
                          className="text-red-700 hover:underline"
                          onClick={() => void persist(u.id, null)}
                        >
                          Quitar
                        </button>
                      ) : null}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}

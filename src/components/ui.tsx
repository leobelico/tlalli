import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";

/** Tlalli: a "T" made of lots (one of them marked) + a hand-drawn wordmark; same geometry as diseno/A3/logo. */
export function Logo({ className = "", iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  const cells: [number, number][] = [[10, 10], [26, 10], [42, 10], [26, 26], [26, 42]];
  return (
    <span className={`inline-flex items-center ${className}`}>
      <svg viewBox={iconOnly ? "0 0 64 64" : "0 0 211 64"} className={iconOnly ? "size-8" : "h-8 w-auto"} role="img" aria-label={BRAND.name}>
        <g transform={iconOnly ? undefined : "translate(4,4) scale(0.875)"}>
          <rect width="64" height="64" rx="7" className="fill-brand-600" />
          {cells.map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="12" height="12" fill="#fff" />
          ))}
          <rect x="42" y="42" width="12" height="12" className="fill-accent" />
        </g>
        {iconOnly ? null : (
          <path
            transform="translate(74,8)"
            d="M12,8V44M5,18H20M32,4V44M69,18V44M69,31A13,13 0 1 0 69,31.01M84,4V44M100,4V44M116,18V44M116,6V8"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="square"
          />
        )}
      </svg>
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-stone-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const BADGE_TONES = {
  gray: "bg-stone-100 text-stone-700",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-800",
  violet: "bg-violet-100 text-violet-800",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-2 text-sm text-stone-600">{children}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <Link href={href} className={`btn-${variant}`}>
      {children}
    </Link>
  );
}

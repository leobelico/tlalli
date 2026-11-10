"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/ui";
import { NAV_ITEMS } from "./side-nav";

/** Phone header with a "Menú" button that lists every section (QA B14: no hidden sections). */
export function MobileNav({
  isAdmin,
  orgName,
  userName,
  logout,
}: {
  isAdmin: boolean;
  orgName: string;
  userName: string;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV_ITEMS.filter((i) => isAdmin || !i.adminOnly);
  const current = items.find((i) => (i.exact ? pathname === i.href : pathname.startsWith(i.href)));
  return (
    <div className="sticky top-0 z-30 border-b border-stone-200 bg-white md:hidden">
      <header className="flex items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/app" className="shrink-0">
          <Logo />
        </Link>
        <span className="min-w-0 flex-1 truncate text-right text-xs text-stone-500">{current?.label ?? ""}</span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="menu-movil"
          onClick={() => setOpen((v) => !v)}
          className="btn-secondary shrink-0 px-3 py-1.5 text-sm"
        >
          {open ? "Cerrar" : "Menú"}
        </button>
      </header>
      {open ? (
        <nav id="menu-movil" aria-label="Secciones" className="border-t border-stone-200 px-2 pb-3">
          <p className="truncate px-3 pt-3 pb-1 text-xs font-medium text-stone-500">{orgName}</p>
          <ul className="grid grid-cols-2 gap-1">
            {items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium ${
                      active ? "bg-brand-50 text-brand-800" : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-stone-100 px-3 pt-2">
            <span className="truncate text-xs text-stone-500">{userName}</span>
            <form action={logout}>
              <button className="text-xs text-stone-600 underline">Cerrar sesión</button>
            </form>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

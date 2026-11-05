"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/app", label: "Inicio", exact: true },
  { href: "/app/pipeline", label: "Pipeline" },
  { href: "/app/leads", label: "Leads" },
  { href: "/app/tareas", label: "Tareas" },
  { href: "/app/desarrollos", label: "Desarrollos" },
  { href: "/app/campanas", label: "Campañas", adminOnly: true },
  { href: "/app/equipo", label: "Equipo", adminOnly: true },
  { href: "/app/configuracion", label: "Configuración", adminOnly: true },
];

export function SideNav({ isAdmin, horizontal = false }: { isAdmin: boolean; horizontal?: boolean }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => isAdmin || !i.adminOnly);
  return (
    <nav className={horizontal ? "flex gap-1 overflow-x-auto px-2 py-2" : "mt-6 flex flex-col gap-0.5"}>
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-brand-50 text-brand-800" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

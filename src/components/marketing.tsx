import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { Logo } from "@/components/ui";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-ink/15 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" aria-label={`${BRAND.name}, inicio`}>
            <Logo className="text-lg" />
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-3">
            <Link href="/#funciones" className="hidden rounded-lg px-3 py-2 text-stone-700 hover:bg-ink/5 sm:block">
              Funciones
            </Link>
            <Link href="/#ia" className="hidden rounded-lg px-3 py-2 text-stone-700 hover:bg-ink/5 sm:block">
              IA
            </Link>
            <Link href="/precios" className="rounded-lg px-3 py-2 text-stone-700 hover:bg-ink/5">
              Precios
            </Link>
            <Link href="/login" className="rounded-lg px-3 py-2 text-stone-700 hover:bg-ink/5">
              Entrar
            </Link>
            <Link href="/registro" className="btn-primary">
              Prueba gratis
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-ink/15 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-stone-600">
          <div>
            <Logo />
            <p className="mt-2 max-w-sm">{BRAND.tagline}</p>
            <p className="mt-1 font-mono text-xs tracking-wide uppercase">Un producto de {BRAND.maker}</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/precios" className="hover:underline">
              Precios
            </Link>
            <Link href="/terminos" className="hover:underline">
              Términos del servicio
            </Link>
            <Link href="/privacidad" className="hover:underline">
              Aviso de privacidad
            </Link>
            <a href={`mailto:${BRAND.supportEmail}`} className="hover:underline">
              {BRAND.supportEmail}
            </a>
            <a href={BRAND.whatsappUrl} className="hover:underline">
              WhatsApp {BRAND.phoneDisplay}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function Section({ id, title, intro, children }: { id?: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:py-20">
      <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {intro ? <p className="mt-3 max-w-2xl text-stone-600">{intro}</p> : null}
      <div className="mt-8">{children}</div>
    </section>
  );
}

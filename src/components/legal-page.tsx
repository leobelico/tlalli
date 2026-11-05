import type { ReactNode } from "react";
import { MarketingShell } from "@/components/marketing";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-stone-500">Última actualización: {updated}</p>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Documento base en revisión: antes de la contratación comercial será sustituido por la versión final revisada por asesoría jurídica.
        </p>
        <div className="mt-6 space-y-4 text-stone-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </MarketingShell>
  );
}

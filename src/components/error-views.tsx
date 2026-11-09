import Link from "next/link";

/** Spanish 404 / error screens shared by app/not-found, app/error and their /app variants (QA B12). */
export function NotFoundView({ homeHref, homeLabel }: { homeHref: string; homeLabel: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <p className="text-5xl font-semibold text-stone-300">404</p>
      <h1 className="text-xl font-semibold">No encontramos lo que buscas</h1>
      <p className="text-sm text-stone-600">
        La página no existe, cambió de lugar o no tienes acceso a ella. Revisa el enlace o regresa al inicio.
      </p>
      <Link href={homeHref} className="btn-primary mt-2">
        {homeLabel}
      </Link>
    </div>
  );
}

export function ErrorView({ retry, homeHref = "/" }: { retry: () => void; homeHref?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p className="text-sm text-stone-600">
        Tuvimos un problema al cargar esta pantalla. Lo que ya habías guardado está a salvo. Intenta de nuevo; si
        sigue pasando, avísale a tu administrador.
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn-primary" onClick={() => retry()}>
          Reintentar
        </button>
        <Link href={homeHref} className="btn-secondary">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";

// Replaces the root layout when it crashes, so it must bring its own <html> and <body>.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="es-MX">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "6rem 1rem" }}>
        <h1 style={{ fontSize: "1.25rem" }}>Algo salió mal</h1>
        <p>Tuvimos un problema al cargar la aplicación. Intenta de nuevo en unos segundos.</p>
        <button type="button" onClick={() => retry()} style={{ padding: "0.5rem 1rem" }}>
          Reintentar
        </button>
      </body>
    </html>
  );
}

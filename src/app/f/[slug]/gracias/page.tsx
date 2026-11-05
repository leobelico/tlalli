import type { Metadata } from "next";

export const metadata: Metadata = { title: "¡Gracias!", robots: { index: false } };

export default function ThanksPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">¡Gracias!</h1>
      <p className="mt-2 text-stone-600">Recibimos tus datos. Un asesor te escribirá muy pronto por WhatsApp.</p>
    </main>
  );
}

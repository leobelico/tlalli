import Link from "next/link";
import { Logo } from "@/components/ui";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <Logo className="text-2xl" />
      <div className="flex gap-3">
        <Link href="/login" className="btn-secondary">Iniciar sesión</Link>
        <Link href="/registro" className="btn-primary">Crear cuenta</Link>
      </div>
    </main>
  );
}

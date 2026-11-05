import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";

export const metadata: Metadata = { title: "Inicio" };

export default async function AppHome() {
  const { session } = await requireCtx();
  return (
    <PageHeader
      title={`Hola, ${session.user.name.split(" ")[0]}`}
      description={`Estás en ${session.active!.organization.name}.`}
    />
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicPrivacyNotice } from "@/server/public/privacy";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Aviso de privacidad" };

export default async function PublicPrivacyPage({ params }: PageProps<"/aviso-privacidad/[slug]">) {
  const { slug } = await params;
  const notice = await getPublicPrivacyNotice(slug);
  if (!notice) notFound();
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Aviso de privacidad — {notice.orgName}</h1>
      <p className="mt-1 text-sm text-stone-500">
        Versión {notice.version} · actualizado el {formatDate(notice.createdAt)}
      </p>
      <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">{notice.content}</div>
    </main>
  );
}

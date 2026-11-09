"use client";

import { useEffect } from "react";
import { ErrorView } from "@/components/error-views";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorView retry={retry} homeHref="/" />;
}

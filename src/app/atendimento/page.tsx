"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AtendimentoScreen from "@/components/chat/AtendimentoScreen";

function Loader() {
  const p = useSearchParams().get("p");
  return <AtendimentoScreen pointId={p || "entrada-principal"} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Carregando…</p>}>
      <Loader />
    </Suspense>
  );
}

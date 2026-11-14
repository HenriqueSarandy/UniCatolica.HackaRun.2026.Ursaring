"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ChatScreen from "@/components/chat/ChatScreen";

function ChatLoader() {
  const p = useSearchParams().get("p");
  return <ChatScreen pointId={p || "entrada-principal"} unknownPoint={!p} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Carregando…</p>}>
      <ChatLoader />
    </Suspense>
  );
}

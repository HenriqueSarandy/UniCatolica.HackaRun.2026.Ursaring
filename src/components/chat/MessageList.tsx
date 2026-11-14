"use client";

import { useEffect, useRef } from "react";
import type { QuickReply } from "@/types/contracts";
import BotBubble from "./BotBubble";
import UserBubble from "./UserBubble";
import type { ChatItem } from "./ChatScreen";

interface Props {
  items: ChatItem[];
  onQuickReply: (q: QuickReply) => void;
  onRetry: () => void;
}

export default function MessageList({ items, onQuickReply, onRetry }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [items.length]);

  const lastBotIdx = items.map((m) => m.role).lastIndexOf("bot");

  return (
    <div className="log" role="log" aria-live="polite" aria-label="Conversa com o CapiBot">
      {items.map((m, i) =>
        m.role === "user" ? (
          <UserBubble key={m.id} text={m.text} />
        ) : m.role === "error" ? (
          <div className="row" key={m.id}>
            <div className="bubble bot">
              <p>{m.text}</p>
              <button type="button" className="btn" onClick={onRetry}>Tentar de novo</button>
            </div>
          </div>
        ) : (
          <BotBubble key={m.id} message={m} isLast={i === lastBotIdx} onQuickReply={onQuickReply} />
        ),
      )}
      <div ref={endRef} />
    </div>
  );
}

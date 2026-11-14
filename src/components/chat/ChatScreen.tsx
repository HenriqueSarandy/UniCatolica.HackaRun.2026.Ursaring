"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BotMessage, ChatRequest, QuickReply } from "@/types/contracts";
import { ApiError, createSession, sendChat } from "@/lib/client/api";
import A11yToolbar from "./A11yToolbar";
import MessageList from "./MessageList";
import Composer from "./Composer";

export type ChatItem =
  | BotMessage
  | { id: string; role: "user"; text: string }
  | { id: string; role: "error"; text: string };

const SESSION_KEY = "capibot.session";
let seq = 0;
const uid = (p: string) => `${p}-${Date.now()}-${++seq}`;

export default function ChatScreen({ pointId, unknownPoint }: { pointId: string; unknownPoint: boolean }) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const lastReq = useRef<Omit<ChatRequest, "sessionId"> | null>(null);
  const started = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const add = (...m: ChatItem[]) => setItems((prev) => [...prev, ...m]);

  const newSession = useCallback(async () => {
    const s = await createSession(pointId);
    sessionRef.current = s.sessionId;
    try { sessionStorage.setItem(SESSION_KEY, s.sessionId); } catch { /* ignora */ }
    return s;
  }, [pointId]);

  // Foco no 1º botão rápido ativo, sem roubar foco de quem está digitando.
  const focusAfterReply = () => {
    const a = document.activeElement;
    if (a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement) return;
    requestAnimationFrame(() => {
      const els = rootRef.current?.querySelectorAll<HTMLElement>('[data-quick]:not([aria-disabled="true"])');
      els?.[0]?.focus();
    });
  };

  const run = useCallback(async (req: Omit<ChatRequest, "sessionId">) => {
    lastReq.current = req;
    setLoading(true);
    try {
      if (!sessionRef.current) await newSession();
      let res;
      try {
        res = await sendChat({ ...req, sessionId: sessionRef.current! });
      } catch (e) {
        if (e instanceof ApiError && (e.status === 404 || e.status === 410)) {
          await newSession();
          res = await sendChat({ ...req, sessionId: sessionRef.current! });
        } else throw e;
      }
      add(...res.messages);
      focusAfterReply();
    } catch {
      add({
        id: uid("err"), role: "error",
        text: "Não consegui falar com o servidor agora. Tente de novo ou toque em Falar com uma pessoa.",
      });
    } finally {
      setLoading(false);
    }
  }, [newSession]);

  // Abertura (Tela 1)
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      setLoading(true);
      try {
        const s = await newSession();
        add({ id: uid("u"), role: "user", text: `Oi Capibot! Tô aqui na ${s.point.name}.` });
        await run({});
      } catch {
        add({
          id: uid("err"), role: "error",
          text: "Não consegui falar com o servidor agora. Tente de novo ou toque em Falar com uma pessoa.",
        });
        setLoading(false);
      }
    })();
  }, [newSession, run]);

  const onQuickReply = (q: QuickReply) => {
    if (loading) return;
    add({ id: uid("u"), role: "user", text: q.label });
    void run({ quickReplyId: q.id });
  };

  const onSend = (text: string) => {
    add({ id: uid("u"), role: "user", text });
    void run({ message: text });
  };

  const onRetry = () => {
    setItems((prev) => prev.filter((m) => m.role !== "error"));
    void run(lastReq.current ?? {});
  };

  return (
    <div className="app" ref={rootRef}>
      <A11yToolbar />
      {unknownPoint && <p className="notice">Local não identificado</p>}
      <MessageList items={items} onQuickReply={onQuickReply} onRetry={onRetry} />
      <div className="status" aria-live="polite">{loading ? "CapiBot está pensando…" : ""}</div>
      <Composer disabled={loading} onSend={onSend} />
    </div>
  );
}

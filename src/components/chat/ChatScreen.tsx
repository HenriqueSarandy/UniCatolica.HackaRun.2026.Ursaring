"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BotMessage, ChatRequest, QuickReply } from "@/types/contracts";
import { ApiError, createSession, sendChat } from "@/lib/client/api";
import { loadWatched, saveWatched, useTicketWatch } from "@/lib/client/useTicketWatch";
import { handleFeedback, isFeedbackId, statusMessage } from "@/lib/client/ticketMessages";
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
  const [ticketId, setTicketId] = useState<string | null>(null);
  const getSid = useCallback(() => sessionRef.current, []);

  // Retoma o acompanhamento após recarregar a página.
  useEffect(() => {
    const w = loadWatched();
    if (w && w.lastStatus !== "concluido") setTicketId(w.id);
  }, []);

  useTicketWatch(ticketId, getSid, (t) => {
    const m = statusMessage(t);
    if (m) setItems((prev) => [...prev, m]);
    if (t.status === "concluido") setTicketId(null);
  });

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
      // Reclamação registrada pela conversa: passa a acompanhar o chamado (aceito, recusado, concluído).
      const created = res.messages.find((m) => m.ticketId)?.ticketId;
      if (created) { saveWatched({ id: created, lastStatus: "novo" }); setTicketId(created); }
      focusAfterReply();
    } catch {
      add({
        id: uid("err"), role: "error",
        text: "Não consegui falar com o servidor agora. Tente de novo em instantes.",
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
          text: "Não consegui falar com o servidor agora. Tente de novo em instantes.",
        });
        setLoading(false);
      }
    })();
  }, [newSession, run]);

  const onQuickReply = (q: QuickReply) => {
    if (loading) return;
    add({ id: uid("u"), role: "user", text: q.label });
    if (isFeedbackId(q.id)) { void onFeedback(q.id); return; }
    void run({ quickReplyId: q.id });
  };

  // Respostas do visitante à pergunta "Deu certo?" (ids `tipo:BO-XXXX`).
  const onFeedback = async (qid: string) => {
    if (!sessionRef.current) return;
    try {
      const r = await handleFeedback(qid, sessionRef.current);
      add(r.message);
      if (r.reopenedId) setTicketId(r.reopenedId);
    } catch {
      add({ id: uid("err"), role: "error", text: "Não consegui registrar sua resposta. Tente de novo." });
    }
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

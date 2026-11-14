"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BotMessage, QuickReply } from "@/types/contracts";
import { ApiError, createSession, createTicket } from "@/lib/client/api";
import { loadWatched, saveWatched, useTicketWatch } from "@/lib/client/useTicketWatch";
import { handleFeedback, isFeedbackId, statusMessage } from "@/lib/client/ticketMessages";
import A11yToolbar from "./A11yToolbar";
import IncidentPanel, { type IncidentData } from "./IncidentPanel";
import MessageList from "./MessageList";
import type { ChatItem } from "./ChatScreen";

const SESSION_KEY = "capibot.session";
let seq = 0;
const uid = (p: string) => `${p}-${Date.now()}-${++seq}`;

/** Tela 2: reclamações e serviços (registrar, acompanhar e confirmar a resolução). */
export default function AtendimentoScreen({ pointId }: { pointId: string }) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [pointName, setPointName] = useState("");
  const [sending, setSending] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);
  const getSid = useCallback(() => sessionRef.current, []);
  const add = (...m: ChatItem[]) => setItems((prev) => [...prev, ...m]);

  const newSession = useCallback(async () => {
    const s = await createSession(pointId);
    sessionRef.current = s.sessionId;
    setPointName(s.point.name);
    try { sessionStorage.setItem(SESSION_KEY, s.sessionId); } catch { /* ignora */ }
    return s;
  }, [pointId]);

  useEffect(() => {
    void newSession().catch(() => {
      add({ id: uid("err"), role: "error", text: "Não consegui conectar agora. Recarregue a página." });
    });
    const w = loadWatched();
    if (w && w.lastStatus !== "concluido") setTicketId(w.id);
  }, [newSession]);

  useTicketWatch(ticketId, getSid, (t) => {
    const m = statusMessage(t);
    if (m) setItems((prev) => [...prev, m]);
    if (t.status === "concluido") setTicketId(null);
  });

  const onSubmit = async (d: IncidentData) => {
    if (sending) return;
    setSending(true);
    try {
      if (!sessionRef.current) await newSession();
      const form = new FormData();
      form.set("sessionId", sessionRef.current!);
      if (d.text) form.set("text", d.text);
      if (d.transcript) form.set("transcript", d.transcript);
      if (d.photo) form.set("photo", d.photo);
      if (d.category) form.set("category", d.category);
      if (d.kind) form.set("kind", d.kind);
      if (d.contact) form.set("contact", d.contact);
      const t = await createTicket(form);
      saveWatched({ id: t.ticketId, lastStatus: t.status });
      setTicketId(t.ticketId);
      const complaint = d.kind === "reclamacao" || d.kind === "sugestao";
      add({
        id: uid("t"), role: "bot", sticker: "seguranca",
        text: complaint
          ? `Registrado! Seu protocolo é ${t.ticketId}. A equipe vai analisar e você acompanha por aqui.`
          : `Tudo certo! Avisei a equipe, que chega em cerca de ${t.etaMinutes} minutos. Seu protocolo é ${t.ticketId}.`,
      } satisfies BotMessage);
    } catch (e) {
      const limit = e instanceof ApiError && e.status === 429;
      add({
        id: uid("err"), role: "error",
        text: limit
          ? "Você já abriu vários pedidos nesta hora. Aguarde a equipe ou fale com o SAC."
          : "Não consegui enviar seu pedido. Tente de novo.",
      });
    } finally {
      setSending(false);
    }
  };

  const onQuickReply = async (q: QuickReply) => {
    if (!isFeedbackId(q.id) || !sessionRef.current) return;
    add({ id: uid("u"), role: "user", text: q.label });
    try {
      const r = await handleFeedback(q.id, sessionRef.current);
      add(r.message);
      if (r.reopenedId) setTicketId(r.reopenedId);
    } catch {
      add({ id: uid("err"), role: "error", text: "Não consegui registrar sua resposta. Tente de novo." });
    }
  };

  return (
    <div className="app">
      <A11yToolbar />
      <header className="page-head">
        <h1>Reclamações e serviços</h1>
        {pointName && <p>Você está em: {pointName}</p>}
        <Link className="btn" href={`/?p=${encodeURIComponent(pointId)}`}>Voltar ao CapiBot</Link>
      </header>
      <MessageList items={items} onQuickReply={onQuickReply} onRetry={() => setItems((p) => p.filter((m) => m.role !== "error"))} />
      <IncidentPanel full disabled={sending} onSubmit={onSubmit} />
    </div>
  );
}

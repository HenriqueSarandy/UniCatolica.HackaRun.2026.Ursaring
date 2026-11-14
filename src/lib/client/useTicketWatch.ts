"use client";

import { useEffect, useRef } from "react";
import type { TicketPublic, TicketStatus } from "@/types/contracts";
import { getTicket } from "./api";

export const TICKET_KEY = "capibot.ticket";
const POLL_MS = 5000;

export interface WatchedTicket { id: string; lastStatus: TicketStatus; }

export function loadWatched(): WatchedTicket | null {
  try {
    const raw = sessionStorage.getItem(TICKET_KEY);
    return raw ? (JSON.parse(raw) as WatchedTicket) : null;
  } catch { return null; }
}

export function saveWatched(w: WatchedTicket | null) {
  try {
    if (w) sessionStorage.setItem(TICKET_KEY, JSON.stringify(w));
    else sessionStorage.removeItem(TICKET_KEY);
  } catch { /* ignora */ }
}

/**
 * Faz polling (5 s, setTimeout encadeado, pausa com aba oculta) do chamado e
 * avisa `onChange` quando o status muda. Para sozinho ao concluir.
 */
export function useTicketWatch(
  ticketId: string | null,
  getSessionId: () => string | null,
  onChange: (t: TicketPublic) => void,
) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!ticketId) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (stop) return;
      const sid = getSessionId();
      if (sid && document.visibilityState === "visible") {
        try {
          const t = await getTicket(ticketId, sid);
          const prev = loadWatched();
          if (!stop && prev && prev.id === ticketId && prev.lastStatus !== t.status) {
            saveWatched({ id: ticketId, lastStatus: t.status });
            cb.current(t);
          }
          if (t.status === "concluido") return; // fim do acompanhamento
        } catch { /* rede instável: tenta de novo */ }
      }
      if (!stop) timer = setTimeout(tick, POLL_MS);
    };

    timer = setTimeout(tick, POLL_MS);
    return () => { stop = true; if (timer) clearTimeout(timer); };
  }, [ticketId, getSessionId]);
}

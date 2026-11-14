"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PanelTicket } from "@/server/tickets/service";
import { LoginForm } from "./LoginForm";
import { TicketCard } from "./TicketCard";

const POLL_MS = 4000;
type Tab = "novo" | "assumido" | "concluido";
const TABS: { id: Tab; label: string }[] = [
  { id: "novo", label: "Novos" },
  { id: "assumido", label: "Em atendimento" },
  { id: "concluido", label: "Concluídos (hoje)" },
];

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch { /* sem áudio */ }
}

export function PanelApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [staffName, setStaffName] = useState("");
  const [tickets, setTickets] = useState<PanelTicket[]>([]);
  const [offline, setOffline] = useState(false);
  const [tab, setTab] = useState<Tab>("novo");
  const [sound, setSound] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const knownNew = useRef<Set<string> | null>(null);
  const soundRef = useRef(false);
  soundRef.current = sound;

  useEffect(() => {
    try { setStaffName(localStorage.getItem("capibot_staff_name") ?? ""); } catch { /* ignora */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/panel/tickets?status=novo,assumido,concluido", { cache: "no-store" });
      if (res.status === 401) { setAuthed(false); return false; }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { tickets: PanelTicket[] };
      setAuthed(true);
      setOffline(false);
      setTickets(data.tickets);
      setNow(Date.now());
      const ids = new Set(data.tickets.filter((t) => t.status === "novo").map((t) => t.id));
      if (knownNew.current) {
        const fresh = [...ids].filter((id) => !knownNew.current!.has(id));
        if (fresh.length) {
          setHighlight(new Set(fresh));
          setTimeout(() => setHighlight(new Set()), 6000);
          if (soundRef.current) beep();
        }
      }
      knownNew.current = ids;
      return true;
    } catch {
      setOffline(true);
      return true;
    }
  }, []);

  // Polling encadeado; pausa com a aba oculta.
  useEffect(() => {
    if (authed === false) return;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      if (!document.hidden) {
        const ok = await load();
        if (!ok) return;
      }
      timer = setTimeout(tick, POLL_MS);
    };
    const onVisible = () => {
      if (!document.hidden) { clearTimeout(timer); void tick(); }
    };
    void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authed, load]);

  // "há X min" atualizado a cada 30 s.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const newCount = tickets.filter((t) => t.status === "novo").length;
  useEffect(() => {
    document.title = `${newCount ? `(${newCount}) ` : ""}CapiBot — Painel`;
  }, [newCount]);

  async function act(id: string, action: "assumir" | "concluir") {
    setErrors((e) => ({ ...e, [id]: "" }));
    try {
      const res = await fetch(`/api/panel/tickets/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, staffName }),
      });
      if (res.status === 401) { setAuthed(false); return; }
      if (res.status === 409) {
        const b = (await res.json().catch(() => ({}))) as { assignedTo?: string };
        setErrors((e) => ({ ...e, [id]: b.assignedTo ? `Já assumido por ${b.assignedTo}.` : "Chamado já atualizado." }));
      } else if (!res.ok) {
        setErrors((e) => ({ ...e, [id]: "Não foi possível atualizar. Tente de novo." }));
      }
    } catch {
      setErrors((e) => ({ ...e, [id]: "Sem conexão." }));
    }
    await load();
  }

  async function logout() {
    await fetch("/api/panel/logout", { method: "POST" }).catch(() => {});
    knownNew.current = null;
    setTickets([]);
    setAuthed(false);
  }

  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPhoto(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photo]);

  if (authed === null) return <main className="pn-login"><p>Carregando…</p></main>;
  if (!authed) {
    return <LoginForm onLogged={(n) => { setStaffName(n); setAuthed(true); }} />;
  }

  const shown = tickets.filter((t) => t.status === tab);

  return (
    <main className="pn">
      <header className="pn-top">
        <h1>CapiBot — Painel</h1>
        <span>{staffName}</span>
        <button className="btn pn-secondary" aria-pressed={sound} onClick={() => { setSound((s) => !s); beep(); }}>
          Som: {sound ? "ligado" : "desligado"}
        </button>
        <button className="btn pn-secondary" onClick={logout}>Sair</button>
      </header>
      {offline && <p role="status" className="pn-offline">Sem conexão — tentando de novo</p>}
      <div role="tablist" className="pn-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className="btn pn-tab"
            onClick={() => setTab(t.id)}
          >
            {t.label} ({tickets.filter((x) => x.status === t.id).length})
          </button>
        ))}
      </div>
      <section aria-live="polite" className="pn-list">
        {shown.length === 0 ? (
          <p className="pn-empty">Nenhum chamado no momento 🎉</p>
        ) : (
          shown.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              now={now}
              highlight={highlight.has(t.id)}
              error={errors[t.id]}
              onAction={act}
              onPhoto={setPhoto}
            />
          ))
        )}
      </section>
      {photo && (
        <div className="pn-lightbox" role="dialog" aria-modal="true" aria-label="Foto ampliada" onClick={() => setPhoto(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Foto do chamado ampliada" />
          <button className="btn" autoFocus onClick={() => setPhoto(null)}>Fechar</button>
        </div>
      )}
    </main>
  );
}

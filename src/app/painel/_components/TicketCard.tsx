"use client";

import { useState } from "react";
import type { PanelTicket } from "@/server/tickets/service";

const CATEGORY_LABEL: Record<string, string> = {
  carro: "Carro",
  objeto_perdido: "Objeto perdido",
  cadeira_de_rodas: "Cadeira de rodas",
  banheiro: "Banheiro",
  falar_com_pessoa: "Falar com pessoa",
  outro: "Outro",
};

export function timeAgo(createdAt: string, now: number): string {
  const s = Math.max(0, Math.floor((now - Date.parse(createdAt)) / 1000));
  if (s < 60) return "agora há pouco";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  return `há ${h} h`;
}

interface Props {
  ticket: PanelTicket;
  now: number;
  highlight: boolean;
  error?: string;
  onAction: (id: string, action: "assumir" | "concluir") => void;
  onPhoto: (url: string) => void;
}

export function TicketCard({ ticket: t, now, highlight, error, onAction, onPhoto }: Props) {
  const [confirming, setConfirming] = useState(false);
  const body = [t.text, t.transcript].filter(Boolean);

  return (
    <article className={`pn-card${highlight ? " pn-new" : ""}${t.priority === "alta" ? " pn-high" : ""}`}>
      <header>
        <strong>{t.id}</strong>
        <span>{timeAgo(t.created_at, now)}</span>
        {t.priority === "alta" && <span className="pn-badge">ALTA</span>}
      </header>
      <p className="pn-point">📍 {t.pointName}</p>
      <p className="pn-cat">{CATEGORY_LABEL[t.category] ?? t.category}</p>
      {body.map((b, i) => <p key={i} className="pn-text">{b}</p>)}
      {t.photoUrl && (
        <button type="button" className="pn-thumb" onClick={() => onPhoto(t.photoUrl as string)} aria-label="Ampliar foto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.photoUrl} alt={`Foto do chamado ${t.id}`} />
        </button>
      )}
      {t.assigned_to && <p className="pn-who">Responsável: {t.assigned_to}</p>}
      {error && <p role="alert" className="pn-error">{error}</p>}
      {t.status !== "concluido" && (
        <div className="pn-actions">
          {t.status === "novo" && (
            <button className="btn" onClick={() => onAction(t.id, "assumir")}>Assumir</button>
          )}
          {!confirming ? (
            <button className="btn pn-secondary" onClick={() => setConfirming(true)}>Concluir</button>
          ) : (
            <span className="pn-confirm" role="group" aria-label="Confirmar conclusão">
              Concluir mesmo?
              <button className="btn" onClick={() => { setConfirming(false); onAction(t.id, "concluir"); }}>Sim</button>
              <button className="btn pn-secondary" onClick={() => setConfirming(false)}>Não</button>
            </span>
          )}
        </div>
      )}
    </article>
  );
}

"use client";

import { useState } from "react";
import type { PanelTicket } from "@/server/tickets/service";

const CATEGORY_LABEL: Record<string, string> = {
  carro: "Carro",
  objeto_perdido: "Objeto perdido",
  cadeira_de_rodas: "Cadeira de rodas",
  banheiro: "Banheiro",
  falar_com_pessoa: "Falar com pessoa",
  reclamacao: "Reclamação",
  outro: "Outro",
};

const TEAM_LABEL: Record<string, string> = {
  seguranca: "Segurança", sac: "SAC", manutencao: "Manutenção", limpeza: "Limpeza",
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
  onAction: (id: string, action: string, extra?: Record<string, unknown>) => void;
  onPhoto: (url: string) => void;
}

export function TicketCard({ ticket: t, now, highlight, error, onAction, onPhoto }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [code, setCode] = useState("resolvido");
  const [note, setNote] = useState("");
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState("");
  const body = [t.text, t.transcript].filter(Boolean);

  return (
    <article className={`pn-card${highlight ? " pn-new" : ""}${t.priority === "alta" ? " pn-high" : ""}`}>
      <header>
        <strong>{t.id}</strong>
        <span>{timeAgo(t.created_at, now)}</span>
        {t.priority === "alta" && <span className="pn-badge">ALTA</span>}
        {t.overdue && <span className="pn-badge">ATRASADO</span>}
        {t.kind === "reclamacao" && <span className="pn-badge pn-kind">RECLAMAÇÃO</span>}
      </header>
      <p className="pn-point">📍 {t.pointName}</p>
      <p className="pn-cat">
        {CATEGORY_LABEL[t.category] ?? t.category} · Setor: {TEAM_LABEL[t.team] ?? t.team}
      </p>
      {t.contact && <p className="pn-who">Identificação: {t.contact}</p>}
      {body.map((b, i) => <p key={i} className="pn-text">{b}</p>)}
      {t.photoUrl && (
        <button type="button" className="pn-thumb" onClick={() => onPhoto(t.photoUrl as string)} aria-label="Ampliar foto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.photoUrl} alt={`Foto do chamado ${t.id}`} />
        </button>
      )}
      {t.assigned_to && <p className="pn-who">Responsável: {t.assigned_to}</p>}
      {t.events.length > 0 && (
        <details>
          <summary>Histórico ({t.events.length})</summary>
          <ul className="pn-timeline">
            {t.events.map((ev, i) => (
              <li key={i}>
                {new Date(ev.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — {ev.actor}: {ev.type}
                {ev.note ? ` (${ev.note})` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
      {error && <p role="alert" className="pn-error">{error}</p>}
      {t.status !== "concluido" && (
        <div className="pn-actions">
          {t.status === "novo" && (
            <button className="btn" onClick={() => onAction(t.id, "assumir")}>Aceitar</button>
          )}
          {!refusing ? (
            <button className="btn pn-secondary" onClick={() => setRefusing(true)}>Recusar</button>
          ) : (
            <span className="pn-confirm" role="group" aria-label="Recusar pedido">
              <label>
                Motivo (o visitante verá)
                <input
                  value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex.: Não é de responsabilidade do shopping"
                />
              </label>
              <button
                className="btn" disabled={reason.trim().length < 3}
                onClick={() => { setRefusing(false); onAction(t.id, "recusar", { reason }); }}
              >
                Confirmar recusa
              </button>
              <button className="btn pn-secondary" onClick={() => setRefusing(false)}>Cancelar</button>
            </span>
          )}
          {t.status === "novo" && (
            <button className="btn pn-secondary" onClick={() => onAction(t.id, "escalar")}>Escalar</button>
          )}
          {!confirming ? (
            <button className="btn pn-secondary" onClick={() => setConfirming(true)}>Concluir</button>
          ) : (
            <span className="pn-confirm" role="group" aria-label="Concluir chamado">
              <label>
                Resultado
                <select value={code} onChange={(e) => setCode(e.target.value)}>
                  <option value="resolvido">Resolvido</option>
                  <option value="encaminhado">Encaminhado a outro setor</option>
                  <option value="nao_localizado">Não localizado</option>
                  <option value="improcedente">Improcedente</option>
                </select>
              </label>
              <label>
                Mensagem para o visitante
                <input
                  value={note} maxLength={300} onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex.: Seu carro está no piso G2"
                />
              </label>
              <button
                className="btn"
                onClick={() => { setConfirming(false); onAction(t.id, "concluir", { resolutionCode: code, note }); }}
              >
                Confirmar
              </button>
              <button className="btn pn-secondary" onClick={() => setConfirming(false)}>Cancelar</button>
            </span>
          )}
        </div>
      )}
    </article>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { Metrics, Counted } from "@/server/tickets/metrics";

const CATEGORY_LABEL: Record<string, string> = {
  carro: "Carro", objeto_perdido: "Objeto perdido", cadeira_de_rodas: "Cadeira de rodas",
  banheiro: "Banheiro", falar_com_pessoa: "Falar com pessoa", reclamacao: "Reclamação", outro: "Outro",
};
const TEAM_LABEL: Record<string, string> = {
  seguranca: "Segurança", sac: "SAC", manutencao: "Manutenção", limpeza: "Limpeza",
};

function dur(s: number | null): string {
  if (s === null) return "—";
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${s % 60} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

function Bars({ title, items, map }: { title: string; items: Counted[]; map?: Record<string, string> }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <section className="pn-ind-block">
      <h2>{title}</h2>
      {items.length === 0 ? <p>Sem dados.</p> : (
        <ul className="pn-bars">
          {items.map((i) => (
            <li key={i.key}>
              <span className="pn-bar-label">{map?.[i.key] ?? i.label}</span>
              <span className="pn-bar" style={{ width: `${(i.count / max) * 100}%` }} aria-hidden="true" />
              <strong>{i.count}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Indicators() {
  const [days, setDays] = useState(0);
  const [m, setM] = useState<Metrics | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/panel/metrics${days ? `?days=${days}` : ""}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        if (!stop) { setM((await res.json()) as Metrics); setError(false); }
      } catch { if (!stop) setError(true); }
    };
    void load();
    const t = setInterval(load, 15_000);
    return () => { stop = true; clearInterval(t); };
  }, [days]);

  if (!m) return <p>{error ? "Não foi possível carregar os indicadores." : "Carregando…"}</p>;
  const top = m.byPoint[0];

  return (
    <div className="pn-ind">
      <label>
        Período{" "}
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={0}>Tudo</option>
          <option value={1}>Últimas 24 h</option>
          <option value={7}>Últimos 7 dias</option>
        </select>
      </label>
      {error && <p role="status" className="pn-offline">Sem conexão — mostrando o último valor</p>}

      <dl className="pn-kpis">
        <div><dt>Pedidos</dt><dd>{m.total}</dd></div>
        <div><dt>Em aberto</dt><dd>{m.open}</dd></div>
        <div><dt>Reclamações</dt><dd>{m.complaints}</dd></div>
        <div><dt>Recusados</dt><dd>{m.refused}</dd></div>
        <div><dt>Reabertos</dt><dd>{m.reopened}</dd></div>
        <div><dt>Tempo até aceitar</dt><dd>{dur(m.avgAssumeSeconds)}</dd></div>
        <div><dt>Tempo até concluir</dt><dd>{dur(m.avgCloseSeconds)}</dd></div>
        <div><dt>Aceitos no prazo</dt><dd>{m.slaPct === null ? "—" : `${m.slaPct}%`}</dd></div>
        <div><dt>Nota média</dt><dd>{m.avgRating === null ? "—" : `${m.avgRating} (${m.ratingCount})`}</dd></div>
      </dl>

      {top && (
        <p className="pn-insight">
          <strong>Onde melhorar:</strong> {top.label} concentra {top.count} de {m.total} pedidos.
        </p>
      )}
      <Bars title="Pedidos por local de origem" items={m.byPoint} />
      <Bars title="Pedidos por assunto" items={m.byCategory} map={CATEGORY_LABEL} />
      <Bars title="Pedidos por setor" items={m.byTeam} map={TEAM_LABEL} />
    </div>
  );
}

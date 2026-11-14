import { db } from "@/server/db";
import { getPointName } from "@/server/maps/service";
import { SLA_MINUTES, type TicketRow } from "./service";

export interface Counted { key: string; label: string; count: number }

export interface Metrics {
  total: number;
  open: number;
  closed: number;
  refused: number;          // concluídos como "improcedente" (recusados)
  complaints: number;       // kind = reclamacao
  reopened: number;
  avgAssumeSeconds: number | null;
  avgCloseSeconds: number | null;
  slaPct: number | null;    // % assumidos dentro do SLA
  avgRating: number | null;
  ratingCount: number;
  byCategory: Counted[];
  byPoint: Counted[];
  byTeam: Counted[];
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

function tally(rows: TicketRow[], key: (r: TicketRow) => string, label: (k: string) => string): Counted[] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()]
    .map(([k, count]) => ({ key: k, label: label(k), count }))
    .sort((a, b) => b.count - a.count);
}

/** Indicadores para a equipe. `since` (ISO) restringe pela data de abertura. */
export function getMetrics(since?: string): Metrics {
  const rows = (since
    ? db.prepare("SELECT * FROM tickets WHERE created_at >= ?").all(since)
    : db.prepare("SELECT * FROM tickets").all()) as TicketRow[];

  const sec = (a: string, b: string) => Math.max(0, (Date.parse(b) - Date.parse(a)) / 1000);
  const assumed = rows.filter((r) => r.assumed_at);
  const closed = rows.filter((r) => r.status === "concluido" && r.closed_at);
  const rated = rows.filter((r) => r.rating);

  const inSla = assumed.filter((r) => sec(r.created_at, r.assumed_at!) <= SLA_MINUTES[r.priority] * 60).length;

  return {
    total: rows.length,
    open: rows.filter((r) => r.status !== "concluido").length,
    closed: closed.length,
    refused: closed.filter((r) => r.resolution_code === "improcedente").length,
    complaints: rows.filter((r) => r.kind === "reclamacao").length,
    reopened: rows.filter((r) => r.reopened_count > 0).length,
    avgAssumeSeconds: avg(assumed.map((r) => sec(r.created_at, r.assumed_at!))),
    avgCloseSeconds: avg(closed.map((r) => sec(r.created_at, r.closed_at!))),
    slaPct: assumed.length ? Math.round((inSla / assumed.length) * 100) : null,
    avgRating: rated.length ? Math.round((rated.reduce((a, r) => a + (r.rating ?? 0), 0) / rated.length) * 10) / 10 : null,
    ratingCount: rated.length,
    byCategory: tally(rows, (r) => r.category, (k) => k),
    byPoint: tally(rows, (r) => r.point_id, (k) => getPointName(k) ?? k).slice(0, 8),
    byTeam: tally(rows, (r) => r.team, (k) => k),
  };
}

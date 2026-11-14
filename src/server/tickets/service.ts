import crypto from "node:crypto";
import { z } from "zod";
import { db } from "@/server/db";
import { getSession } from "@/server/db/sessions";
import { getPointName } from "@/server/maps/service";
import type {
  ResolutionCode, TicketCategory, TicketCreated, TicketKind, TicketPublic, TicketStatus, TicketTeam,
} from "@/types/contracts";
import { categorize, type TicketPriority } from "./categorize";
import { deleteUpload, savePhoto, validatePhoto } from "./uploads";

export const ETA_MINUTES: Record<TicketPriority, number> = { alta: 3, normal: 5 };
export const MAX_TEXT = 1000;
export const MAX_TICKETS_PER_HOUR = 5;
export const SLA_MINUTES: Record<TicketPriority, number> = { alta: 3, normal: 5 };
export const REOPEN_WINDOW_MS = 24 * 60 * 60 * 1000;
const RESOLUTION_CODES: readonly ResolutionCode[] = ["resolvido", "encaminhado", "nao_localizado", "improcedente"];
const TEAMS: readonly TicketTeam[] = ["seguranca", "sac", "manutencao", "limpeza"];

export class TicketError extends Error {
  constructor(
    public status: 400 | 404 | 409 | 413 | 415 | 429,
    public code: string,
    public extra?: Record<string, unknown>,
  ) {
    super(code);
  }
}

const CATEGORIES = ["carro", "objeto_perdido", "cadeira_de_rodas", "banheiro", "falar_com_pessoa", "reclamacao", "outro"] as const;

const CreateInput = z.object({
  sessionId: z.string().min(1).max(100),
  category: z.enum(CATEGORIES).optional(),
  text: z.string().trim().max(MAX_TEXT).optional(),
  transcript: z.string().trim().max(MAX_TEXT).optional(),
  contact: z.string().trim().max(120).optional(),
  kind: z.enum(["ajuda", "reclamacao", "sugestao"]).optional(),
});

export interface CreateTicketInput {
  sessionId: string;
  category?: string;
  text?: string;
  transcript?: string;
  contact?: string;
  kind?: string;
  photo?: File | null;
}

export interface TicketRow {
  id: string;
  session_id: string;
  point_id: string;
  category: TicketCategory;
  text: string | null;
  transcript: string | null;
  photo_file: string | null;
  status: TicketStatus;
  assigned_to: string | null;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  assumed_at: string | null;
  closed_at: string | null;
  kind: TicketKind;
  team: TicketTeam;
  contact: string | null;
  resolution_code: ResolutionCode | null;
  resolution_note: string | null;
  escalated_at: string | null;
  reopened_count: number;
  rating: number | null;
  feedback_text: string | null;
}

export function logEvent(ticketId: string, actor: string, type: string, note?: string | null) {
  db.prepare("INSERT INTO ticket_events (ticket_id, at, actor, type, note) VALUES (?, ?, ?, ?, ?)")
    .run(ticketId, new Date().toISOString(), actor, type, note ?? null);
}

const nowIso = () => new Date().toISOString();
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function shortId(): string {
  const bytes = crypto.randomBytes(4);
  let s = "";
  for (const b of bytes) s += B32[b % 32];
  return `BO-${s}`;
}

export async function createTicket(input: CreateTicketInput): Promise<TicketCreated> {
  const parsed = CreateInput.safeParse({
    sessionId: input.sessionId,
    category: input.category || undefined,
    text: input.text || undefined,
    transcript: input.transcript || undefined,
    contact: input.contact || undefined,
    kind: input.kind || undefined,
  });
  if (!parsed.success) throw new TicketError(400, "requisicao_invalida");
  const { sessionId, category: given, text, transcript, contact, kind: givenKind } = parsed.data;
  const photo = input.photo && input.photo.size > 0 ? input.photo : undefined;

  if (!text && !transcript && !photo && given !== "falar_com_pessoa") {
    throw new TicketError(400, "requisicao_invalida");
  }

  const session = getSession(sessionId);
  if (!session) throw new TicketError(404, "sessao_invalida");

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { n } = db
    .prepare("SELECT COUNT(*) AS n FROM tickets WHERE session_id = ? AND created_at > ?")
    .get(sessionId, since) as { n: number };
  if (n >= MAX_TICKETS_PER_HOUR) throw new TicketError(429, "muitas_requisicoes");

  let validated: Awaited<ReturnType<typeof validatePhoto>> | undefined;
  if (photo) validated = await validatePhoto(photo); // UploadError: 413/415

  const { category, priority, kind: autoKind, team } = categorize(`${text ?? ""} ${transcript ?? ""}`, given);
  const kind = givenKind ?? autoKind;

  const ts = nowIso();
  const insert = db.prepare(
    `INSERT INTO tickets (id, session_id, point_id, category, text, transcript, photo_file, status, priority, kind, team, contact, created_at, updated_at)
     VALUES (@id, @session_id, @point_id, @category, @text, @transcript, @photo_file, 'novo', @priority, @kind, @team, @contact, @ts, @ts)`,
  );

  let id = "";
  let photoFile: string | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    id = shortId();
    if (validated && !photoFile) photoFile = savePhoto(id, validated.bytes, validated.ext);
    try {
      insert.run({
        id, session_id: sessionId, point_id: session.point_id, category,
        text: text ?? null, transcript: transcript ?? null, photo_file: photoFile, priority, kind, team, contact: contact ?? null, ts,
      });
      logEvent(id, "visitante", "criado");
      return { ticketId: id, status: "novo", etaMinutes: ETA_MINUTES[priority] };
    } catch (e) {
      if ((e as { code?: string }).code !== "SQLITE_CONSTRAINT_PRIMARYKEY") {
        if (photoFile) deleteUpload(photoFile);
        throw e;
      }
    }
  }
  if (photoFile) deleteUpload(photoFile);
  throw new Error("id_collision");
}

/** Só devolve se o sessionId for o da criação. */
export function getPublicTicket(id: string, sessionId: string): TicketPublic | null {
  const row = db
    .prepare("SELECT * FROM tickets WHERE id = ? AND session_id = ?")
    .get(id, sessionId) as TicketRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    kind: row.kind,
    ...(row.assigned_to ? { assignedTo: row.assigned_to } : {}),
    ...(row.status === "concluido" && row.resolution_note ? { resolutionNote: row.resolution_note } : {}),
    ...(row.status === "concluido" && row.resolution_code ? { resolutionCode: row.resolution_code } : {}),
    ...(row.rating ? { rating: row.rating } : {}),
    canReopen: canReopen(row),
    updatedAt: row.updated_at,
  };
}

function canReopen(r: TicketRow): boolean {
  return (
    r.status === "concluido" && r.reopened_count < 1 && !!r.closed_at &&
    Date.now() - Date.parse(r.closed_at) <= REOPEN_WINDOW_MS
  );
}

export interface PanelTicket extends TicketRow {
  pointName: string;
  photoUrl: string | null;
  ageSeconds: number;
  overdue: boolean;
  events: { at: string; actor: string; type: string; note: string | null }[];
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

/** Alta primeiro, depois mais antigos. "concluido" só do dia. */
export function listTickets(statuses: TicketStatus[] = ["novo", "assumido"]): PanelTicket[] {
  const valid = statuses.filter((s) => ["novo", "assumido", "concluido"].includes(s));
  if (!valid.length) return [];
  const marks = valid.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT * FROM tickets
       WHERE status IN (${marks}) AND (status <> 'concluido' OR closed_at >= ?)
       ORDER BY CASE priority WHEN 'alta' THEN 0 ELSE 1 END, created_at ASC`,
    )
    .all(...valid, startOfToday()) as TicketRow[];
  const now = Date.now();
  const evStmt = db.prepare("SELECT at, actor, type, note FROM ticket_events WHERE ticket_id = ? ORDER BY id");
  return rows.map((r) => {
    const ageSeconds = Math.max(0, Math.floor((now - Date.parse(r.created_at)) / 1000));
    const sla = SLA_MINUTES[r.priority] * 60;
    // Escalonamento sem cron: marca na primeira listagem após 2× o SLA.
    if (r.status === "novo" && !r.escalated_at && ageSeconds > sla * 2) {
      escalateTicket(r.id, "sistema", "SLA estourado 2×");
      r.escalated_at = nowIso();
      r.priority = "alta";
    }
    return {
      ...r,
      pointName: getPointName(r.point_id) ?? r.point_id,
      photoUrl: r.photo_file ? `/api/uploads/${r.photo_file}` : null,
      ageSeconds,
      overdue: r.status === "novo" && ageSeconds > sla,
      events: evStmt.all(r.id) as PanelTicket["events"],
    };
  });
}

function getRow(id: string): TicketRow {
  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as TicketRow | undefined;
  if (!row) throw new TicketError(404, "chamado_inexistente");
  return row;
}

export function assumeTicket(id: string, staffName: string): TicketRow {
  const row = getRow(id);
  if (row.status !== "novo") {
    throw new TicketError(409, "ja_assumido", { assignedTo: row.assigned_to, status: row.status });
  }
  const ts = nowIso();
  // Condição no WHERE protege contra corrida entre duas pessoas da equipe.
  const res = db
    .prepare(
      "UPDATE tickets SET status='assumido', assigned_to=?, assumed_at=?, updated_at=? WHERE id=? AND status='novo'",
    )
    .run(staffName, ts, ts, id);
  if (res.changes > 0) logEvent(id, staffName, "assumido");
  if (res.changes === 0) {
    const cur = getRow(id);
    throw new TicketError(409, "ja_assumido", { assignedTo: cur.assigned_to, status: cur.status });
  }
  return getRow(id);
}

export interface CloseOpts { code?: ResolutionCode; note?: string }

export function closeTicket(id: string, staffName: string, opts: CloseOpts = {}): TicketRow {
  const row = getRow(id);
  if (row.status === "concluido") {
    throw new TicketError(409, "ja_concluido", { assignedTo: row.assigned_to, status: row.status });
  }
  const code = opts.code ?? "resolvido";
  if (!RESOLUTION_CODES.includes(code)) throw new TicketError(400, "requisicao_invalida");
  const note = opts.note?.trim().slice(0, MAX_TEXT) || null;
  const ts = nowIso();
  db.prepare(
    `UPDATE tickets SET status='concluido', assigned_to=COALESCE(assigned_to, ?), closed_at=?, updated_at=?,
       resolution_code=?, resolution_note=?
     WHERE id=? AND status <> 'concluido'`,
  ).run(staffName, ts, ts, code, note, id);
  logEvent(id, staffName, "concluido", `${code}${note ? `: ${note}` : ""}`);
  return getRow(id);
}

export function addNote(id: string, staffName: string, note: string): TicketRow {
  getRow(id);
  const n = note.trim().slice(0, MAX_TEXT);
  if (!n) throw new TicketError(400, "requisicao_invalida");
  logEvent(id, staffName, "nota", n);
  return getRow(id);
}

export function escalateTicket(id: string, actor: string, note?: string): TicketRow {
  const row = getRow(id);
  if (row.status === "concluido") throw new TicketError(409, "ja_concluido");
  const ts = nowIso();
  db.prepare(
    "UPDATE tickets SET escalated_at=COALESCE(escalated_at, ?), priority='alta', team='seguranca', updated_at=? WHERE id=?",
  ).run(ts, ts, id);
  logEvent(id, actor, "escalado", note);
  return getRow(id);
}

export function transferTicket(id: string, staffName: string, team: TicketTeam): TicketRow {
  if (!TEAMS.includes(team)) throw new TicketError(400, "requisicao_invalida");
  getRow(id);
  db.prepare("UPDATE tickets SET team=?, updated_at=? WHERE id=?").run(team, nowIso(), id);
  logEvent(id, staffName, "transferido", team);
  return getRow(id);
}

function getOwned(id: string, sessionId: string): TicketRow {
  const row = db.prepare("SELECT * FROM tickets WHERE id = ? AND session_id = ?").get(id, sessionId) as
    | TicketRow
    | undefined;
  if (!row) throw new TicketError(404, "chamado_inexistente");
  return row;
}

/** Visitante diz que não foi resolvido: reabre (1×, até 24 h, mesma sessão). */
export function reopenTicket(id: string, sessionId: string, text?: string): TicketRow {
  const row = getOwned(id, sessionId);
  if (!canReopen(row)) throw new TicketError(409, "nao_pode_reabrir");
  const why = text?.trim().slice(0, MAX_TEXT) || null;
  const ts = nowIso();
  db.prepare(
    `UPDATE tickets SET status='novo', priority='alta', assigned_to=NULL, assumed_at=NULL, closed_at=NULL,
       reopened_count=reopened_count+1, feedback_text=?, updated_at=? WHERE id=?`,
  ).run(why, ts, id);
  logEvent(id, "visitante", "reaberto", why);
  return getRow(id);
}

/** Avaliação 1–5 do visitante, só depois de concluído. */
export function rateTicket(id: string, sessionId: string, rating: number, text?: string): TicketRow {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new TicketError(400, "requisicao_invalida");
  const row = getOwned(id, sessionId);
  if (row.status !== "concluido") throw new TicketError(409, "ainda_nao_concluido");
  db.prepare("UPDATE tickets SET rating=?, feedback_text=COALESCE(?, feedback_text), updated_at=? WHERE id=?")
    .run(rating, text?.trim().slice(0, MAX_TEXT) || null, nowIso(), id);
  logEvent(id, "visitante", "avaliado", String(rating));
  return getRow(id);
}

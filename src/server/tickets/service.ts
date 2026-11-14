import crypto from "node:crypto";
import { z } from "zod";
import { db } from "@/server/db";
import { getSession } from "@/server/db/sessions";
import { getPointName } from "@/server/maps/service";
import type { TicketCategory, TicketCreated, TicketPublic, TicketStatus } from "@/types/contracts";
import { categorize, type TicketPriority } from "./categorize";
import { deleteUpload, savePhoto, validatePhoto } from "./uploads";

export const ETA_MINUTES: Record<TicketPriority, number> = { alta: 3, normal: 5 };
export const MAX_TEXT = 1000;
export const MAX_TICKETS_PER_HOUR = 5;

export class TicketError extends Error {
  constructor(
    public status: 400 | 404 | 409 | 413 | 415 | 429,
    public code: string,
    public extra?: Record<string, unknown>,
  ) {
    super(code);
  }
}

const CATEGORIES = ["carro", "objeto_perdido", "cadeira_de_rodas", "banheiro", "falar_com_pessoa", "outro"] as const;

const CreateInput = z.object({
  sessionId: z.string().min(1).max(100),
  category: z.enum(CATEGORIES).optional(),
  text: z.string().trim().max(MAX_TEXT).optional(),
  transcript: z.string().trim().max(MAX_TEXT).optional(),
});

export interface CreateTicketInput {
  sessionId: string;
  category?: string;
  text?: string;
  transcript?: string;
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
  });
  if (!parsed.success) throw new TicketError(400, "requisicao_invalida");
  const { sessionId, category: given, text, transcript } = parsed.data;
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

  const { category, priority } = categorize(`${text ?? ""} ${transcript ?? ""}`, given);

  const ts = nowIso();
  const insert = db.prepare(
    `INSERT INTO tickets (id, session_id, point_id, category, text, transcript, photo_file, status, priority, created_at, updated_at)
     VALUES (@id, @session_id, @point_id, @category, @text, @transcript, @photo_file, 'novo', @priority, @ts, @ts)`,
  );

  let id = "";
  let photoFile: string | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    id = shortId();
    if (validated && !photoFile) photoFile = savePhoto(id, validated.bytes, validated.ext);
    try {
      insert.run({
        id, session_id: sessionId, point_id: session.point_id, category,
        text: text ?? null, transcript: transcript ?? null, photo_file: photoFile, priority, ts,
      });
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
    .prepare("SELECT id, status, assigned_to, updated_at FROM tickets WHERE id = ? AND session_id = ?")
    .get(id, sessionId) as Pick<TicketRow, "id" | "status" | "assigned_to" | "updated_at"> | undefined;
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    ...(row.assigned_to ? { assignedTo: row.assigned_to } : {}),
    updatedAt: row.updated_at,
  };
}

export interface PanelTicket extends TicketRow {
  pointName: string;
  photoUrl: string | null;
  ageSeconds: number;
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
  return rows.map((r) => ({
    ...r,
    pointName: getPointName(r.point_id) ?? r.point_id,
    photoUrl: r.photo_file ? `/api/uploads/${r.photo_file}` : null,
    ageSeconds: Math.max(0, Math.floor((now - Date.parse(r.created_at)) / 1000)),
  }));
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
  if (res.changes === 0) {
    const cur = getRow(id);
    throw new TicketError(409, "ja_assumido", { assignedTo: cur.assigned_to, status: cur.status });
  }
  return getRow(id);
}

export function closeTicket(id: string, staffName: string): TicketRow {
  const row = getRow(id);
  if (row.status === "concluido") {
    throw new TicketError(409, "ja_concluido", { assignedTo: row.assigned_to, status: row.status });
  }
  const ts = nowIso();
  db.prepare(
    `UPDATE tickets SET status='concluido', assigned_to=COALESCE(assigned_to, ?), closed_at=?, updated_at=?
     WHERE id=? AND status <> 'concluido'`,
  ).run(staffName, ts, ts, id);
  return getRow(id);
}

import { db } from "./index";

export interface SessionRow {
  id: string;
  point_id: string;
  state: string;
  last_dest_id: string | null;
  created_at: string;
  updated_at: string;
}

const now = () => new Date().toISOString();

export function createSession(pointId: string): SessionRow {
  const row: SessionRow = {
    id: crypto.randomUUID(),
    point_id: pointId,
    state: "inicio",
    last_dest_id: null,
    created_at: now(),
    updated_at: now(),
  };
  db.prepare(
    "INSERT INTO sessions (id, point_id, state, last_dest_id, created_at, updated_at) VALUES (@id, @point_id, @state, @last_dest_id, @created_at, @updated_at)",
  ).run(row);
  return row;
}

export function getSession(id: string): SessionRow | undefined {
  return db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined;
}

export function updateSession(id: string, state: string, lastDestId?: string | null): void {
  db.prepare(
    "UPDATE sessions SET state = ?, last_dest_id = COALESCE(?, last_dest_id), updated_at = ? WHERE id = ?",
  ).run(state, lastDestId ?? null, now(), id);
}

export function logMessage(sessionId: string, role: "user" | "bot", text: string): void {
  db.prepare("INSERT INTO chat_log (session_id, role, text, created_at) VALUES (?, ?, ?, ?)").run(
    sessionId, role, text, now(),
  );
}

/** Últimas `limit` mensagens em ordem cronológica. */
export function recentMessages(sessionId: string, limit = 12): { role: "user" | "bot"; text: string }[] {
  const rows = db
    .prepare("SELECT role, text FROM chat_log WHERE session_id = ? ORDER BY id DESC LIMIT ?")
    .all(sessionId, limit) as { role: "user" | "bot"; text: string }[];
  return rows.reverse();
}

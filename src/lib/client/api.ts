import type {
  ChatRequest, ChatResponse, SessionResponse, StoreSummary, TicketCreated, TicketPublic,
} from "@/types/contracts";
import { mockChat, mockSession } from "./mock";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
const CHAT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(public status: number, message?: string) {
    super(message ?? `HTTP ${status}`);
  }
}

async function request<T>(url: string, init: RequestInit = {}, timeoutMs?: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = timeoutMs ? setTimeout(() => ctrl.abort(), timeoutMs) : undefined;
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new ApiError(res.status);
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, e instanceof DOMException && e.name === "AbortError" ? "timeout" : "network");
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function createSession(pointId: string): Promise<SessionResponse> {
  if (USE_MOCKS) return mockSession(pointId);
  return request("/api/session", json({ pointId }), CHAT_TIMEOUT_MS);
}

export async function sendChat(req: ChatRequest): Promise<ChatResponse> {
  if (USE_MOCKS) return mockChat(req);
  return request("/api/chat", json(req), CHAT_TIMEOUT_MS);
}

export async function searchStores(q: string): Promise<StoreSummary[]> {
  if (USE_MOCKS) return [];
  return request(`/api/stores?q=${encodeURIComponent(q)}`);
}

export async function createTicket(form: FormData): Promise<TicketCreated> {
  if (USE_MOCKS) return { ticketId: "mock-ticket", status: "novo", etaMinutes: 5 };
  return request("/api/tickets", { method: "POST", body: form });
}

export async function getTicket(id: string, sessionId: string): Promise<TicketPublic> {
  if (USE_MOCKS) return { id, status: "novo", updatedAt: new Date().toISOString() };
  return request(`/api/tickets/${encodeURIComponent(id)}?sessionId=${encodeURIComponent(sessionId)}`);
}

export async function sendFeedback(
  id: string, sessionId: string, body: { resolved: boolean; rating?: number; text?: string },
): Promise<TicketPublic> {
  if (USE_MOCKS) return { id, status: body.resolved ? "concluido" : "novo", updatedAt: new Date().toISOString() };
  return request(`/api/tickets/${encodeURIComponent(id)}/feedback`, json({ sessionId, ...body }));
}

// STUB TEMPORÁRIO (Dev 1) copiado de docs/techspecs/README.md.
// Substituir pelo arquivo oficial do Dev 2 quando ele chegar na main.
export type PointId = string;
export type QuickReplyId = "banheiros" | "alimentacao" | "lojas" | "servicos";

export interface QuickReply { id: string; label: string; }

export interface MapPayload {
  floor: number;
  mapSvgUrl: string;
  viewBox: string;
  routePath: string;
  origin: { x: number; y: number; label: string };
  destination: { x: number; y: number; label: string };
  altText: string;
  steps: string[];
}

export interface BotMessage {
  id: string;
  role: "bot";
  text: string;
  speakText?: string;
  sticker?: "padrao" | "inteligente" | "seguranca" | "feliz";
  quickReplies?: QuickReply[];
  map?: MapPayload;
  suggestInput?: "loja" | "bo";
}

export interface SessionResponse { sessionId: string; point: { id: PointId; name: string }; }

export interface ChatRequest {
  sessionId: string;
  message?: string;
  quickReplyId?: string;
  storeId?: string;
}
export interface ChatResponse { messages: BotMessage[]; }

export interface StoreSummary { id: string; name: string; floor: number; category: string; }

export type TicketStatus = "novo" | "assumido" | "concluido";
export type TicketCategory = "carro" | "objeto_perdido" | "cadeira_de_rodas" | "banheiro" | "falar_com_pessoa" | "outro";
export interface TicketCreated { ticketId: string; status: TicketStatus; etaMinutes: number; }
export interface TicketPublic { id: string; status: TicketStatus; assignedTo?: string; updatedAt: string; }

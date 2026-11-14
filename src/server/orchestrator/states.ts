import type { BotMessage } from "@/types/contracts";
import type { SessionRow } from "@/server/db/sessions";

// Também aceita "rec_nome|<tópico>" e "rec_texto|<tópico>|<nome>" (fluxo de reclamação).
export type SessionState = "inicio" | "aguardando_loja" | "servicos" | "livre" | "livre_sem_resposta" | (string & {});

export interface HandlerResult {
  messages: BotMessage[];
  state: SessionState;
  lastDestId?: string;
}

export interface Ctx {
  session: SessionRow;
  pointId: string;
}

export const QUICK_REPLY_IDS = ["banheiros", "alimentacao", "lojas", "servicos"] as const;

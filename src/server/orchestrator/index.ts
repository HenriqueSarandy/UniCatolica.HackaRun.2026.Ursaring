import type { ChatRequest, ChatResponse } from "@/types/contracts";
import { updateSession, type SessionRow } from "@/server/db/sessions";
import { detectIntent } from "./intent";
import { freeText } from "./handlers/freeText";
import { greeting } from "./handlers/greeting";
import { resolveStoreText, routeToStore } from "./handlers/lojas";
import { choice, continuarReclamacao, isComplaintState, isTopic, localizacao, pedirNome, servicos } from "./handlers/servicos";
import { ajudou, naoAjudou } from "./handlers/feedback";
import { MAIN_QUICK_REPLIES } from "./replies";
import type { Ctx, HandlerResult } from "./states";

async function dispatch(ctx: Ctx, req: ChatRequest): Promise<HandlerResult> {
  const state = ctx.session.state;
  const { quickReplyId, storeId } = req;
  const message = req.message?.trim();

  if (storeId) {
    const r = routeToStore(ctx, storeId);
    if (r) return r;
  }
  if (quickReplyId?.startsWith("store:")) {
    const r = routeToStore(ctx, quickReplyId.slice(6));
    if (r) return r;
  }
  // Passo 2: localização ou reclamação (ids `loc:<tópico>` e `rec:<tópico>`).
  if (quickReplyId?.startsWith("loc:") && isTopic(quickReplyId.slice(4))) return localizacao(ctx, quickReplyId.slice(4) as never);
  if (quickReplyId?.startsWith("rec:") && isTopic(quickReplyId.slice(4))) return pedirNome(quickReplyId.slice(4) as never);
  switch (quickReplyId) {
    case "ajudou": return ajudou();
    case "nao-ajudou": return naoAjudou();
    case "banheiros":
    case "alimentacao":
    case "lojas":
    case "servicos": return choice(quickReplyId);
  }
  if (message) {
    if (isComplaintState(state)) {
      const r = await continuarReclamacao(ctx, message);
      if (r) return r;
    }
    if (state === "aguardando_loja") {
      const r = resolveStoreText(ctx, message);
      if (r) return r;
      return freeText(ctx, message);
    }
    // Intenção barata antes da IA (rápida e correta mesmo sem IA).
    switch (detectIntent(message)) {
      case "banheiros": return choice("banheiros");
      case "alimentacao": return choice("alimentacao");
      case "servicos": return servicos();
    }
    return freeText(ctx, message);
  }
  return greeting(ctx);
}

export async function handleChat(session: SessionRow, req: ChatRequest): Promise<ChatResponse> {
  const ctx: Ctx = { session, pointId: session.point_id };
  const result = await dispatch(ctx, req);
  // Resposta que encerra um assunto (mapa, aviso…): devolve os botões iniciais para escolher outro.
  const last = result.messages.at(-1);
  if (result.state === "livre" && last && !last.quickReplies && !last.suggestInput) {
    last.quickReplies = MAIN_QUICK_REPLIES;
  }
  updateSession(session.id, result.state, result.lastDestId);
  return { messages: result.messages };
}

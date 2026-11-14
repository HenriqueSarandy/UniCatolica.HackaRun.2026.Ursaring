import type { ChatRequest, ChatResponse } from "@/types/contracts";
import { updateSession, type SessionRow } from "@/server/db/sessions";
import { detectIntent } from "./intent";
import { alimentacao } from "./handlers/alimentacao";
import { banheiros } from "./handlers/banheiros";
import { freeText } from "./handlers/freeText";
import { greeting } from "./handlers/greeting";
import { lojasPrompt, resolveStoreText, routeToStore } from "./handlers/lojas";
import { servicos } from "./handlers/servicos";
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
  switch (quickReplyId) {
    case "banheiros": return banheiros(ctx);
    case "alimentacao": return alimentacao(ctx);
    case "lojas": return lojasPrompt();
    case "servicos": return servicos();
  }
  if (message) {
    if (state === "aguardando_loja") {
      const r = resolveStoreText(ctx, message);
      if (r) return r;
      return freeText(ctx, message);
    }
    // Intenção barata antes da IA (rápida e correta mesmo sem IA).
    switch (detectIntent(message)) {
      case "banheiros": return banheiros(ctx);
      case "alimentacao": return alimentacao(ctx);
      case "servicos": return servicos();
    }
    return freeText(ctx, message);
  }
  return greeting(ctx);
}

export async function handleChat(session: SessionRow, req: ChatRequest): Promise<ChatResponse> {
  const ctx: Ctx = { session, pointId: session.point_id };
  const result = await dispatch(ctx, req);
  updateSession(session.id, result.state, result.lastDestId);
  return { messages: result.messages };
}

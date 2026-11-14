import { getRoute, getStoreLandmark, searchStores } from "@/server/maps/service";
import { bot, R, stripEmoji, TALK_TO_PERSON } from "../replies";
import type { Ctx, HandlerResult } from "../states";

export function lojasPrompt(): HandlerResult {
  return {
    state: "aguardando_loja",
    messages: [bot({ text: R.lojasPrompt, speakText: stripEmoji(R.lojasPrompt), suggestInput: "loja" })],
  };
}

export function routeToStore(ctx: Ctx, storeId: string): HandlerResult | null {
  const store = searchStoreById(storeId);
  const map = getRoute(ctx.pointId, storeId);
  if (map) {
    return {
      state: "livre",
      lastDestId: storeId,
      messages: [
        bot({ text: R.lojaAchei(map.floor), sticker: "feliz", map }),
        bot({ text: R.steps(map.steps) }),
      ],
    };
  }
  if (!store) return null;
  return {
    state: "livre",
    lastDestId: storeId,
    messages: [
      bot({ text: R.lojaSemRota(store.floor, getStoreLandmark(storeId)), quickReplies: [TALK_TO_PERSON] }),
    ],
  };
}

function searchStoreById(id: string) {
  // searchStores só busca por nome; reaproveita via nome do id (loja-xxx).
  const guess = id.replace(/^loja-/, "").replace(/-/g, " ");
  return searchStores(guess, 8).find((s) => s.id === id) ?? null;
}

/**
 * Resolve texto digitado como loja. Retorna `null` quando nada foi encontrado
 * (o chamador cai para a IA).
 */
export function resolveStoreText(ctx: Ctx, text: string): HandlerResult | null {
  const found = searchStores(text, 3);
  if (found.length === 0) return null;
  if (found.length === 1) return routeToStore(ctx, found[0].id);
  return {
    state: "aguardando_loja",
    messages: [
      bot({
        text: R.lojaQual,
        quickReplies: found.map((s) => ({ id: `store:${s.id}`, label: s.name })),
      }),
    ],
  };
}

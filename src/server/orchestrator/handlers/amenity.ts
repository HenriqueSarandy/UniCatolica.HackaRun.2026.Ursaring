import { getRoute, nearestAmenity } from "@/server/maps/service";
import { bot, R, stripEmoji, TALK_TO_PERSON } from "../replies";
import type { Ctx, HandlerResult } from "../states";

export function amenityFlow(
  ctx: Ctx,
  type: "banheiro_fraldario" | "praca_alimentacao",
  intro: (nome: string) => string,
): HandlerResult {
  const a = nearestAmenity(ctx.pointId, type);
  const map = a ? getRoute(ctx.pointId, a.id) : null;
  if (!a || !map) {
    return {
      state: "livre",
      messages: [bot({ text: R.semRotaAmenity, quickReplies: [TALK_TO_PERSON] })],
    };
  }
  const text = intro(a.name);
  return {
    state: "livre",
    lastDestId: a.id,
    messages: [
      bot({ text, speakText: stripEmoji(text), sticker: "feliz", map }),
      bot({ text: R.steps(map.steps) }),
    ],
  };
}

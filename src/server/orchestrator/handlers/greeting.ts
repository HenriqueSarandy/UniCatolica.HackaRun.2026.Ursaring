import { getPointName } from "@/server/maps/service";
import { bot, MAIN_QUICK_REPLIES, R, stripEmoji } from "../replies";
import type { Ctx, HandlerResult } from "../states";

export function greeting(ctx: Ctx): HandlerResult {
  const point = getPointName(ctx.pointId) ?? "no shopping";
  return {
    state: "inicio",
    messages: [
      bot({
        text: R.greeting(point),
        speakText: stripEmoji(R.greetingSpeak(point)),
        sticker: "inteligente",
        quickReplies: MAIN_QUICK_REPLIES,
      }),
    ],
  };
}

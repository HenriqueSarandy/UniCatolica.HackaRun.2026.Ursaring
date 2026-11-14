import { bot, R, stripEmoji } from "../replies";
import type { HandlerResult } from "../states";

export function servicos(): HandlerResult {
  return {
    state: "servicos",
    messages: [
      bot({ text: R.servicosPrompt, speakText: stripEmoji(R.servicosPrompt), sticker: "seguranca", suggestInput: "bo" }),
    ],
  };
}

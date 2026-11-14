import { bot, MAIN_QUICK_REPLIES } from "../replies";
import type { HandlerResult } from "../states";

export function ajudou(): HandlerResult {
  const text = "Que bom que ajudei! Posso ajudar em mais alguma coisa?";
  return { state: "livre", messages: [bot({ text, speakText: text, sticker: "feliz", quickReplies: MAIN_QUICK_REPLIES })] };
}

/** "Não ajudou" leva ao humano ou ao registro de reclamação. */
export function naoAjudou(): HandlerResult {
  const text =
    "Poxa, desculpa! Quer registrar uma reclamação para a equipe do shopping?";
  return {
    state: "livre",
    messages: [bot({ text, speakText: text, sticker: "padrao", quickReplies: [{ id: "rec:servicos", label: "Fazer uma reclamação" }, ...MAIN_QUICK_REPLIES.slice(0, 3)] })],
  };
}

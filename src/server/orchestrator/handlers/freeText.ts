import { askGemini } from "@/server/ai/gemini";
import { cacheGet, cacheKey, cacheSet } from "@/server/ai/cache";
import { sanitizeAi } from "@/server/ai/sanitize";
import { recentMessages } from "@/server/db/sessions";
import { getPointName, loadKnowledgeBase } from "@/server/maps/service";
import { normalize } from "../intent";
import { bot, MAIN_QUICK_REPLIES, R, stripEmoji, TALK_TO_PERSON } from "../replies";
import type { Ctx, HandlerResult } from "../states";

const KEYWORDS: [RegExp, string][] = [
  [/horario|abre|fecha|funciona/, "horario"],
  [/estacionamento|estacionar/, "estacionamento"],
  [/cinema|filme/, "cinema"],
  [/wi-?fi|internet/, "wifi"],
];

export function localFallback(text: string): string | null {
  const { shopping: s, lojas } = loadKnowledgeBase();
  const cinemaPiso = lojas.find((l) => l.id === "loja-cinema")?.piso;
  const info: Record<string, string> = {
    horario: `Lojas: ${s.horario.lojas}. Alimentação: ${s.horario.alimentacao}. Cinema: ${s.horario.cinema}.`,
    estacionamento: s.estacionamento,
    cinema: `O cinema fica no piso ${cinemaPiso ?? 2}. Horário: ${s.horario.cinema}.`,
    wifi: s.wifi,
  };
  const n = normalize(text);
  for (const [re, key] of KEYWORDS) if (re.test(n) && info[key]) return info[key];
  return null;
}

export async function freeText(ctx: Ctx, text: string): Promise<HandlerResult> {
  const key = cacheKey(ctx.pointId, normalize(text));
  let answer = cacheGet(key);

  if (!answer) {
    const history = recentMessages(ctx.session.id, 12);
    const ai = await askGemini(getPointName(ctx.pointId) ?? "no shopping", history, text);
    const clean = ai ? sanitizeAi(ai) : "";
    if (clean) { answer = clean; cacheSet(key, clean); }
  }
  answer ??= localFallback(text) ?? undefined;

  if (answer) {
    return { state: "livre", messages: [bot({ text: answer, speakText: stripEmoji(answer), quickReplies: [TALK_TO_PERSON] })] };
  }
  return { state: "livre", messages: [bot({ text: R.naoSei, quickReplies: MAIN_QUICK_REPLIES })] };
}

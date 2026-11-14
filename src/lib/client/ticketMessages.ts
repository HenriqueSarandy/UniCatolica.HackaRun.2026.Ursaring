import type { BotMessage, TicketPublic } from "@/types/contracts";
import { saveWatched } from "./useTicketWatch";
import { sendFeedback } from "./api";

let seq = 0;
const mid = () => `tk-${Date.now()}-${++seq}`;

/** Mensagem do CapiBot para uma mudança de status do chamado (ou null se não há o que dizer). */
/** Frase com pontuação final única (a equipe pode ou não ter escrito ponto). */
const sentence = (prefix: string, note?: string | null) => {
  const n = note?.trim();
  return n ? ` ${prefix}: ${n}${/[.!?]$/.test(n) ? "" : "."}` : "";
};

export function statusMessage(t: TicketPublic): BotMessage | null {
  if (t.status === "assumido") {
    return {
      id: mid(), role: "bot", sticker: "seguranca",
      text: `Pedido aceito! ${t.assignedTo ?? "Alguém"}, da equipe de atendimento, já está cuidando disso. Protocolo ${t.id}.`,
    };
  }
  if (t.status !== "concluido") return null;
  if (t.resolutionCode === "improcedente") {
    return {
      id: mid(), role: "bot", sticker: "padrao",
      text: `A equipe não pôde atender o pedido ${t.id}.${sentence("Motivo", t.resolutionNote)} Se precisar, procure o SAC, no piso 1.`,
    };
  }
  return {
    id: mid(), role: "bot", sticker: "feliz",
    text: `Seu pedido ${t.id} foi concluído.${sentence("Resolução", t.resolutionNote)} Deu certo?`,
    quickReplies: [
      { id: `fb-sim:${t.id}`, label: "Sim, obrigado" },
      ...(t.canReopen !== false ? [{ id: `fb-nao:${t.id}`, label: "Ainda não" }] : []),
    ],
  };
}

export const isFeedbackId = (id: string) => id.startsWith("fb-") || id.startsWith("rate-");

/**
 * Trata o clique em "Deu certo?" / nota. Devolve a resposta do bot e se o
 * chamado voltou a ser acompanhado (reabertura).
 */
export async function handleFeedback(
  qid: string, sessionId: string,
): Promise<{ message: BotMessage; reopenedId?: string }> {
  const [kind, id] = qid.split(":");
  if (kind === "fb-sim") {
    await sendFeedback(id, sessionId, { resolved: true });
    saveWatched(null);
    return {
      message: {
        id: mid(), role: "bot", sticker: "feliz", text: "Que bom! Quer avaliar o atendimento de 1 a 5?",
        quickReplies: [5, 4, 3, 2, 1].map((n) => ({ id: `rate-${n}:${id}`, label: `Nota ${n}` })),
      },
    };
  }
  if (kind === "fb-nao") {
    await sendFeedback(id, sessionId, { resolved: false });
    saveWatched({ id, lastStatus: "novo" });
    return {
      message: {
        id: mid(), role: "bot", sticker: "seguranca",
        text: `Poxa, desculpa! Reabri o pedido ${id} com prioridade alta e avisei a equipe.`,
      },
      reopenedId: id,
    };
  }
  await sendFeedback(id, sessionId, { resolved: true, rating: Number(kind.slice(5)) });
  return {
    message: { id: mid(), role: "bot", sticker: "feliz", text: "Obrigada pela avaliação! Ela ajuda o shopping a melhorar." },
  };
}

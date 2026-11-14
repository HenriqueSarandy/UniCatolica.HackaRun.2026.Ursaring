import type { BotMessage } from "@/types/contracts";
import { getRoute } from "@/server/maps/service";
import { createTicket, TicketError } from "@/server/tickets/service";
import { bot, MAIN_QUICK_REPLIES, R, stripEmoji } from "../replies";
import type { Ctx, HandlerResult } from "../states";
import { alimentacao } from "./alimentacao";
import { banheiros } from "./banheiros";
import { lojasPrompt } from "./lojas";

export type Topic = "banheiros" | "alimentacao" | "lojas" | "servicos";
export const TOPICS: readonly Topic[] = ["banheiros", "alimentacao", "lojas", "servicos"];
export const isTopic = (s: string | undefined): s is Topic => !!s && (TOPICS as readonly string[]).includes(s);

const TOPIC_LABEL: Record<Topic, string> = {
  banheiros: "Banheiros e Fraldário",
  alimentacao: "Praça de Alimentação",
  lojas: "Lojas e Cinema",
  servicos: "Serviços e ajuda",
};
const TOPIC_CATEGORY: Record<Topic, string> = {
  banheiros: "banheiro", alimentacao: "outro", lojas: "outro", servicos: "reclamacao",
};

// Estado da conversa guardado em sessions.state: "rec_nome|<topic>" e "rec_texto|<topic>|<nome codificado>".
const REC_NOME = "rec_nome";
const REC_TEXTO = "rec_texto";
export const isComplaintState = (state: string) => state.startsWith(`${REC_NOME}|`) || state.startsWith(`${REC_TEXTO}|`);

const say = (text: string, extra: Partial<BotMessage> = {}): BotMessage =>
  bot({ text, speakText: stripEmoji(text), ...extra });

/** Passo 2: depois do tópico, pergunta se quer a localização ou registrar uma reclamação. */
export function choice(topic: Topic): HandlerResult {
  return {
    state: "livre",
    messages: [
      say(`${TOPIC_LABEL[topic]}. O que você quer fazer?`, {
        sticker: "inteligente",
        quickReplies: [
          { id: `loc:${topic}`, label: "Ver a localização" },
          { id: `rec:${topic}`, label: "Fazer uma reclamação" },
        ],
      }),
    ],
  };
}

/** Localização: mapa com a rota dourada até o destino do tópico. */
export function localizacao(ctx: Ctx, topic: Topic): HandlerResult {
  switch (topic) {
    case "banheiros": return banheiros(ctx);
    case "alimentacao": return alimentacao(ctx);
    case "lojas": return lojasPrompt();
    case "servicos": {
      const map = getRoute(ctx.pointId, "sac");
      if (!map) {
        return { state: "livre", messages: [say("O SAC fica no piso 1, perto da Praça Central.", { quickReplies: MAIN_QUICK_REPLIES })] };
      }
      const text = "O SAC (Atendimento ao Cliente) fica pertinho. É só seguir a linha dourada no mapa!";
      return {
        state: "livre", lastDestId: "sac",
        messages: [say(text, { sticker: "feliz", map }), say(R.steps(map.steps))],
      };
    }
  }
}

/** Reclamação, passo 1: pede a identificação. */
export function pedirNome(topic: Topic): HandlerResult {
  return {
    state: `${REC_NOME}|${topic}`,
    messages: [say("Vou registrar a sua reclamação. Primeiro, qual é o seu nome? (Se quiser, inclua um telefone para retorno.)", { sticker: "seguranca" })],
  };
}

/** Reclamação, passo 2: guarda a identificação e pede o texto. */
export function receberNome(topic: Topic, nome: string): HandlerResult {
  const clean = nome.trim().replace(/\s+/g, " ").slice(0, 100);
  if (clean.length < 2) {
    return { state: `${REC_NOME}|${topic}`, messages: [say("Não entendi. Pode me dizer o seu nome?")] };
  }
  return {
    state: `${REC_TEXTO}|${topic}|${encodeURIComponent(clean)}`,
    messages: [say(`Obrigado, ${clean.split(" ")[0]}. Agora escreva a sua reclamação, com o máximo de detalhes.`)],
  };
}

/** Reclamação, passo 3: cria o chamado e devolve o protocolo (o chat passa a acompanhá-lo). */
export async function registrarReclamacao(ctx: Ctx, topic: Topic, nomeCodificado: string, texto: string): Promise<HandlerResult> {
  const nome = decodeURIComponent(nomeCodificado);
  try {
    const t = await createTicket({
      sessionId: ctx.session.id,
      text: texto,
      category: TOPIC_CATEGORY[topic],
      kind: "reclamacao",
      contact: `Nome: ${nome}`,
    });
    const msg = `Pronto, ${nome.split(" ")[0]}! Sua reclamação foi registrada. Protocolo ${t.ticketId}. A equipe vai analisar e eu aviso por aqui quando houver resposta.`;
    return {
      state: "livre",
      messages: [say(msg, { sticker: "feliz", ticketId: t.ticketId }), say("Posso ajudar em mais alguma coisa?", { quickReplies: MAIN_QUICK_REPLIES })],
    };
  } catch (e) {
    const state = `${REC_TEXTO}|${topic}|${nomeCodificado}`;
    if (e instanceof TicketError && e.status === 429) {
      return { state: "livre", messages: [say("Você já registrou várias reclamações nesta hora. Aguarde a resposta da equipe.", { quickReplies: MAIN_QUICK_REPLIES })] };
    }
    if (e instanceof TicketError && e.status === 400) {
      return { state, messages: [say("Esse texto ficou grande demais ou vazio. Pode resumir em até 1000 caracteres?")] };
    }
    throw e;
  }
}

/** Escolhe o próximo passo da reclamação conforme o estado da sessão (ou null se não está em reclamação). */
export async function continuarReclamacao(ctx: Ctx, message: string): Promise<HandlerResult | null> {
  const [step, topic, nome] = ctx.session.state.split("|");
  if (!isTopic(topic)) return null;
  if (step === REC_NOME) return receberNome(topic, message);
  if (step === REC_TEXTO && nome) return registrarReclamacao(ctx, topic, nome, message);
  return null;
}

/** Mantido para a saudação/intenções: "Serviços e ajuda" cai no passo de escolha. */
export const servicos = (): HandlerResult => choice("servicos");

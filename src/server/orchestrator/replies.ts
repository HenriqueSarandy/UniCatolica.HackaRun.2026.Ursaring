import type { BotMessage, QuickReply } from "@/types/contracts";

export const MAIN_QUICK_REPLIES: QuickReply[] = [
  { id: "banheiros", label: "Banheiros e Fraldário" },
  { id: "alimentacao", label: "Praça de Alimentação" },
  { id: "lojas", label: "Lojas e Cinema" },
  { id: "servicos", label: "Serviços e ajuda" },
];


export const R = {
  greeting: (point: string) =>
    `Oie! ✨ Eu sou o CapiBot. Você está em: ${point}, e eu já sei exataaaamente onde você está no mapa. O que você quer fazer agora?`,
  greetingSpeak: (point: string) =>
    `Oie! Eu sou o CapiBot. Você está em: ${point}, e eu já sei exatamente onde você está no mapa. O que você quer fazer agora?`,
  banheiro: (nome: string) =>
    `Sua bexiga agradece! 🚻 O banheiro com fraldário mais pertinho de você é o ${nome}.`,
  alimentacao: (nome: string) =>
    `Bateu a fome? 🍔 O lugar mais pertinho para comer é a ${nome}.`,
  steps: (steps: string[]) =>
    `É só seguir essa linha dourada! ${steps.slice(0, 4).join(". ")}.`,
  semRotaAmenity: "Achei o lugar, mas ainda não tenho o caminho desenhado. Ele fica perto do SAC, no piso 1.",
  lojasPrompt: "Opa, bora gastar! 🛍️ Digita o nome da loja que você procura (ou escolhe na lista).",
  lojaAchei: (floor: number) =>
    `Achei! Fica no piso ${floor}. Segue esse mapinha com a rota dourada aqui embaixo!`,
  lojaSemRota: (floor: number, landmark: string | null) =>
    `Achei a loja, mas ainda não tenho o caminho desenhado. Fica no piso ${floor}${landmark ? `, ${landmark}` : ""}.`,
  lojaQual: "Qual dessas?",
  lojaNaoAchei: "Não achei essa loja. Tenta outro nome?",
  naoSei: "Não tenho certeza. Escolha uma das opções abaixo ou reformule a pergunta.",
};

export function bot(partial: Omit<BotMessage, "id" | "role">): BotMessage {
  return { id: crypto.randomUUID(), role: "bot", ...partial };
}

/** Remove emojis para o botão "Ouvir". */
export function stripEmoji(s: string): string {
  return s.replace(/[\p{Extended_Pictographic}\u200d\ufe0f✨]/gu, "").replace(/\s{2,}/g, " ").trim();
}

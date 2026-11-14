import type { BotMessage, ChatRequest, ChatResponse, SessionResponse } from "@/types/contracts";

let n = 0;
const id = () => `mock-${++n}`;

const MENU = [
  { id: "banheiros", label: "Banheiros" },
  { id: "alimentacao", label: "Praça de alimentação" },
  { id: "lojas", label: "Lojas" },
  { id: "servicos", label: "Serviços e ajuda" },
];

export function mockSession(pointId: string): SessionResponse {
  return {
    sessionId: "mock-session",
    point: { id: pointId, name: pointId === "entrada-principal" ? "Entrada principal" : pointId },
  };
}

export function mockChat(req: ChatRequest): ChatResponse {
  const bot = (m: Omit<BotMessage, "id" | "role">): BotMessage => ({ id: id(), role: "bot", ...m });

  if (req.quickReplyId === "banheiros") {
    return {
      messages: [
        bot({
          text: "O banheiro mais perto fica logo ali. Siga o caminho dourado:",
          sticker: "inteligente",
          map: {
            floor: 1, mapSvgUrl: "/maps/piso-1.svg", viewBox: "0 0 1200 800",
            routePath: "M100 100 L300 100", origin: { x: 100, y: 100, label: "Você" },
            destination: { x: 300, y: 100, label: "Banheiro" },
            altText: "Mapa do piso 1 com o caminho da entrada até o banheiro, ao sul.",
            steps: ["Siga reto por 30 passos", "Vire à direita", "O banheiro fica à sua esquerda"],
          },
          quickReplies: MENU,
        }),
      ],
    };
  }
  if (req.quickReplyId === "lojas") {
    return { messages: [bot({ text: "Qual loja você procura?", suggestInput: "loja" })] };
  }
  if (req.quickReplyId === "servicos") {
    return {
      messages: [bot({ text: "Conte o que aconteceu. Você pode falar, escrever ou mandar uma foto.", sticker: "seguranca", suggestInput: "bo" })],
    };
  }
  if (req.quickReplyId === "alimentacao" || req.message || req.storeId) {
    return { messages: [bot({ text: "Entendi! Posso ajudar com mais alguma coisa?", sticker: "feliz", quickReplies: MENU })] };
  }
  return {
    messages: [bot({ text: "Oi! Eu sou o CapiBot. Como posso ajudar?", sticker: "padrao", quickReplies: MENU })],
  };
}

import type { TicketCategory, TicketKind, TicketTeam } from "@/types/contracts";

export type TicketPriority = "normal" | "alta";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const CATEGORY_RULES: [TicketCategory, RegExp][] = [
  ["cadeira_de_rodas", /cadeira de rodas/],
  ["reclamacao", /reclam|pessimo|mau atendimento|demora|absurdo|sugest/],
  ["carro", /carro|estacionamento/],
  ["objeto_perdido", /perdi|esqueci|achei/],
  ["banheiro", /papel|sujo|banheiro/],
];

const URGENT = /socorro|emergencia|passando mal|desmaiou|crianca perdida|fogo|roubo/;

export function categorize(
  text: string,
  given?: TicketCategory,
): { category: TicketCategory; priority: TicketPriority; kind: TicketKind; team: TicketTeam } {
  const t = norm(text);
  let category: TicketCategory = given ?? "outro";
  if (!given) {
    category = CATEGORY_RULES.find(([, re]) => re.test(t))?.[0] ?? "outro";
  }
  const priority: TicketPriority =
    URGENT.test(t) || category === "cadeira_de_rodas" ? "alta" : "normal";
  const kind: TicketKind = /sugest/.test(t) ? "sugestao" : category === "reclamacao" ? "reclamacao" : "ajuda";
  const team: TicketTeam =
    priority === "alta" || category === "carro" || category === "cadeira_de_rodas" ? "seguranca"
    : category === "banheiro" ? "limpeza"
    : "sac";
  return { category, priority, kind, team };
}

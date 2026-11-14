import type { TicketCategory } from "@/types/contracts";

export type TicketPriority = "normal" | "alta";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const CATEGORY_RULES: [TicketCategory, RegExp][] = [
  ["cadeira_de_rodas", /cadeira de rodas/],
  ["carro", /carro|estacionamento/],
  ["objeto_perdido", /perdi|esqueci|achei/],
  ["banheiro", /papel|sujo|banheiro/],
];

const URGENT = /socorro|emergencia|passando mal|desmaiou|crianca perdida|fogo|roubo/;

export function categorize(
  text: string,
  given?: TicketCategory,
): { category: TicketCategory; priority: TicketPriority } {
  const t = norm(text);
  let category: TicketCategory = given ?? "outro";
  if (!given) {
    category = CATEGORY_RULES.find(([, re]) => re.test(t))?.[0] ?? "outro";
  }
  const priority: TicketPriority =
    URGENT.test(t) || category === "cadeira_de_rodas" ? "alta" : "normal";
  return { category, priority };
}

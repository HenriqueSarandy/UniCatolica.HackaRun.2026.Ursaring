import { z } from "zod";
import baseJson from "../../../data/base-shopping.json";
import grafoJson from "../../../data/grafo.json";
import rotasJson from "../../../data/rotas.json";
import type { MapPayload, StoreSummary } from "@/types/contracts";
import { buildGraph, describePath, shortestPath, type Graph } from "./graph";

// ---------- schemas ----------
const Ponto = z.object({
  id: z.string(), nome: z.string(), piso: z.number().int(), x: z.number(), y: z.number(), qr: z.boolean(),
});
const AmenityType = z.enum(["banheiro_fraldario", "praca_alimentacao", "sac"]);
const Comodidade = z.object({
  id: z.string(), tipo: AmenityType, nome: z.string(), piso: z.number().int(), pontoId: z.string(),
});
const Loja = z.object({
  id: z.string(), nome: z.string(), categoria: z.string(), piso: z.number().int(),
  pontoId: z.string(), referencia: z.string(), sinonimos: z.array(z.string()),
});
export const KnowledgeBaseSchema = z.object({
  shopping: z.object({
    nome: z.string(),
    horario: z.object({ lojas: z.string(), alimentacao: z.string(), cinema: z.string() }),
    estacionamento: z.string(), wifi: z.string(), contato: z.string(),
  }),
  pontos: z.array(Ponto),
  comodidades: z.array(Comodidade),
  lojas: z.array(Loja),
  eventos: z.array(z.object({ nome: z.string(), quando: z.string(), onde: z.string() })),
  faq: z.array(z.object({ pergunta: z.string(), resposta: z.string() })),
});
export const GrafoSchema = z.object({
  nos: z.array(z.object({ id: z.string(), piso: z.number().int(), x: z.number(), y: z.number() })),
  arestas: z.array(z.tuple([z.string(), z.string()])),
});
export const RotasSchema = z.object({
  rotas: z.array(z.object({
    de: z.string(), para: z.string(), piso: z.number().int(), path: z.string(), passos: z.array(z.string()),
  })),
});

export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>;
export type AmenityTipo = "banheiro_fraldario" | "praca_alimentacao";
type Ponto = z.infer<typeof Ponto>;

// ---------- carga (uma vez) ----------
interface Loaded { kb: KnowledgeBase; pontos: Map<string, Ponto>; graph: Graph; rotas: z.infer<typeof RotasSchema>["rotas"] }
let cache: Loaded | null = null;

function load(): Loaded {
  if (cache) return cache;
  const kb = KnowledgeBaseSchema.parse(baseJson);
  const pontos = new Map(kb.pontos.map((p) => [p.id, p]));
  const grafo = GrafoSchema.parse(grafoJson);
  // nós do grafo = pontos da base + junções extras de grafo.json
  const graph = buildGraph([...kb.pontos, ...grafo.nos], grafo.arestas as [string, string][]);
  cache = { kb, pontos, graph, rotas: RotasSchema.parse(rotasJson).rotas };
  return cache;
}

export function loadKnowledgeBase(): KnowledgeBase { return load().kb; }

export function getPointName(pointId: string): string | null {
  return load().pontos.get(pointId)?.nome ?? null;
}

// ---------- busca de lojas ----------
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function scoreStore(q: string, loja: z.infer<typeof Loja>): number {
  const name = norm(loja.nome);
  const syns = loja.sinonimos.map(norm);
  const padded = ` ${q} `;
  let score = 0;
  if (name.startsWith(q)) score = 3;
  else if (name.includes(q)) score = 2;
  // sinônimo contém a busca, ou a frase digitada cita a loja/sinônimo ("onde fica a renner")
  if (syns.some((s) => s.includes(q))) score = Math.max(score, 2);
  if ([name, ...syns].some((t) => t && padded.includes(` ${t} `))) score = Math.max(score, 2);
  if (score === 0 && q.length >= 4) {
    const terms = [name, ...syns].flatMap((t) => [t, ...t.split(" ").filter((w) => w.length >= 4)]);
    if (terms.some((t) => levenshtein(q, t) <= 2)) score = 1;
  }
  return score;
}

export function searchStores(q: string, limit = 8): StoreSummary[] {
  const n = norm(q);
  if (!n) return [];
  return load().kb.lojas
    .map((l) => ({ l, score: scoreStore(n, l) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.l.nome.localeCompare(b.l.nome, "pt-BR"))
    .slice(0, limit)
    .map(({ l }) => ({ id: l.id, name: l.nome, floor: l.piso, category: l.categoria }));
}

export function getStore(id: string): (StoreSummary & { reference: string }) | null {
  const l = load().kb.lojas.find((x) => x.id === id);
  return l ? { id: l.id, name: l.nome, floor: l.piso, category: l.categoria, reference: l.referencia } : null;
}

/** Frase de localização da loja (ex.: "no lado norte, ao lado da Renner"). */
export function getStoreLandmark(id: string): string | null {
  return getStore(id)?.reference ?? null;
}

// ---------- rotas ----------
interface Destination { ponto: Ponto; nome: string; referencia?: string }

function resolveDestination(toId: string): Destination | null {
  const { kb, pontos } = load();
  const loja = kb.lojas.find((l) => l.id === toId);
  const com = loja ? undefined : kb.comodidades.find((c) => c.id === toId);
  const ponto = pontos.get(loja?.pontoId ?? com?.pontoId ?? toId);
  if (!ponto) return null;
  return { ponto, nome: loja?.nome ?? com?.nome ?? ponto.nome, referencia: loja?.referencia };
}

export function getRoute(fromId: string, toId: string): MapPayload | null {
  const { pontos, graph, rotas } = load();
  const origin = pontos.get(fromId);
  const dest = resolveDestination(toId);
  if (!origin || !dest || origin.id === dest.ponto.id) return null;

  const floor = dest.ponto.piso;
  const crossFloor = origin.piso !== floor;
  // Rota entre pisos: mostra o piso do destino, a partir da escada rolante.
  const start = crossFloor ? pontos.get(`escada-${floor}`) : origin;
  if (!start) return null;

  let routePath: string;
  let steps: string[];
  const manual = rotas.find((r) => r.de === fromId && r.para === dest.ponto.id && r.piso === floor);
  if (manual) {
    routePath = manual.path;
    steps = [...manual.passos];
  } else {
    const nodes = shortestPath(graph, start.id, dest.ponto.id);
    if (!nodes) return null;
    ({ d: routePath, steps } = describePath(nodes));
  }
  if (crossFloor) {
    steps.unshift(`${floor > origin.piso ? "Suba" : "Desça"} a escada rolante até o piso ${floor}`);
  }
  steps.push(`Você chegou: ${dest.nome}`);

  const originLabel = crossFloor ? `Escada rolante (piso ${floor})` : "Você está aqui";
  const where = dest.referencia ? `O destino, ${dest.nome}, fica ${dest.referencia}.` : `O destino é ${dest.nome}.`;
  const altText =
    `Mapa do piso ${floor}. ` +
    (crossFloor ? `Você está aqui (${origin.nome}, piso ${origin.piso}). ` : `Você está aqui (${origin.nome}). `) +
    `${where} Siga a linha dourada: ${steps.join("; ")}.`;

  return {
    floor,
    mapSvgUrl: `/maps/piso-${floor}.svg`,
    viewBox: "0 0 1200 800",
    routePath,
    origin: { x: start.x, y: start.y, label: originLabel },
    destination: { x: dest.ponto.x, y: dest.ponto.y, label: dest.nome },
    altText,
    steps,
  };
}

// ---------- comodidade mais próxima ----------
const FLOOR_PENALTY = 300;

export function nearestAmenity(fromPointId: string, tipo: AmenityTipo): { id: string; name: string } | null {
  const { kb, pontos } = load();
  const from = pontos.get(fromPointId);
  if (!from) return null;
  let best: { id: string; name: string; d: number } | null = null;
  for (const c of kb.comodidades.filter((x) => x.tipo === tipo)) {
    const p = pontos.get(c.pontoId);
    if (!p || !getRoute(fromPointId, c.id)) continue;
    const d = Math.hypot(p.x - from.x, p.y - from.y) + (p.piso === from.piso ? 0 : FLOOR_PENALTY);
    if (!best || d < best.d) best = { id: c.id, name: c.nome, d };
  }
  return best && { id: best.id, name: best.name };
}

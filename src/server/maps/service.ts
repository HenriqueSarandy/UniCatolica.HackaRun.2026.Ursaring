// STUB TEMPORÁRIO (Dev 2) — o Dev 3 substitui este arquivo mantendo as assinaturas do README.
import type { MapPayload, StoreSummary } from "@/types/contracts";

interface Store extends StoreSummary { landmark: string; hasRoute: boolean }
export interface KnowledgeBase {
  name: string;
  points: { id: string; name: string }[];
  stores: Store[];
  amenities: { id: string; type: "banheiro_fraldario" | "praca_alimentacao"; name: string }[];
  info: Record<string, string>;
}

const KB: KnowledgeBase = {
  name: "Capim Dourado Shopping",
  points: [
    { id: "entrada-principal", name: "Entrada Principal" },
    { id: "entrada-sul", name: "Entrada Sul" },
  ],
  stores: [
    { id: "loja-pernambucanas", name: "Pernambucanas", floor: 1, category: "moda", landmark: "a escada rolante", hasRoute: true },
    { id: "loja-cinema", name: "Cinema Capim", floor: 2, category: "lazer", landmark: "a praça de alimentação", hasRoute: true },
    { id: "loja-livraria", name: "Livraria Cerrado", floor: 1, category: "livros", landmark: "o café central", hasRoute: false },
  ],
  amenities: [
    { id: "banheiro-sul", type: "banheiro_fraldario", name: "Banheiro Sul" },
    { id: "praca-alimentacao", type: "praca_alimentacao", name: "Praça de Alimentação" },
  ],
  info: {
    horario: "O shopping funciona todos os dias, das 10h às 22h.",
    estacionamento: "O estacionamento fica no subsolo e na lateral norte.",
    cinema: "O cinema fica no piso 2, ao lado da praça de alimentação.",
    wifi: "Tem Wi-Fi grátis em todo o shopping: rede CapimDourado.",
  },
};

export function loadKnowledgeBase(): KnowledgeBase { return KB; }

export function getPointName(pointId: string): string | null {
  return KB.points.find((p) => p.id === pointId)?.name ?? null;
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function searchStores(q: string, limit = 8): StoreSummary[] {
  const n = norm(q).trim();
  if (!n) return [];
  return KB.stores
    .filter((s) => norm(s.name).includes(n) || n.includes(norm(s.name)))
    .slice(0, limit)
    .map(({ id, name, floor, category }) => ({ id, name, floor, category }));
}

export function getStoreLandmark(id: string): string | null {
  return KB.stores.find((s) => s.id === id)?.landmark ?? null;
}

export function getRoute(fromId: string, toId: string): MapPayload | null {
  const store = KB.stores.find((s) => s.id === toId);
  const amenity = KB.amenities.find((a) => a.id === toId);
  if (!store && !amenity) return null;
  if (store && !store.hasRoute) return null;
  return {
    floor: store?.floor ?? 1,
    mapSvgUrl: "/maps/piso-1.svg",
    viewBox: "0 0 1200 800",
    routePath: "M100 700 L100 400 L600 400 L600 150",
    origin: { x: 100, y: 700, label: "Você está aqui" },
    destination: { x: 600, y: 150, label: store?.name ?? amenity!.name },
    altText: `Rota de ${fromId} até ${store?.name ?? amenity!.name}.`,
    steps: ["Siga reto pelo corredor", "Vire à direita", "Siga até o fim"],
  };
}

export function nearestAmenity(
  _fromPointId: string,
  type: "banheiro_fraldario" | "praca_alimentacao",
): { id: string; name: string } | null {
  const a = KB.amenities.find((x) => x.type === type);
  return a ? { id: a.id, name: a.name } : null;
}

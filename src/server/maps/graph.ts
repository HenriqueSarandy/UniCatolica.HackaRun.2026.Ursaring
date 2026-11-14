// Grafo de corredores + Dijkstra. Gera o `d` do SVG e os passos em pt-BR.
// 1 unidade do SVG ≈ 10 cm (a planta de 1200 unidades tem ~120 m).

export interface GraphNode { id: string; piso: number; x: number; y: number }
export type GraphEdge = readonly [string, string];

export interface Graph {
  nodes: Map<string, GraphNode>;
  adj: Map<string, { to: string; w: number }[]>;
}

export function buildGraph(nodes: GraphNode[], edges: GraphEdge[]): Graph {
  const map = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, { to: string; w: number }[]>();
  for (const [a, b] of edges) {
    const na = map.get(a);
    const nb = map.get(b);
    if (!na || !nb) throw new Error(`aresta com nó inexistente: ${a} -> ${b}`);
    const w = Math.hypot(na.x - nb.x, na.y - nb.y);
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push({ to: b, w });
    adj.get(b)!.push({ to: a, w });
  }
  return { nodes: map, adj };
}

/** Menor caminho (Dijkstra, O(n²): o grafo tem dezenas de nós). `null` se não houver. */
export function shortestPath(g: Graph, from: string, to: string): GraphNode[] | null {
  if (!g.nodes.has(from) || !g.nodes.has(to)) return null;
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const todo = new Set<string>([from]);
  const done = new Set<string>();
  while (todo.size) {
    let cur = "";
    let best = Infinity;
    for (const id of todo) {
      const d = dist.get(id)!;
      if (d < best) { best = d; cur = id; }
    }
    todo.delete(cur);
    if (cur === to) break;
    done.add(cur);
    for (const { to: nb, w } of g.adj.get(cur) ?? []) {
      if (done.has(nb)) continue;
      const nd = best + w;
      if (nd < (dist.get(nb) ?? Infinity)) {
        dist.set(nb, nd);
        prev.set(nb, cur);
        todo.add(nb);
      }
    }
  }
  if (!dist.has(to)) return null;
  const path: GraphNode[] = [];
  for (let id: string | undefined = to; id; id = prev.get(id)) path.unshift(g.nodes.get(id)!);
  return path;
}

const metros = (len: number) => Math.max(5, Math.round(len / 10 / 5) * 5);

/** Converte o caminho em `M x y L …` (só nos cantos) e passos de texto. */
export function describePath(path: GraphNode[]): { d: string; steps: string[] } {
  // remove nós colineares, somando as distâncias dos trechos retos
  const corners: GraphNode[] = [path[0]];
  const lens: number[] = [];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const seg = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    acc += seg;
    const next = path[i + 1];
    const straight = next && cross(path[i - 1], path[i], next) === 0 && dot(path[i - 1], path[i], next) > 0;
    if (!straight) {
      corners.push(path[i]);
      lens.push(acc);
      acc = 0;
    }
  }

  const steps = lens.map((len, i) => {
    const dist = `cerca de ${metros(len)} metros`;
    if (i === 0) return `Siga em frente por ${dist}`;
    const c = cross(corners[i - 1], corners[i], corners[i + 1]);
    const d = dot(corners[i - 1], corners[i], corners[i + 1]);
    const turn = d < 0 && c === 0 ? "Faça o retorno" : c > 0 ? "Vire à direita" : "Vire à esquerda";
    return `${turn} e siga por ${dist}`;
  });

  const d = corners.map((n, i) => `${i ? "L" : "M"}${n.x} ${n.y}`).join(" ");
  return { d, steps };
}

// Coordenadas de tela (y para baixo): produto vetorial > 0 = curva à direita.
function cross(a: GraphNode, b: GraphNode, c: GraphNode) {
  return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
}
function dot(a: GraphNode, b: GraphNode, c: GraphNode) {
  return (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y);
}

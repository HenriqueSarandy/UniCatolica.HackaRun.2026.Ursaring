// Gera as plantas SVG (public/maps) e o grafo de corredores (data/grafo.json)
// a partir de data/base-shopping.json. Uso: node scripts/gen-maps.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const kb = JSON.parse(readFileSync(join(root, "data/base-shopping.json"), "utf8"));

const CORRIDOR_Y = 400;
const CENTER_X = 600;
const HALF_W = 60; // meia largura de cada loja
const ROW_H = 250;
const BROWN = "#5A3A00";

const pontos = kb.pontos;
const pisos = [...new Set(pontos.map((p) => p.piso))].sort();

// ---------- grafo ----------
const nos = [];
const arestas = [];
for (const piso of pisos) {
  const doPiso = pontos.filter((p) => p.piso === piso);
  const isDoor = (p) => p.y !== CORRIDOR_Y && p.x !== CENTER_X;
  const xs = new Set([CENTER_X]);
  for (const p of doPiso) if (p.y === CORRIDOR_Y || isDoor(p)) xs.add(p.x);
  const sorted = [...xs].sort((a, b) => a - b);
  const made = new Map();
  const junction = (x) => {
    const existing = doPiso.find((p) => p.x === x && p.y === CORRIDOR_Y);
    if (existing) return existing.id;
    if (made.has(x)) return made.get(x);
    const id = `j${piso}-${x}`;
    nos.push({ id, piso, x, y: CORRIDOR_Y });
    made.set(x, id);
    return id;
  };
  const ids = sorted.map(junction);
  for (let i = 0; i < ids.length - 1; i++) arestas.push([ids[i], ids[i + 1]]);
  for (const p of doPiso.filter(isDoor)) arestas.push([junction(p.x), p.id]);
  // corredor vertical central
  const vertical = doPiso.filter((p) => p.x === CENTER_X).sort((a, b) => a.y - b.y);
  for (let i = 0; i < vertical.length - 1; i++) arestas.push([vertical[i].id, vertical[i + 1].id]);
}
const lines = (arr) => arr.map((o) => "    " + JSON.stringify(o)).join(",\n");
writeFileSync(join(root, "data/grafo.json"), `{\n  "nos": [\n${lines(nos)}\n  ],\n  "arestas": [\n${lines(arestas)}\n  ]\n}\n`);

// ---------- SVG ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
function wrap(text, max = 11) {
  const lines = [];
  for (const w of text.split(" ")) {
    if (lines.length && (lines[lines.length - 1] + " " + w).length <= max) lines[lines.length - 1] += " " + w;
    else lines.push(w);
  }
  return lines;
}
function label(lines, cx, cy, size = 16) {
  const y0 = cy - ((lines.length - 1) * (size + 2)) / 2;
  return lines
    .map((l, i) => `<text x="${cx}" y="${y0 + i * (size + 2) + 5}" text-anchor="middle" font-size="${size}" fill="#2B1D00">${esc(l)}</text>`)
    .join("");
}

const SPECIAL = {
  // áreas largas (x, largura)
  "praca-oeste": { x: 80, w: 480 },
  "praca-leste": { x: 760, w: 360 },
};
const byPonto = new Map();
for (const l of kb.lojas) byPonto.set(l.pontoId, { gid: l.id, nome: l.nome, fill: "#FFFDF3" });
for (const c of kb.comodidades) byPonto.set(c.pontoId, { gid: c.id, nome: c.nome, fill: "#FCEFC0", short: pontos.find((p) => p.id === c.pontoId).nome });

mkdirSync(join(root, "public/maps"), { recursive: true });
for (const piso of pisos) {
  const parts = [];
  parts.push(`<rect width="1200" height="800" fill="#FFF8E1"/>`);
  // corredores
  parts.push(`<rect x="80" y="340" width="1040" height="120" fill="#FFFFFF" opacity=".55"/>`);
  parts.push(`<rect x="570" y="40" width="60" height="720" fill="#FFFFFF" opacity=".55"/>`);
  for (const p of pontos.filter((q) => q.piso === piso)) {
    const f = byPonto.get(p.id);
    if (!f) continue;
    const sp = SPECIAL[p.id];
    const x = sp ? sp.x : p.x - HALF_W;
    const w = sp ? sp.w : HALF_W * 2;
    const y = p.y < CORRIDOR_Y ? p.y - ROW_H : p.y;
    const shown = p.id.startsWith("praca-") ? "Praça de Alimentação" : f.short ?? f.nome;
    const lines = p.id.startsWith("praca-") ? [shown, p.id === "praca-oeste" ? "ala Oeste" : "ala Leste"] : wrap(shown);
    parts.push(
      `<g id="${f.gid}"><title>${esc(f.nome)}</title><rect x="${x}" y="${y}" width="${w}" height="${ROW_H}" fill="${f.fill}" stroke="${BROWN}" stroke-width="2"/>${label(lines, x + w / 2, p.y < CORRIDOR_Y ? y + 60 : y + ROW_H - 60)}</g>`,
    );
  }
  // pontos fixos: entradas, escada, praça central
  for (const p of pontos.filter((q) => q.piso === piso)) {
    if (p.id === "entrada-principal" || p.id === "entrada-norte") {
      const top = p.id === "entrada-norte";
      parts.push(`<g id="${p.id}"><title>${p.nome}</title><rect x="540" y="${top ? 20 : 746}" width="120" height="34" fill="#F2B705" stroke="${BROWN}" stroke-width="2"/>${label([p.nome], 600, top ? 37 : 763)}</g>`);
    }
    if (p.id.startsWith("escada-")) {
      parts.push(`<g id="${p.id}"><title>Escada rolante</title><rect x="580" y="236" width="40" height="28" fill="#FCEFC0" stroke="${BROWN}" stroke-width="2"/>${label(["Escada", "rolante"], 600, 290)}</g>`);
    }
  }
  if (piso === 1) parts.push(`<g id="praca-central"><title>Praça Central</title><circle cx="600" cy="400" r="44" fill="none" stroke="${BROWN}" stroke-width="2" stroke-dasharray="6 4"/>${label(["Praça", "Central"], 600, 400)}</g>`);
  parts.push(`<text x="20" y="34" font-size="22" font-weight="bold" fill="#2B1D00">Piso ${piso}</text>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800" font-family="system-ui, sans-serif">\n<title>Planta do piso ${piso} - ${esc(kb.shopping.nome)}</title>\n${parts.join("\n")}\n</svg>\n`;
  writeFileSync(join(root, `public/maps/piso-${piso}.svg`), svg);
}
console.log(`ok: ${pisos.length} plantas, ${nos.length} nós extras, ${arestas.length} arestas`);

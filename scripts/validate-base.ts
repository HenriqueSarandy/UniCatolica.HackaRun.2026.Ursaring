// Valida a base do shopping, a planta e as rotas. Uso: npm run validate:base
// Sai com código 1 se houver erro (referência quebrada, mínimo não atingido, rota ausente…).
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getRoute, loadKnowledgeBase } from "../src/server/maps/service";

const root = join(__dirname, "..");
const errors: string[] = [];
const err = (m: string) => errors.push(m);

const kb = loadKnowledgeBase(); // zod: lança se o schema estiver errado
const pontos = new Map(kb.pontos.map((p) => [p.id, p]));

// ids únicos
for (const [nome, lista] of [["pontos", kb.pontos], ["lojas", kb.lojas], ["comodidades", kb.comodidades]] as const) {
  const ids = lista.map((x) => x.id);
  for (const id of new Set(ids.filter((v, i) => ids.indexOf(v) !== i))) err(`id duplicado em ${nome}: ${id}`);
}

// referências e coordenadas
for (const p of kb.pontos) {
  if (p.x < 0 || p.x > 1200 || p.y < 0 || p.y > 800) err(`ponto fora do viewBox: ${p.id}`);
}
for (const item of [...kb.lojas, ...kb.comodidades]) {
  const p = pontos.get(item.pontoId);
  if (!p) err(`${item.id}: pontoId inexistente (${item.pontoId})`);
  else if (p.piso !== item.piso) err(`${item.id}: piso ${item.piso} difere do ponto (${p.piso})`);
}
for (const e of kb.eventos) {
  if (!e.nome || !e.onde) err("evento incompleto");
}

// orientações: destino deve existir e ter rota desenhada
for (const o of kb.orientacoes) {
  if (o.destino && !pontos.has(o.destino)) err(`orientação ${o.id}: destino inexistente (${o.destino})`);
}
{
  const ids = kb.orientacoes.map((o) => o.id);
  for (const need of ["carro", "objeto_perdido", "cadeira_de_rodas", "banheiro", "emergencia", "reclamacao"]) {
    if (!ids.includes(need)) err(`orientação obrigatória ausente: ${need}`);
  }
}

// mínimos da demo
const min = (cond: boolean, msg: string) => { if (!cond) err(msg); };
const qrs = kb.pontos.filter((p) => p.qr);
const count = (t: string) => kb.comodidades.filter((c) => c.tipo === t).length;
min(qrs.length >= 6, `precisa de ≥6 pontos de QR (tem ${qrs.length})`);
min(count("banheiro_fraldario") >= 3, "precisa de ≥3 banheiros/fraldários");
min(count("praca_alimentacao") >= 2, "precisa de ≥2 pontos da praça de alimentação");
min(kb.lojas.length >= 20, `precisa de ≥20 lojas (tem ${kb.lojas.length})`);
min(new Set(kb.lojas.map((l) => l.piso)).size >= 2, "lojas em pelo menos 2 pisos");
min(kb.faq.length >= 10, `FAQ precisa de ≥10 perguntas (tem ${kb.faq.length})`);
for (const nome of ["Pernambucanas", "C&A", "Renner", "Cinema"]) {
  min(kb.lojas.some((l) => l.nome.startsWith(nome)), `loja obrigatória ausente: ${nome}`);
}
const bytes = Buffer.byteLength(JSON.stringify(kb));
min(bytes < 15 * 1024, `base grande demais para o prompt do Gemini: ${bytes} bytes (limite 15 KB)`);

// plantas
for (const piso of new Set(kb.pontos.map((p) => p.piso))) {
  const file = join(root, `public/maps/piso-${piso}.svg`);
  if (!existsSync(file)) { err(`planta ausente: piso-${piso}.svg`); continue; }
  const svg = readFileSync(file, "utf8");
  min(svg.includes('viewBox="0 0 1200 800"'), `piso-${piso}.svg: viewBox deve ser "0 0 1200 800"`);
  min(statSync(file).size < 150 * 1024, `piso-${piso}.svg passa de 150 KB`);
  for (const item of [...kb.lojas, ...kb.comodidades].filter((i) => i.piso === piso)) {
    if (!svg.includes(`id="${item.id}"`)) err(`piso-${piso}.svg: falta <g id="${item.id}">`);
  }
}

// rotas: todo QR alcança toda loja e comodidade (exceto a si mesmo)
for (const qr of qrs) {
  for (const dest of [...kb.lojas, ...kb.comodidades]) {
    if (dest.pontoId === qr.id) continue;
    if (!getRoute(qr.id, dest.id)) err(`sem rota: ${qr.id} → ${dest.id}`);
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problema(s):\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(
  `✓ base ok: ${kb.pontos.length} pontos, ${kb.lojas.length} lojas, ${kb.comodidades.length} comodidades, ` +
    `${qrs.length} QRs, ${kb.faq.length} FAQs, ${bytes} bytes`,
);

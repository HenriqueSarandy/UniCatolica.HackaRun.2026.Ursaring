// Popula chamados fictícios para a demo mostrar os indicadores. Uso: npm run seed:demo
// Marca tudo com o texto "[demo]" e pode ser limpo com: npm run seed:demo -- --clear
import { db } from "../src/server/db";
import { createSession } from "../src/server/db/sessions";
import { logEvent } from "../src/server/tickets/service";

if (process.argv.includes("--clear")) {
  const ids = (db.prepare("SELECT id FROM tickets WHERE text LIKE '[demo]%'").all() as { id: string }[]).map((r) => r.id);
  for (const id of ids) {
    db.prepare("DELETE FROM ticket_events WHERE ticket_id = ?").run(id);
    db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
  }
  console.log(`✓ ${ids.length} chamado(s) de demo removido(s)`);
  process.exit(0);
}

const POINTS = ["entrada-principal", "entrada-norte", "frente-cea", "frente-renner", "frente-praca", "frente-cinema"];
const SAMPLES: { cat: string; kind: string; team: string; prio: string; text: string }[] = [
  { cat: "carro", kind: "ajuda", team: "seguranca", prio: "normal", text: "não acho meu carro" },
  { cat: "objeto_perdido", kind: "ajuda", team: "sac", prio: "normal", text: "perdi minha carteira" },
  { cat: "cadeira_de_rodas", kind: "ajuda", team: "seguranca", prio: "alta", text: "preciso de cadeira de rodas" },
  { cat: "banheiro", kind: "ajuda", team: "limpeza", prio: "normal", text: "banheiro sem papel" },
  { cat: "reclamacao", kind: "reclamacao", team: "sac", prio: "normal", text: "demora no atendimento da loja" },
  { cat: "reclamacao", kind: "reclamacao", team: "sac", prio: "normal", text: "ar-condicionado muito forte" },
  { cat: "outro", kind: "sugestao", team: "sac", prio: "normal", text: "sugestão: mais bancos na praça" },
];

const pick = <T,>(xs: T[], i: number) => xs[i % xs.length];
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
const MIN = 60_000;
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const rid = (i: number) => `BO-D${B32[i % 32]}${B32[(i * 7) % 32]}${B32[(i * 13) % 32]}`;

const insert = db.prepare(
  `INSERT INTO tickets (id, session_id, point_id, category, text, status, assigned_to, priority, kind, team,
     created_at, updated_at, assumed_at, closed_at, resolution_code, resolution_note, rating)
   VALUES (@id, @session_id, @point_id, @category, @text, @status, @assigned_to, @priority, @kind, @team,
     @created_at, @updated_at, @assumed_at, @closed_at, @resolution_code, @resolution_note, @rating)`,
);

const session = createSession("entrada-principal");
const STAFF = ["Marcos", "Ana", "Paula"];
let made = 0;

for (let i = 0; i < 18; i++) {
  const sm = pick(SAMPLES, i);
  // Concentra no ponto 0 e 2 para o painel mostrar "onde melhorar".
  const point = i % 3 === 0 ? POINTS[0] : i % 3 === 1 ? POINTS[2] : pick(POINTS, i);
  const created = (30 + i * 20) * MIN;
  const open = i < 3; // 3 abertos
  const refused = i === 5 || i === 11;
  const assumeAfter = (1 + (i % 5)) * MIN;
  const closeAfter = assumeAfter + (4 + (i % 7)) * MIN;
  const id = rid(i);
  const base = {
    id, session_id: session.id, point_id: point, category: sm.cat, text: `[demo] ${sm.text}`,
    priority: sm.prio, kind: sm.kind, team: sm.team, created_at: iso(created),
    assumed_at: null as string | null, closed_at: null as string | null, assigned_to: null as string | null,
    status: "novo", updated_at: iso(created), resolution_code: null as string | null,
    resolution_note: null as string | null, rating: null as number | null,
  };
  if (!open) {
    base.status = "concluido";
    base.assigned_to = pick(STAFF, i);
    base.assumed_at = iso(created - assumeAfter);
    base.closed_at = iso(created - closeAfter);
    base.updated_at = base.closed_at;
    base.resolution_code = refused ? "improcedente" : "resolvido";
    base.resolution_note = refused ? "Fora da responsabilidade do shopping" : "Resolvido pela equipe";
    base.rating = refused ? null : 3 + (i % 3);
  }
  try {
    insert.run(base);
    logEvent(id, "visitante", "criado");
    if (!open) logEvent(id, base.assigned_to!, "concluido", base.resolution_code);
    made++;
  } catch { /* id já existe: seed repetido */ }
}
console.log(`✓ ${made} chamado(s) de demo criados (use --clear para remover)`);

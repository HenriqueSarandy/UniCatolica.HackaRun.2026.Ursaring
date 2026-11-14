# TechSpecs do MVP — CapiBot (Capim Dourado Shopping)

Quatro TechSpecs para quatro devs trabalharem **em paralelo**. Cada dev é dono de um conjunto de pastas e conversa com os outros apenas pelos **contratos** deste documento.

| # | TechSpec | Dono de | Resumo |
|---|----------|---------|--------|
| 1 | [01-frontend-chat.md](01-frontend-chat.md) | `src/app/(chat)`, `src/components/chat`, `src/lib/client` | Web app mobile-first, conversa, voz, acessibilidade, QR |
| 2 | [02-backend-orquestrador-ia.md](02-backend-orquestrador-ia.md) | `src/server/db`, `src/server/orchestrator`, `src/server/ai`, `src/app/api/session`, `src/app/api/chat` | Sessões, regras dos 4 botões, Gemini, SQLite base |
| 3 | [03-mapas-rotas-base.md](03-mapas-rotas-base.md) | `data/`, `public/maps`, `src/server/maps`, `src/components/map`, `src/app/api/stores`, `src/app/api/route` | `base-shopping.json`, SVG, rotas douradas, MapView |
| 4 | [04-chamados-painel-faq.md](04-chamados-painel-faq.md) | `src/server/tickets`, `src/app/api/tickets`, `src/app/api/panel`, `src/app/painel`, `src/app/faq` | Chamados de B.O., uploads, painel da equipe, FAQ |

## Stack (fixa para todos)

Next.js (App Router) + TypeScript + React, Route Handlers, SQLite via `better-sqlite3`, Gemini API, Web Speech API. Um único projeto Next.js na raiz do repositório, Node 20+, `pnpm` ou `npm` (decidir no kickoff, uma só vez).

## Estrutura de pastas e propriedade

```
/data/base-shopping.json            -> Dev 3
/public/maps/*.svg                  -> Dev 3
/public/stickers/*                  -> Dev 1
/uploads/                           -> Dev 4 (gitignored)
/src/app/(chat)/                    -> Dev 1
/src/app/painel/  /src/app/faq/     -> Dev 4
/src/app/api/session, chat          -> Dev 2
/src/app/api/stores, route          -> Dev 3
/src/app/api/tickets, panel, uploads-> Dev 4
/src/components/chat/               -> Dev 1
/src/components/map/                -> Dev 3
/src/server/db/                     -> Dev 2 (cliente + runner de migrações)
/src/server/orchestrator, ai/       -> Dev 2
/src/server/maps/                   -> Dev 3
/src/server/tickets/                -> Dev 4
/src/types/contracts.ts             -> compartilhado (ver abaixo)
```

Regra: **ninguém edita pasta de outro dev**. Precisa de mudança? Abra conversa e altere o contrato primeiro.

## Contratos compartilhados

Arquivo `src/types/contracts.ts` (criado pelo Dev 2 no **primeiro commit**, em até 30 min; mudanças só via PR avisado no grupo).

```ts
export type PointId = string;            // ex.: "entrada-principal" (vem de ?p=)
export type QuickReplyId = "banheiros" | "alimentacao" | "lojas" | "servicos";

export interface QuickReply { id: string; label: string; }

export interface MapPayload {            // produzido pelo Dev 3, renderizado por <MapView/>
  floor: number;
  mapSvgUrl: string;                     // ex.: "/maps/piso-1.svg"
  viewBox: string;                       // ex.: "0 0 1200 800"
  routePath: string;                     // atributo "d" de um <path> SVG
  origin: { x: number; y: number; label: string };
  destination: { x: number; y: number; label: string };
  altText: string;                       // descrição para leitor de tela
  steps: string[];                       // "Vai reto", "Vira à esquerda"...
}

export interface BotMessage {
  id: string;
  role: "bot";
  text: string;                          // texto exibido
  speakText?: string;                    // texto para o botão Ouvir (sem emojis); default = text
  sticker?: "padrao" | "inteligente" | "seguranca" | "feliz";
  quickReplies?: QuickReply[];
  map?: MapPayload;
  suggestInput?: "loja" | "bo";          // dica de UI: autocompletar de lojas / abrir painel de B.O.
}

export interface SessionResponse { sessionId: string; point: { id: PointId; name: string }; }

export interface ChatRequest {
  sessionId: string;
  message?: string;                      // texto livre
  quickReplyId?: string;                 // clique em botão
  storeId?: string;                      // loja escolhida no autocompletar
}
export interface ChatResponse { messages: BotMessage[]; }

export interface StoreSummary { id: string; name: string; floor: number; category: string; }

export type TicketStatus = "novo" | "assumido" | "concluido";
export type TicketCategory = "carro" | "objeto_perdido" | "cadeira_de_rodas" | "banheiro" | "falar_com_pessoa" | "outro";
export interface TicketCreated { ticketId: string; status: TicketStatus; etaMinutes: number; }
export interface TicketPublic { id: string; status: TicketStatus; assignedTo?: string; updatedAt: string; }
```

### Endpoints

| Método e rota | Dono | Entrada | Saída |
|---|---|---|---|
| `POST /api/session` | Dev 2 | `{ pointId }` | `SessionResponse` |
| `POST /api/chat` | Dev 2 | `ChatRequest` | `ChatResponse` |
| `GET /api/stores?q=` | Dev 3 | query | `StoreSummary[]` (máx. 8) |
| `GET /api/route?from=&to=` | Dev 3 | ids de ponto/loja | `MapPayload` ou 404 |
| `POST /api/tickets` | Dev 4 | multipart: `sessionId`, `category?`, `text?`, `transcript?`, `photo?` | `TicketCreated` |
| `GET /api/tickets/:id` | Dev 4 | — | `TicketPublic` |
| `POST /api/panel/login` | Dev 4 | `{ password }` | cookie httpOnly |
| `GET /api/panel/tickets` | Dev 4 | cookie | lista completa |
| `PATCH /api/panel/tickets/:id` | Dev 4 | `{ action: "assumir"\|"concluir", staffName }` | ticket atualizado |
| `GET /api/uploads/:file` | Dev 4 | cookie | arquivo (só equipe) |

### Interfaces internas (chamadas entre módulos do servidor)

Cada dono entrega **stub funcional** desses módulos na primeira hora, para ninguém ficar bloqueado.

```ts
// Dev 3 — src/server/maps/service.ts
export function loadKnowledgeBase(): KnowledgeBase;             // lê data/base-shopping.json (cache em memória)
export function searchStores(q: string, limit?: number): StoreSummary[];
export function getRoute(fromId: string, toId: string): MapPayload | null;
export function nearestAmenity(fromPointId: string, type: "banheiro_fraldario" | "praca_alimentacao"): { id: string; name: string } | null;
export function getPointName(pointId: string): string | null;

// Dev 4 — src/server/tickets/service.ts
export function createTicket(input: {...}): TicketCreated;       // usado por POST /api/tickets
export function countOpenTickets(): number;                      // opcional, para o orquestrador

// Dev 2 — src/server/db/index.ts
export const db: import("better-sqlite3").Database;
export function runMigrations(): void;                           // executa src/server/db/migrations/*.sql em ordem
```

### Banco de dados

Um arquivo `data/capibot.sqlite` (gitignored). Dev 2 cria o runner; **cada dev adiciona sua migração** em `src/server/db/migrations/NNN_nome.sql` (Dev 2: `001_sessions.sql`; Dev 4: `002_tickets.sql`). Sem conflitos, pois cada tabela tem um dono.

### IDs e convenções

- IDs de pontos/lojas em *kebab-case* ASCII: `entrada-principal`, `loja-pernambucanas`, `banheiro-sul`.
- Pontos de QR (`?p=`) são nós do grafo em `base-shopping.json` (Dev 3 define a lista; Dev 1 usa só para testes).
- Datas em ISO 8601 UTC. Textos para o usuário em pt-BR.
- Variáveis de ambiente (`.env.local`, template em `.env.example`, criado por Dev 2): `GEMINI_API_KEY`, `PANEL_PASSWORD`, `SESSION_SECRET`.

## Ordem de integração sugerida

1. **Hora 0–1:** Dev 2 publica `contracts.ts`, projeto Next.js base, DB runner. Todos fazem stubs com dados fixos.
2. **Hora 1–6:** desenvolvimento isolado, cada um testando com `curl`/mocks.
3. **Hora 6–8:** integração fim a fim (QR → botão → mapa; B.O. → painel).
4. **Resto:** polimento, testes de acessibilidade, deploy e roteiro da demo.

## Fora do escopo do MVP

Dijkstra (rotas pré-desenhadas bastam), NFC, múltiplos idiomas, autenticação de usuário final, notificação push para a equipe, SSE/WebSocket (usa polling).

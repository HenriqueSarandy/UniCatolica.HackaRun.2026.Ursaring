# TechSpec 04 — Chamados de B.O., Painel da Equipe e FAQ (Dev 4)

**Objetivo:** permitir que o visitante abra um chamado (texto, transcrição de voz, foto) e que a equipe do shopping o veja, assuma e conclua em um painel web; mais uma página FAQ acessível sem conversa. Também gera o material do QR (totens) para a demo.

**Contratos:** ver [README.md](README.md). Este dev **expõe** `POST /api/tickets`, `GET /api/tickets/:id`, `/api/panel/*`, `/api/uploads/:file`, as páginas `/painel` e `/faq`, e `createTicket()`. **Consome** `getPointName()` e `loadKnowledgeBase()` (Dev 3) e a tabela `sessions` / `db` (Dev 2).

## 1. Escopo

Dentro: tabela de chamados, upload de fotos, API pública (visitante) e privada (equipe), autenticação por senha, painel com polling, FAQ, gerador de QR Codes.
Fora: UI do chat (Dev 1), lógica de conversa (Dev 2).

## 2. Banco de dados

`src/server/db/migrations/002_tickets.sql`:

```sql
CREATE TABLE tickets (
  id            TEXT PRIMARY KEY,                 -- ex.: "BO-7K3F" (curto, legível)
  session_id    TEXT NOT NULL,                    -- referência lógica a sessions.id
  point_id      TEXT NOT NULL,                    -- local de origem (QR)
  category      TEXT NOT NULL DEFAULT 'outro',    -- TicketCategory
  text          TEXT,                             -- digitado
  transcript    TEXT,                             -- fala transcrita
  photo_file    TEXT,                             -- nome do arquivo em uploads/
  status        TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','assumido','concluido')),
  assigned_to   TEXT,
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','alta')),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  assumed_at    TEXT,
  closed_at     TEXT
);
CREATE INDEX idx_tickets_status ON tickets(status, created_at);
```

Não usar `FOREIGN KEY` para `sessions` para evitar acoplamento de migração; validar a sessão por consulta.

## 3. Serviço (`src/server/tickets/`)

```
service.ts      createTicket, getPublicTicket, listTickets, assumeTicket, closeTicket
categorize.ts   categoria + prioridade a partir do texto
uploads.ts      salvar/validar imagens
auth.ts         senha do painel + cookie assinado
```

### `createTicket`
- Entrada validada com zod: `sessionId` (deve existir em `sessions`; pega `point_id` de lá), `category?`, `text?`, `transcript?`, `photo?: File`. **Pelo menos um** entre `text`, `transcript`, `photo` ou `category = "falar_com_pessoa"`.
- Limites: texto/transcrição ≤ 1000 caracteres; foto ≤ 5 MB.
- `categorize.ts`: se a categoria não veio, inferir por palavras-chave (`carro|estacionamento` → `carro`; `perdi|esqueci|achei` → `objeto_perdido`; `cadeira de rodas` → `cadeira_de_rodas`; `papel|sujo|banheiro` → `banheiro`; senão `outro`). **Prioridade alta** se contiver `socorro|emergência|passando mal|desmaiou|criança perdida|fogo|roubo` ou categoria `cadeira_de_rodas`.
- Gera `id` curto: `BO-` + 4 caracteres base32 aleatórios (retry em colisão).
- Retorna `TicketCreated`: `etaMinutes` fixo de **3** no MVP (3 para prioridade alta, 5 para normal) — configurável em constante.
- Rate limit: máx. 5 chamados por sessão por hora (`429`) para evitar spam na demo.

### Uploads (`uploads.ts`)
- Aceitar apenas `image/jpeg`, `image/png`, `image/webp`; **verificar assinatura (magic bytes)**, não só o `Content-Type`.
- Nome do arquivo gerado no servidor (`<ticketId>-<random>.jpg`); nunca usar o nome enviado.
- Salvar em `uploads/` (criar se não existir). Opcional: reencodar/redimensionar com `sharp` se estiver disponível; se não, salvar como veio (o cliente já redimensiona).
- Leitura somente via `GET /api/uploads/:file`, **exige cookie da equipe**; validar que `:file` casa com `^[A-Za-z0-9._-]+$` (evitar *path traversal*).

## 4. API

### Visitante (sem login; protegido pela sessão)
- `POST /api/tickets` — `multipart/form-data` (`sessionId`, `category?`, `text?`, `transcript?`, `photo?`). `201 TicketCreated`. Erros: `400` validação, `404` sessão inexistente, `413` foto grande, `415` tipo inválido, `429` limite.
- `GET /api/tickets/:id?sessionId=` — retorna `TicketPublic` (`id`, `status`, `assignedTo`, `updatedAt`). Só devolve se `sessionId` for o da criação (senão `404`). Usado pelo polling do chat (5 s). Não expor texto, foto nem local.

### Equipe (cookie obrigatório)
- `POST /api/panel/login` `{ password }` — compara com `PANEL_PASSWORD` em tempo constante (`crypto.timingSafeEqual`). Sucesso: cookie `capibot_staff` (httpOnly, `SameSite=Lax`, `Secure` em produção, 12 h) com token HMAC (`SESSION_SECRET`). Falha: `401`; atraso fixo de 500 ms; máx. 10 tentativas/min por IP.
- `POST /api/panel/logout`.
- `GET /api/panel/tickets?status=novo,assumido` — lista ordenada: prioridade alta primeiro, depois mais antigos. Cada item: dados completos + `pointName` (via `getPointName`) + `photoUrl` (`/api/uploads/...`) + `ageSeconds`.
- `PATCH /api/panel/tickets/:id` — `{ action: "assumir" | "concluir", staffName }`. Regras: `assumir` só de `novo` (se já assumido por outro: `409` com quem assumiu); `concluir` só de `assumido` ou `novo`. Atualiza `assigned_to`, timestamps e `updated_at`.
- Middleware `requireStaff(req)` compartilhado por todas as rotas `/api/panel/*` e `/api/uploads/*`.

## 5. Painel da equipe (`/painel`)

Rotas: `src/app/painel/page.tsx` (login se não autenticado), componentes em `src/app/painel/_components/`. Layout pensado para **tablet/desktop** (a equipe usa), funcional também no celular.

- **Login:** campo de senha + nome da pessoa (guardado em `localStorage`, usado como `staffName`).
- **Lista de chamados** em colunas ou abas: *Novos*, *Em atendimento*, *Concluídos (hoje)*. Cartão mostra: id, tempo desde a abertura ("há 2 min", atualizado a cada 30 s no cliente), **local de origem** em destaque, categoria, texto/transcrição, miniatura da foto (clique amplia), prioridade (selo "ALTA" com texto, não só cor), responsável.
- **Ações:** botões **Assumir** e **Concluir** (≥ 48 px); confirmação inline em "Concluir"; mensagem de erro caso outro tenha assumido (409) e atualização imediata da lista.
- **Atualização:** polling `GET /api/panel/tickets` a cada **4 s** (`setTimeout` encadeado, pausa quando a aba está oculta). Ao chegar chamado novo: som curto opcional (toggle, desligado por padrão, exige gesto do usuário para liberar áudio) e título da aba `(2) CapiBot — Painel`; destaque visual temporário **sem animação contínua**.
- **Estados:** vazio ("Nenhum chamado no momento 🎉"), erro de rede (faixa "Sem conexão — tentando de novo").
- Visual coerente com o app (creme/dourado), `noindex` (`metadata.robots`), acessível por teclado.

## 6. FAQ web (`/faq`)

- Página estática/SSR simples em `src/app/faq/page.tsx`, lendo `faq`, `horario`, `estacionamento`, `wifi` e `eventos` de `loadKnowledgeBase()` (Dev 3). Se o stub ainda não existir, usar um JSON local temporário.
- Perguntas em `<details><summary>` (acessível, sem JS), agrupadas por tema, com busca simples opcional (filtro cliente).
- Mesmos tokens visuais do chat (importar `globals.css` do Dev 1; até lá, copiar as variáveis).
- Rodapé com link "Conversar com o CapiBot" (`/`) e botão "Falar com uma pessoa" (link para `/?p=...` com abertura direta do fluxo, ou simplesmente `/`).
- `lang="pt-BR"`, títulos hierárquicos (`h1`, `h2`), contraste e fonte 20px.

## 7. QR Codes para a demo

- Script `scripts/gen-qr.ts` (dep. `qrcode`): para cada ponto com `qr: true` do `base-shopping.json` gera `docs/qr/<id>.png` e uma folha `docs/qr/totens.html` (A4, 1 por ponto, com a frase "Perdido? Escaneie e chame o CapiBot!", nome do local e o QR grande) pronta para imprimir.
- URL base vem de `BASE_URL` (env) — `https://<app>.onrender.com/?p=<id>`.
- Este script depende só dos IDs do Dev 3; no começo usar 3 IDs fixos.

## 8. Segurança

- Painel e uploads **nunca** públicos. Sem listagem de diretório.
- Cookie assinado (HMAC-SHA256) com expiração; comparação em tempo constante.
- Escapar todo texto do usuário ao renderizar (React já faz; **não** usar `dangerouslySetInnerHTML`).
- Fotos podem conter dados pessoais: aviso no `IncidentPanel` (Dev 1) e retenção — script `scripts/purge-uploads.ts` apaga fotos de chamados concluídos há > 24 h (rodar manualmente na demo; citar na apresentação como boa prática de LGPD).
- Sem `PANEL_PASSWORD` configurada, o painel recusa login (não usar senha padrão).

## 9. Testes

- Unitários: `categorize`, validação de magic bytes, expiração do cookie, transições de status (incluindo 409).
- Smoke com `curl`: criar sessão (Dev 2) → `POST /api/tickets` com e sem foto → login → listar → assumir → `GET /api/tickets/:id` mostra `assumido`.
- Manual: abrir o painel em um tablet/segunda aba, criar chamado pelo celular e cronometrar; meta **< 6 s** entre envio e aparição.

## 10. Plano de entrega

| Etapa | Entrega |
|---|---|
| 1 (hora 0–1) | Migração `002_tickets.sql`, `POST /api/tickets` stub (sem foto), `GET /api/tickets/:id` — destrava o Dev 1 |
| 2 | Upload de foto + validações + categorização |
| 3 | Auth + `/api/panel/*` + `uploads` protegido |
| 4 | Painel (lista, ações, polling) |
| 5 | FAQ + gerador de QR |
| 6 | Rate limits, purge, testes, polimento visual |

## 11. Definição de pronto

Pelo celular, com foto, o chamado aparece no painel em < 6 s com local, texto, foto e horário; "Assumir" com o nome "Marcos" faz o chat do visitante exibir "Marcos, da equipe de atendimento, já está a caminho."; "Concluir" encerra o chamado; `/faq` funciona sem JavaScript; os QRs impressos abrem o chat no ponto correto.

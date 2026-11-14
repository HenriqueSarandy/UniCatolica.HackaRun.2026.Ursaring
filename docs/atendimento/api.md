# API

## Rotas

| Rota | Uso |
|---|---|
| `POST /api/session` `{ pointId }` | Cria a sessão |
| `POST /api/chat` `{ sessionId, message?, quickReplyId?, storeId? }` | Conversa |
| `GET /api/stores?q=` | Autocompletar de lojas |
| `GET /api/route?from=&to=` | Rota entre dois pontos |
| `POST /api/tickets` | Cria chamado (multipart, abaixo) |
| `GET /api/tickets/:id?sessionId=` | Status para o visitante |
| `POST /api/tickets/:id/feedback` `{ sessionId, resolved, rating?, text? }` | Confirma, reabre (`resolved=false`) ou avalia |
| `GET /api/panel/tickets?status=` | Lista da equipe |
| `PATCH /api/panel/tickets/:id` | Ações da equipe (abaixo) |
| `GET /api/panel/metrics?days=` | Indicadores |
| `GET /api/uploads/:file` | Foto do chamado |

`/api/panel/*` e `/api/uploads/*` **não têm autenticação**. Não existe mais login nem logout.

### `POST /api/tickets`

Campos: `sessionId` (obrigatório), `category`, `kind`, `text`, `transcript`, `contact`, `photo`. Pelo menos um entre texto, transcrição ou foto (ou categoria `falar_com_pessoa`).

| Limite | Valor |
|---|---|
| Texto ou transcrição | 1000 caracteres |
| Foto | 5 MB (jpeg, png, webp) |
| Chamados por sessão | 5 por hora (`429`) |
| Mensagens no chat | 20 por minuto por sessão (`429`) |

### `PATCH /api/panel/tickets/:id`

`{ action, staffName, ... }`

| `action` | Campos extras |
|---|---|
| `assumir` | |
| `concluir` | `resolutionCode?`, `note?` |
| `recusar` | `reason` (mín. 3) |
| `nota` | `note` |
| `escalar` | |
| `transferir` | `team` |

Erros: `400` validação, `404` inexistente, `409` já assumido ou concluído.

## Tipos (`src/types/contracts.ts`)

| Tipo | Valores |
|---|---|
| `TicketStatus` | `novo`, `assumido`, `concluido` |
| `TicketCategory` | `carro`, `objeto_perdido`, `cadeira_de_rodas`, `banheiro`, `falar_com_pessoa`, `reclamacao`, `outro` |
| `TicketKind` | `ajuda`, `reclamacao`, `sugestao` |
| `TicketTeam` | `seguranca`, `sac`, `manutencao`, `limpeza` |
| `ResolutionCode` | `resolvido`, `encaminhado`, `nao_localizado`, `improcedente` |

`TicketPublic`: `id`, `status`, `assignedTo?`, `updatedAt`, `kind?`, `resolutionNote?`, `resolutionCode?`, `rating?`, `canReopen?`. Nunca inclui contato nem notas internas.

`BotMessage.ticketId`: chamado criado nesta resposta; o chat passa a acompanhá-lo.

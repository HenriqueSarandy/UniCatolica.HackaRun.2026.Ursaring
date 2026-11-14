# Dados

## Banco (`data/capibot.sqlite`)

Migrações em `src/server/db/migrations/`, aplicadas sozinhas na primeira conexão.

| Migração | Conteúdo |
|---|---|
| `001_sessions.sql` | `sessions`, `chat_log` |
| `002_tickets.sql` | `tickets` |
| `003_atendimento.sql` | Novos campos em `tickets` e a tabela `ticket_events` |

Campos adicionados em `tickets` pela 003:

| Campo | Valores |
|---|---|
| `kind` | `ajuda`, `reclamacao`, `sugestao` |
| `team` | `seguranca`, `sac`, `manutencao`, `limpeza` |
| `contact` | Identificação do visitante |
| `resolution_code`, `resolution_note` | Como foi resolvido e a mensagem ao visitante |
| `escalated_at`, `reopened_count` | Escalonamento e reaberturas |
| `rating`, `feedback_text` | Avaliação do visitante |

`ticket_events` guarda a linha do tempo: `criado`, `assumido`, `nota`, `escalado`, `transferido`, `concluido`, `reaberto`, `avaliado`.

## Categorização (`src/server/tickets/categorize.ts`)

Por palavras-chave no texto:

| Resultado | Regra |
|---|---|
| Prioridade `alta` | Emergência (socorro, passando mal, fogo, roubo…) ou cadeira de rodas |
| `kind = reclamacao` | Reclamação, péssimo, demora, mau atendimento |
| Setor Segurança | Carro, cadeira de rodas ou prioridade alta |
| Setor Limpeza | Banheiro |
| Setor SAC | O restante |

## Base do shopping (`data/base-shopping.json`)

Lojas, pontos, banheiros, praça, SAC, eventos, FAQ e `orientacoes` (carro, objeto perdido, cadeira de rodas, banheiro, emergência, reclamação). As orientações aparecem só no `/faq` ("O que fazer se…"; o chat não as usa e elas não vão para o Gemini). Validar: `npm run validate:base`.

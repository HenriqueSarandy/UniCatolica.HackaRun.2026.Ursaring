# PLAN — Front-end do Chat CapiBot (TechSpec 01 / Dev 1)

## Context
O repositório só tem README e `docs/techspecs/`; não há código nem projeto Next.js. O Dev 2 deve publicar `src/types/contracts.ts` e o scaffold Next.js na hora 0–1. O Dev 1 entrega o web app mobile-first do chat (conversa, botões rápidos, voz, B.O., acessibilidade). Os endpoints dos outros devs ainda não existem, então o desenvolvimento começa contra mocks (`NEXT_PUBLIC_USE_MOCKS=true`).

Dono de: `src/app/(chat)`, `src/components/chat`, `src/lib/client`, `public/stickers`. Ninguém edita pastas alheias. O Dev 1 consome `contracts.ts`, `<MapView/>` (Dev 3) e as APIs.

## Pré-requisito (Etapa 0)
- Se o scaffold do Dev 2 ainda não estiver na `main`, fazer pull. Se não estiver, criar localmente um stub temporário de `contracts.ts` copiado do README dos techspecs, sem commitar, para destravar. Substituir pelo oficial depois.
- Confirmar o gerenciador (npm/pnpm) decidido no kickoff.
- Adicionar `.env.local` com `NEXT_PUBLIC_USE_MOCKS=true`.

## Etapas (seguem a seção 8 da spec)

### Etapa 1 — Layout, tokens, temas, A+, lista com mocks
- `src/app/globals.css`: tokens `--bg --fg --btn --btn-fg --font-size-base`, `[data-theme=contrast|dark]`, `:focus-visible` com contorno de 3px, alvos ≥48px, raios ≥16px, `100dvh`, `safe-area-inset-bottom`, `prefers-reduced-motion`, coluna `max-width: 640px`.
- `src/app/(chat)/layout.tsx`: Atkinson Hyperlegible via `next/font/google`, `<html lang="pt-BR">`, viewport.
- `src/lib/client/prefs.ts`: tamanho da fonte (20→24→28) e tema em `localStorage`, tudo com try/catch. Aplica `data-theme` e `--font-size-base` no `<html>`.
- `A11yToolbar.tsx`: botão A+ (cicla), alto contraste, escuro. Usar `aria-pressed` e rótulos explícitos.
- `MessageList.tsx` (`role="log"`, `aria-live="polite"`), `BotBubble`, `UserBubble`, `Sticker` (`<img alt>`), SVGs em `public/stickers/capibot-{padrao,inteligente,seguranca,feliz}.svg` (placeholders simples e acessíveis).
- `src/lib/client/mock.ts` + flag em `api.ts`. Cobrir: saudação com 4 quick replies, resposta com `map`, `suggestInput:"loja"`, `suggestInput:"bo"`.
- `ChatScreen.tsx` com estado local (`messages`, `loading`).

### Etapa 2 — Sessão + chat real + quick replies
- `api.ts`: `createSession`, `sendChat` (timeout de 15 s via `AbortController`), `searchStores`, `createTicket`, `getTicket`. Tipos vindos de `@/types/contracts`. Erros tipados (`ApiError` com status).
- `page.tsx`: `useSearchParams` (envolver em `<Suspense>`). Sem `p` → `entrada-principal` + aviso "Local não identificado". Persistir `sessionId` em `sessionStorage`.
- Abertura: bolha local "Oi Capibot! Tô aqui na {point.name}.", depois `/api/chat` sem mensagem. Texto "CapiBot está pensando…" com `aria-live`, sem spinner.
- `QuickReplies.tsx`: clique mostra o rótulo como bolha do usuário e envia `quickReplyId`. Botões de mensagens antigas ficam `aria-disabled`.
- Erros: bolha de falha + "Tentar de novo"; 404/410 recria a sessão com o mesmo `p` e repete a requisição.
- Gestão de foco: depois da resposta, foco no primeiro quick reply ou no composer, sem roubar foco durante digitação (checar `document.activeElement` antes).
- `TalkToPersonBar.tsx`: faixa fixa acima do rodapé (a lógica de envio entra na Etapa 5).

### Etapa 3 — Voz
- `voice.ts`: hook `useSpeechRecognition` (detecção de `SpeechRecognition || webkitSpeechRecognition`, `lang=pt-BR`, `interimResults`, tratamento de permissão negada) e `speak(text)`/`cancel()`.
- `Composer.tsx`: input + mic + enviar. Sem suporte → esconde o mic e mostra a dica "Seu navegador não suporta voz; use o campo de texto".
- `ListenButton.tsx`: usa `speakText ?? text`, o segundo clique cancela, nunca fala sozinho. Cancelar a fala ao desmontar.

### Etapa 4 — Autocompletar + MapView
- `StoreAutocomplete.tsx` (`role="combobox"` + `listbox`, `aria-activedescendant`, setas/Enter/Esc, debounce de 250 ms, `GET /api/stores?q=`). Escolha → `sendChat({storeId})`. Texto livre também envia `message`. Ativa quando `suggestInput==="loja"`.
- Mapa: importar `@/components/map/MapView` do Dev 3 quando existir. Antes disso, `MapPlaceholder.tsx` local com `altText` e `steps` em `<ol>`. Trocar por um único ponto de import, para a troca ser de uma linha.

### Etapa 5 — IncidentPanel + tickets + polling
- `IncidentPanel.tsx` (quando `suggestInput==="bo"`): mic com transcrição editável (envia só o texto), dois `<input type=file>` (câmera com `capture="environment"` e galeria), prévia `alt="Foto anexada"`, `textarea`.
- Redimensionar foto no cliente via canvas (máx. 1280px, JPEG 0.8, limite de 5 MB) num helper em `src/lib/client/image.ts`.
- Envio: `FormData` com `sessionId, text, transcript, photo` → `POST /api/tickets`. Bolha de confirmação com `etaMinutes`.
- `TicketStatusBanner.tsx`: polling de 5 s em `GET /api/tickets/:id`. Para em `concluido` ou aba oculta (`visibilitychange`) e retoma ao voltar. Ao virar `assumido`, nova bolha "{assignedTo}, da equipe de atendimento, já está a caminho."
- `TalkToPersonBar`: `POST /api/tickets` com `category:"falar_com_pessoa"`, texto "Pedido de atendimento humano", mesmo fluxo de confirmação.

### Etapa 6 — Auditoria e ajustes
- Lighthouse A11y ≥ 95. Contraste ≥ 7:1 nos 3 temas (conferir tokens). Zoom 200% sem scroll horizontal. Navegação por teclado. Emojis em `<span aria-hidden>`. TalkBack: QR → banheiro → ouvir; B.O. → texto.
- Desligar mocks quando as APIs reais estiverem de pé. Passada de console limpo.

## Arquivos a criar
`src/app/(chat)/{page,layout}.tsx`, `src/app/globals.css`, `src/components/chat/*` (ChatScreen, MessageList, BotBubble, UserBubble, Sticker, QuickReplies, Composer, StoreAutocomplete, IncidentPanel, TicketStatusBanner, ListenButton, A11yToolbar, TalkToPersonBar, MapPlaceholder), `src/lib/client/{api,voice,prefs,mock,image}.ts`, `public/stickers/*.svg`.

## Decisões e riscos
- O áudio bruto não é enviado no MVP, só a transcrição (conforme a spec).
- A rota `/` fica em `(chat)`, que não gera segmento de URL. Não deve haver outra `page.tsx` na raiz.
- Web Speech no Chrome Android exige HTTPS (ou localhost) para o microfone. O demo precisa de HTTPS.
- Risco de integração: `contracts.ts` ou `MapView` chegarem atrasados. Mitigação: mocks + placeholder isolado em um único ponto.

## Verificação
1. `npm run dev` com mocks: abrir `/?p=entrada-principal` e percorrer banheiros, praça, loja e B.O. sem erro de console.
2. Testar sem `p`, API fora do ar (bolha de erro + retry), sessão 404 (recria) e timeout.
3. Teclado puro e leitor de tela: ordem de foco, `role=log`, listbox.
4. Lighthouse Accessibility ≥ 95 e checagem de contraste nos 3 temas.
5. Chrome Android real, via HTTPS: voz de entrada e saída, câmera, TalkBack.
6. Repetir com as APIs reais (`NEXT_PUBLIC_USE_MOCKS=false`) na integração das horas 6–8.

## Observações de processo
- Sem commit e sem push (instrução do usuário).
- Ao sair do modo de plano, copiar este plano para `.workspace/techspecs/frontend-chat/PLAN.md`.

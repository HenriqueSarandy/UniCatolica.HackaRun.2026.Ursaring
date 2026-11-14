# TechSpec 01 — Front-end do Chat (Dev 1)

**Objetivo:** entregar o web app mobile-first do CapiBot: a conversa, os botões rápidos, voz (entrada e saída), o fluxo de B.O. (texto, foto, áudio) e toda a acessibilidade descrita no README.

**Contratos:** ver [README.md](README.md) (`contracts.ts`, endpoints). Este dev **consome** `/api/session`, `/api/chat`, `/api/stores`, `/api/tickets`, `/api/tickets/:id` e o componente `<MapView/>` do Dev 3.

## 1. Escopo

Dentro:
- Rota `/` (`src/app/(chat)/page.tsx`) lendo `?p=<pointId>`.
- Tema visual (cores, fonte Atkinson Hyperlegible, A+, alto contraste, modo escuro).
- Lista de mensagens, balões, figurinhas do mascote, botões de resposta rápida.
- Rodapé fixo: campo de texto, microfone, botão de câmera (no modo B.O.).
- Botão 🔊 Ouvir em toda resposta do bot.
- Autocompletar de lojas (Tela 4).
- Fluxo de B.O. (Tela 3): áudio→texto, foto, texto, confirmação e atualização de status.
- Faixa fixa "Falar com uma pessoa".

Fora: lógica de resposta (Dev 2), desenho do mapa (Dev 3), painel e FAQ (Dev 4).

## 2. Estrutura de arquivos

```
src/app/(chat)/page.tsx            # carrega sessão e renderiza <ChatScreen/>
src/app/(chat)/layout.tsx          # fonte, tema, <html lang="pt-BR">
src/app/globals.css                # tokens CSS (variáveis)
src/components/chat/
  ChatScreen.tsx                   # estado da conversa
  MessageList.tsx                  # role="log" aria-live="polite"
  BotBubble.tsx  UserBubble.tsx
  Sticker.tsx                      # <img alt="..."> do mascote
  QuickReplies.tsx
  Composer.tsx                     # input + mic + enviar
  StoreAutocomplete.tsx            # role="combobox"
  IncidentPanel.tsx                # mic, câmera/galeria, texto -> /api/tickets
  TicketStatusBanner.tsx           # polling de /api/tickets/:id
  ListenButton.tsx                 # speechSynthesis
  A11yToolbar.tsx                  # A+, alto contraste, escuro
  TalkToPersonBar.tsx              # faixa fixa
src/lib/client/
  api.ts                           # fetch tipado (usa contracts.ts)
  voice.ts                         # useSpeechRecognition, speak()
  prefs.ts                         # localStorage: tamanho da fonte, tema
public/stickers/                   # capibot-padrao.svg, -inteligente, -seguranca, -feliz
```

## 3. Design (tokens)

```css
:root {
  --bg: #FFF8E1; --fg: #2B1D00; --btn: #F2B705; --btn-fg: #000;
  --font-size-base: 20px;
}
[data-theme="contrast"] { --bg:#000; --fg:#FFE600; --btn:#FFE600; --btn-fg:#000; }
[data-theme="dark"]     { --bg:#1E1608; --fg:#FFF3C4; --btn:#F2B705; --btn-fg:#000; }
```

- Fonte: `Atkinson Hyperlegible` via `next/font/google`. Tamanho base 20px; botão **A+** cicla 20→24→28px (via `--font-size-base`), persistido em `localStorage` (com try/catch).
- Cantos arredondados (≥16px), espaçamento generoso, **sem animações automáticas** (respeitar `prefers-reduced-motion`; nada de animar sem ação do usuário).
- Coluna única, `max-width: 640px`, centralizada em telas largas. Use `100dvh` e `padding-bottom: env(safe-area-inset-bottom)`.
- Alvos de toque ≥ 48×48px.

## 4. Fluxos

### 4.1 Abertura (Tela 1)
1. Ler `p` de `useSearchParams()`. Sem `p` → usar `"entrada-principal"` e mostrar aviso discreto "Local não identificado".
2. `POST /api/session { pointId }` → guarda `sessionId` em `sessionStorage`.
3. Mostrar imediatamente a mensagem do usuário: "Oi Capibot! Tô aqui na {point.name}." (gerada localmente, sem enviar à API).
4. `POST /api/chat { sessionId }` (sem mensagem = saudação) → renderiza `ChatResponse.messages`.
5. Estado de carregamento: texto "CapiBot está pensando…" (`aria-live`), sem spinner animado.

### 4.2 Botões rápidos
`QuickReplies` renderiza `message.quickReplies`. Clique → mostra o rótulo como mensagem do usuário e chama `/api/chat { sessionId, quickReplyId }`. Após responder, os botões da mensagem antiga ficam desabilitados (`aria-disabled`), os da última permanecem ativos.

### 4.3 Mapa (Telas 2 e 4)
Se `message.map` existir: `<MapView map={message.map} />` (import de `@/components/map/MapView`, Dev 3). Até o Dev 3 entregar, usar um placeholder local com `altText` e `steps` em lista.

### 4.4 Lojas (Tela 4)
Se `message.suggestInput === "loja"`, o `Composer` vira `StoreAutocomplete`: debounce de 250 ms, `GET /api/stores?q=`, lista com `role="listbox"`, navegação por setas. Ao escolher: `/api/chat { sessionId, storeId }`. Texto livre sem escolha também é permitido (`message`).

### 4.5 B.O. e serviços (Tela 3)
Se `suggestInput === "bo"`, abrir `IncidentPanel` com:
- **Microfone:** `SpeechRecognition` (`lang = "pt-BR"`, `interimResults = true`); mostra o texto transcrito num campo editável para a pessoa conferir antes de enviar. O áudio bruto **não** é enviado no MVP (só a transcrição) — decisão para reduzir complexidade; se sobrar tempo, gravar com `MediaRecorder` e enviar como `audio`.
- **Foto:** `<input type="file" accept="image/*" capture="environment">` mais um segundo input sem `capture` para galeria. Pré-visualização com `alt="Foto anexada"`; limitar a 5 MB (redimensionar no cliente com `canvas` para máx. 1280px, JPEG 0.8).
- **Texto:** `textarea`.
- Enviar: `POST /api/tickets` (`FormData`: `sessionId`, `text`, `transcript`, `photo`). Resposta `TicketCreated` → bolha do bot: "Tudo certo! Já avisei a equipe mais próxima. Eles chegam aí em {etaMinutes} minutinhos!".
- Depois, `TicketStatusBanner` faz polling de `GET /api/tickets/:id` a cada 5 s (para quando `concluido` ou aba oculta). Ao virar `assumido`: nova bolha "{assignedTo}, da equipe de atendimento, já está a caminho."

### 4.6 "Falar com uma pessoa"
Faixa fixa acima do rodapé em todas as telas. Clique → `POST /api/tickets` com `category: "falar_com_pessoa"` e texto "Pedido de atendimento humano", e mesmo fluxo de confirmação do 4.5.

### 4.7 Voz
- Entrada: `useSpeechRecognition` com feature detection (`window.SpeechRecognition || window.webkitSpeechRecognition`). Se ausente ou permissão negada, esconder o microfone e mostrar dica "Seu navegador não suporta voz; use o campo de texto".
- Saída: `ListenButton` chama `speechSynthesis.speak` com `lang = "pt-BR"` usando `speakText ?? text`. Segundo clique cancela. Nunca falar automaticamente.

## 5. Acessibilidade (critérios de aceite)

- [ ] Lighthouse Accessibility ≥ 95 em `/` com conversa aberta.
- [ ] Toda imagem (figurinha, mapa, foto) com `alt`/descrição; emojis envoltos em `<span aria-hidden="true">` e o sentido já está no texto.
- [ ] `MessageList` com `role="log"` e `aria-live="polite"`; foco vai ao campo/botão apropriado após resposta, sem roubar foco durante digitação.
- [ ] Navegação completa por teclado, ordem de foco lógica, `:focus-visible` com contorno de 3px.
- [ ] Zoom 200% sem scroll horizontal nem perda de função.
- [ ] Contraste ≥ 7:1 nos três temas (verificar com ferramenta).
- [ ] Testado com TalkBack no Android: abrir QR → banheiro → ouvir; abrir B.O. → enviar texto.
- [ ] Todos os caminhos principais funcionam só com toques (botões rápidos + autocompletar).

## 6. Tratamento de erros

- API fora do ar: bolha "Não consegui falar com o servidor agora. Tente de novo ou toque em *Falar com uma pessoa*." com botão "Tentar de novo".
- Timeout de 15 s em `/api/chat`.
- Sessão inválida (404/410): recriar sessão automaticamente com o mesmo `p`.

## 7. Mocks para desenvolvimento isolado

Criar `src/lib/client/mock.ts` com respostas fixas e uma flag `NEXT_PUBLIC_USE_MOCKS=true` que faz `api.ts` retornar mocks. Desligar quando as APIs reais estiverem de pé. Incluir ao menos: saudação com 4 quick replies, resposta com `map` fixo, resposta `suggestInput: "loja"`, `suggestInput: "bo"`.

## 8. Plano de entrega

| Etapa | Entrega |
|---|---|
| 1 | Layout, tokens, temas, A+, lista de mensagens com mocks |
| 2 | Sessão + chat real + quick replies |
| 3 | Voz (entrada/saída) + Ouvir |
| 4 | Autocompletar + MapView integrado |
| 5 | IncidentPanel + tickets + polling |
| 6 | Auditoria Lighthouse/TalkBack e ajustes |

## 9. Definição de pronto

QR `/?p=entrada-principal` abre no Chrome Android, completa os 4 fluxos (banheiro, praça, loja, B.O.), ouvindo respostas, sem erro de console e com Lighthouse A11y ≥ 95.

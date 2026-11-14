# TechSpec 03 — Mapas, Rotas e Base de Conhecimento (Dev 3)

**Objetivo:** entregar a base de dados do shopping (`base-shopping.json`), a planta em SVG, as rotas douradas "origem → destino", a busca de lojas e o componente visual `<MapView/>` acessível.

**Contratos:** ver [README.md](README.md). Este dev **expõe** `GET /api/stores`, `GET /api/route`, o módulo `src/server/maps/service.ts` e o componente `src/components/map/MapView.tsx`. É **consumido** pelos Devs 1 e 2.

## 1. Escopo

Dentro: dados do shopping, SVG(s) da planta, grafo/rotas, funções de serviço, endpoints, `MapView` (zoom, descrição textual).
Fora: lógica de conversa (Dev 2), chat UI (Dev 1).

## 2. Base de conhecimento — `data/base-shopping.json`

Como não há planta oficial, o Dev 3 **inventa um shopping fictício coerente** (ou usa a planta real se a organização fornecer). Ela é também o contexto do Gemini, então deve ser **enxuta (< 15 KB)** e em pt-BR.

```jsonc
{
  "shopping": {
    "nome": "Capim Dourado Shopping",
    "horario": { "lojas": "10h às 22h (seg a sáb), 12h às 20h (dom)", "alimentacao": "11h às 23h", "cinema": "conforme programação" },
    "estacionamento": "Gratuito nas 2 primeiras horas. Entradas Norte e Sul.",
    "wifi": "Rede CapimDourado-Free, sem senha",
    "contato": "SAC no piso 1, perto da Entrada Principal"
  },
  "pontos": [                       // nós do grafo; inclui locais de QR
    { "id": "entrada-principal", "nome": "Entrada Principal", "piso": 1, "x": 600, "y": 740, "qr": true },
    { "id": "entrada-norte",     "nome": "Entrada Norte",     "piso": 1, "x": 600, "y": 60,  "qr": true },
    { "id": "cruzamento-central","nome": "Praça Central",     "piso": 1, "x": 600, "y": 400, "qr": false }
  ],
  "comodidades": [                  // tipos: banheiro_fraldario | praca_alimentacao | sac | caixa_eletronico | ...
    { "id": "banheiro-sul", "tipo": "banheiro_fraldario", "nome": "Banheiro com fraldário do corredor Sul", "piso": 1, "pontoId": "banheiro-sul" }
  ],
  "lojas": [
    { "id": "loja-pernambucanas", "nome": "Pernambucanas", "categoria": "moda", "piso": 2,
      "pontoId": "loja-pernambucanas", "referencia": "ao lado da escada rolante", "sinonimos": ["pernambuco"] }
  ],
  "eventos": [ { "nome": "Feira do Capim", "quando": "sáb e dom, 14h", "onde": "Praça Central" } ],
  "faq": [ { "pergunta": "Posso levar pet?", "resposta": "Pets de pequeno porte, no colo ou em transporte." } ]
}
```

Requisitos mínimos de conteúdo para a demo:
- **≥ 6 pontos de QR** (entradas, frente de duas âncoras como C&A e Renner, praça de alimentação, cinema).
- **≥ 3 banheiros/fraldários**, **≥ 2 pontos da praça de alimentação**.
- **≥ 20 lojas** (incluindo Pernambucanas, C&A, Renner, Cinema) em pelo menos 2 pisos.
- **FAQ com ≥ 10 perguntas** (também alimenta a página `/faq` do Dev 4 — Dev 4 lê o mesmo JSON via `loadKnowledgeBase()`).
- Todo `pontoId` referenciado deve existir em `pontos`. Escrever **script de validação** `scripts/validate-base.ts` (zod) que falha se houver referência quebrada; rodar no CI/pre-commit.

## 3. Planta SVG

Arquivos `public/maps/piso-1.svg`, `public/maps/piso-2.svg`.

- `viewBox="0 0 1200 800"` iguais em todos os pisos. Coordenadas dos `pontos` seguem esse sistema.
- Fundo creme `#FFF8E1`; lojas como `<rect>` com contorno marrom `#5A3A00` (2px) e `<text>` com o nome (fonte ≥ 14 unidades); sem preenchimento forte (contraste).
- Cada loja agrupada: `<g id="loja-pernambucanas"><title>Pernambucanas</title>…</g>`.
- O SVG **não contém** a rota; a rota é uma camada desenhada pelo `MapView` por cima (`<path d=routePath>`), assim a mesma planta serve para todas as rotas.
- Ferramenta: desenhar em Figma/Inkscape/Excalidraw → exportar SVG; otimizar com SVGO. Tamanho < 150 KB por arquivo.
- Se a planta tiver 2 pisos e a rota cruzar pisos (ex.: entrada piso 1 → loja piso 2), o MVP **mostra o piso do destino** com a rota a partir da escada/escada rolante daquele piso, e o texto dos `steps` inclui "Suba a escada rolante até o piso 2" como primeiro passo. Isso evita rota multi-piso.

## 4. Rotas

### 4.1 Estratégia do MVP (v1): rotas desenhadas à mão
Arquivo `data/rotas.json`:

```jsonc
{
  "rotas": [
    {
      "de": "entrada-principal", "para": "banheiro-sul", "piso": 1,
      "path": "M600 740 L600 560 L300 560 L300 420",
      "passos": ["Vai reto até o cruzamento", "Vira na primeira à esquerda", "O banheiro fica no fim do corredor"]
    }
  ]
}
```

- Cobertura obrigatória: **cada ponto de QR → cada banheiro/fraldário, praça de alimentação** (~ 6×5 = 30 rotas) e **cada ponto de QR → ~6 lojas de demo** (Pernambucanas, C&A, Renner, Cinema, +2). O resto cai em "rota não desenhada".
- Para reduzir trabalho manual (opcional, recomendado): gerar os `path` por script a partir de um **grafo de corredores** — v1.5: `data/grafo.json` com arestas entre `pontos` e uma função de Dijkstra em `src/server/maps/graph.ts` que gera `M x y L …`. Os `passos` seriam derivados dos ângulos de curva (esquerda/direita/reto) e da distância. Se o tempo permitir, a função `getRoute` tenta rota manual primeiro, depois o grafo.
- Rotas são **direcionais** (de→para). O script de validação avisa quando faltam rotas esperadas.

### 4.2 Montagem do `MapPayload`
`getRoute(fromId, toId)`:
1. Resolver `toId`: se for loja/comodidade, usa o `pontoId`.
2. Buscar rota manual; senão grafo (se existir); senão `null`.
3. Montar `MapPayload` (ver contrato): `mapSvgUrl = /maps/piso-{piso}.svg`, `origin`/`destination` com coordenadas dos pontos, `steps` = `passos`, `altText` gerado: *"Mapa do piso 2. Você está na Entrada Principal. O destino, Pernambucanas, fica no fim do corredor à esquerda. Siga a linha dourada: vai reto até o cruzamento; vira na primeira à esquerda."* (concatenação de origem + destino + referência + passos).

## 5. Serviço (`src/server/maps/service.ts`)

Implementar exatamente as assinaturas do README. Detalhes:

- `loadKnowledgeBase()` — lê o JSON uma vez (cache em módulo), validado com zod. Exporta o tipo `KnowledgeBase`.
- `searchStores(q, limit = 8)` — normalizar (minúsculas, sem acentos, trim); pontuação: começa-com = 3, contém = 2, sinônimo = 2, distância de Levenshtein ≤ 2 = 1. Ordenar por pontuação e depois nome. `q` vazia → `[]`.
- `nearestAmenity(fromPointId, tipo)` — entre as comodidades do tipo, escolhe a de menor distância; no v1 usa distância euclidiana entre coordenadas dos pontos (piso diferente soma penalidade de 300). Só considera comodidades que tenham rota existente.
- `getPointName(id)` — procura em `pontos`.

**Primeira hora:** entregar stubs usando 3 pontos e 3 lojas fictícias para destravar Dev 1 e Dev 2.

## 6. Endpoints

- `GET /api/stores?q=perna` → `StoreSummary[]` (máx. 8). Cabeçalho `Cache-Control: no-store`. Debounce fica no cliente.
- `GET /api/route?from=entrada-principal&to=loja-pernambucanas` → `MapPayload`; `404 { error: "rota_nao_encontrada" }`; `400` se parâmetros ausentes.
- Validar parâmetros com zod; ignorar valores que não existam na base.

## 7. Componente `<MapView />` (`src/components/map/MapView.tsx`)

Props: `{ map: MapPayload }`. Client component.

- Renderiza `<svg viewBox>` com `<image href={mapSvgUrl}>` como fundo (ou `<object>`/inline; escolher o que permitir texto selecionável e boa performance) e sobre ele:
  - `<path d={routePath}>` com `stroke: #F2B705`, `stroke-width: 10`, `stroke-dasharray: 24 14`, `stroke-linecap: round`, `fill: none`, contorno interno marrom mais fino para contraste. **Sem animação** (`prefers-reduced-motion` e requisito do README).
  - Marcador de origem ("Você está aqui") e de destino (círculo/pin com rótulo de texto).
- **Zoom:** botões **+** e **−** (≥ 48×48 px, `aria-label="Aproximar mapa"` / `"Afastar mapa"`) e botão "Restaurar". Pinça de dois dedos via *Pointer Events* (`touch-action: none` apenas dentro do mapa; arrastar para mover). Limites 1×–4×. Sem dependências pesadas; pode usar `react-zoom-pan-pinch` (versão fixa) para economizar tempo.
- **Acessibilidade:** `<figure role="group" aria-labelledby>`; SVG com `role="img"` e `aria-label={altText}`; abaixo, `<details open>` "Descrição do caminho" com `<ol>` dos `steps` e `altText` visível em texto. Os botões de zoom funcionam por teclado.
- Alto contraste: ler as variáveis CSS do tema (`--fg`, `--btn`) para cores do traço e do texto.
- Altura máxima: `min(60vh, 420px)`.
- Estado de erro: se o SVG não carregar, mostrar apenas a descrição em texto.

## 8. Testes

- `scripts/validate-base.ts`: integridade de IDs, rotas esperadas, `viewBox`.
- Unitários: `searchStores` ("perna" → Pernambucanas; "c e a" → C&A; "xyz" → []), `nearestAmenity`, `getRoute` (existente / inexistente).
- Visual: abrir `/dev/map-preview` (página temporária **dentro de `src/components/map/` ou `src/app/dev-map/`**, removida antes da entrega) para ver todas as rotas e conferir que o traço cai nos corredores.

## 9. Plano de entrega

| Etapa | Entrega |
|---|---|
| 1 (hora 0–1) | JSON mínimo + `service.ts` stub + `MapView` placeholder com texto |
| 2 | Planta SVG piso 1 e 2 + pontos com coordenadas finais |
| 3 | `MapView` completo (traço, zoom, descrição) |
| 4 | Rotas manuais obrigatórias + validação |
| 5 | Endpoints, busca fuzzy, `nearestAmenity` |
| 6 | (Opcional) grafo + Dijkstra |

## 10. Definição de pronto

Para cada um dos 6 QRs, os botões Banheiros e Praça de Alimentação retornam um `MapPayload` válido; a busca por "Pernambucanas", "C&A", "Renner" e "Cinema" devolve rota; o `MapView` mostra a linha dourada tracejada sobre a planta, dá zoom por dedos e botões, e o texto alternativo está completo.

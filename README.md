# CapiBot — Capim Dourado Shopping

Aplicação inicial de atendimento inclusivo: interface mobile-first, servidor Flask, SQLite e painel protegido para a equipe.

## Requisitos

- Python 3.10 ou superior
- Uma chave da API Gemini para habilitar perguntas livres (opcional durante o desenvolvimento)

## Instalação no Windows

No PowerShell, na pasta do projeto:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edite `.env` e defina `SECRET_KEY` e `ADMIN_PASSWORD`. Para gerar uma chave de sessão aleatória:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Para habilitar perguntas livres, informe também `GEMINI_API_KEY`. A aplicação não envia perguntas à API sem essa configuração.

## Executar

```powershell
.\.venv\Scripts\python.exe app.py
```

Abra `http://127.0.0.1:5000`. O painel da equipe fica em `http://127.0.0.1:5000/admin`.

O SQLite é criado em `instance/capibot.sqlite3`, e imagens enviadas ficam em `uploads/`. O limite por envio é 5 MB; são aceitos JPG, PNG e WEBP. Os uploads não são servidos publicamente: só usuários autenticados no painel podem visualizá-los.

## Dados que precisam ser confirmados

- `base-shopping.json`: lojas, horários, serviços, eventos e pontos reais do mapa. O conteúdo inicial do elevador e atendimento inclusivo foi herdado do protótipo e deve ser confirmado com o shopping.
- `routes.json`: rotas direcionais entre pontos; começa vazio até a planta e os trajetos serem fornecidos.
- `static/mapa-shopping.svg`: imagem provisória; substituir pela planta oficial em SVG.

As quatro perguntas rápidas usam regras locais em Python. Perguntas livres dependem da API Gemini e recebem o conteúdo de `base-shopping.json` como contexto. O microfone usa Web Speech API do navegador; o campo de texto permanece disponível como alternativa. A síntese de voz também é feita no navegador.

## Testes

```powershell
python -m pytest
```

Os testes usam um banco SQLite temporário e não alteram os dados locais.

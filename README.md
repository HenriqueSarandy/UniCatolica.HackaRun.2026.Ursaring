# UniCatolica.HackaRun.2026.Ursaring
MonoRepo com todas as soluções necessárias para o Hackathon

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
07. Atendimento e experiência de serviços
Contexto: Os visitantes podem precisar de orientações, informações, registrar reclamações ou resolver situações inesperadas durante sua permanência no shopping.

Problemática: A experiência de atendimento pode ser prejudicada quando as necessidades dos visitantes não são compreendidas ou resolvidas com agilidade.

Objetivo: Melhorar a experiência dos visitantes no acesso aos serviços e no relacionamento com o shopping.

Capim Dourado Shopping — Atendimento e Experiência de Serviços

Entrega de Planejamento Técnico Prazo: sexta-feira, 13/11, até 12h Foco: planejamento e definição técnica inicial (não é o MVP final)
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Proposta e estrutura inicial das telas

Ideia geral

Um ChatBot chamado Auri que após o usuário entrar, vai aparecer uma tela que terão as perguntas mais frequentes dos usuários, terá como fazer perguntas diversas e dentro do treinamento da IA ele responderá perfeitamente sobre o shopping, e auxiliara na experiência dos usuários e no funcionamento dinâmico do shopping

Visual
•	Cores: fundo creme claro (#FFF8E1), texto marrom-escuro quase preto (#2B1D00) e botões dourados (#F2B705) com texto preto. É uma referência ao capim dourado, e o contraste passa de 10:1. Há um botão para alto contraste (preto e amarelo) e outro para modo escuro.
•	Letra: Atkinson Hyperlegible, uma fonte criada para pessoas com baixa visão. Tamanho base de 20 px, com botão “A+” visível.
•	Formas: cantos arredondados, bastante espaço entre os elementos, nenhuma animação automática.

Como é cada parte da tela
O Ponto de Partida: O Mundo Físico (Antes da Tela 1) A mágica começa no próprio shopping. Em todas as portas de entrada e em pontos estratégicos de algumas lojas âncoras (como na frente da C&A ou da Renner), vai ter um totem (creme e dourado) com um QR Code grande dizendo: "Perdido? Escaneie e chame a Auri!".

Tela 1: O "Oi" Telepático (A pessoa escaneia o QR Code) Quando a pessoa aponta a câmera para o QR Code da Entrada Principal, o WhatsApp abre com a mensagem pré-digitada: "Oi Auri! Tô aqui na Entrada Principal". Quando ela envia, aparece uma figurinha da Auri (a capivara mascote nos tons marrom e amarelo) com cara de inteligente, e a mensagem: "Oie! ✨ Que bom te ver! Como você me chamou pelo QR Code da Entrada, eu já sei exataaaamente onde você está no mapa. O que você quer fazer agora?" Logo embaixo, aparecem as opções rápidas: [Banheiros e Fraldário], [Praça de Alimentação], [Lojas e Cinema] e [Resolver um B.O. / Serviços].

Tela 2: A Rota Dourada (Quando ela aperta "Banheiros e Fraldário") Vamos supor que bateu o desespero e a pessoa apertou o botão do banheiro. Aparece na hora a resposta da Auri: "Sua bexiga agradece! 🚽 O banheiro com fraldário mais pertinho de você é o do corredor Sul." Junto com o texto, aparece uma imagem estática de um mapa. O fundo do mapa é creme, as lojinhas em volta têm o contorno marrom, e o caminho de onde ela está até o banheiro é uma linha tracejada grossa e amarela quase dourada. A Auri complementa: "É só seguir essa linha dourada no mapa! Vai reto e vira na primeira esquerda."

Tela 3: Quando o cliente precisa resolver um BO (Serviços e Problemas) Se na primeira tela a pessoa tivesse apertado [Resolver um B.O. / Serviços], o fundo de atendimento entra em ação (focando no objetivo de melhorar a experiência). Aparece a Auri com um chapeuzinho de segurança (marrom) e a mensagem: "Deu ruim? Pode falar comigo! Se você não achou seu carro, perdeu um objeto, precisa de cadeira de rodas ou viu um banheiro sem papel, manda um áudio ou uma foto aqui agora que eu aciono a equipe do shopping na velocidade da luz! ⚡". Se a pessoa mandar a foto, aparece: "Tudo certo! Já mandei um aviso pro rádio da equipe mais próxima. Eles chegam aí em 3 minutinhos!".

Tela 4: A Navegação Livre (Achando Lojas) Se a pessoa apertou [Lojas e Cinema], aparece: "Opa, bora gastar! 🛍️ Digita o nome da loja que você tá procurando ou manda um áudio pra mim!". Quando ela digita, por exemplo, "Pernambucanas", o sistema pergunta qual é a loja mais próxima da pessoa, ela só calcula a rota e manda: "Achei! Fica no piso 2. Segue esse mapinha com a rota dourada aqui embaixo!".

Linguagem de programação escolhida

TypeScript + Node.js, com esse esqueleto:

whatsapp-web.js ou Twilio Sandbox
API do Gemini/GPT + um arquivo base-shopping.json (lojas, horários, serviços)
React ou HTML puro 
SQLite → guardar os B.O.s e a posição inicial de cada pessoa (o segredo da "telepatia" da Tela 1: você salva de qual QR ela veio)

Arquitetura proposta:

🌍 Totem/QR (wa.me pré-preenchido)
        ↓
📱 WhatsApp ──webhook──→ ⚙️ BACKEND AURI (Node + TS)
                          ├─ Sessões      ← guarda DE QUAL QR a pessoa veio
                          ├─ Orquestrador ← máquina de estados das 4 telas
                          ├─ NLU + RAG    ← base do shopping + LLM (Gemini/GPT)
                          ├─ Mídia        ← áudio → Whisper → texto
                          ├─ Tickets B.O. ← aciona a equipe
                          └─ Mapas SVG    ← rota dourada
                                ↓
                          🗄️ SQLite   🖥️ FAQ web (acessível) + Painel da equipe

Plataformas e tecnologias adotadas

GitHub
VSCode
Fedora
Gemini
Claude

Descrição de como a prática sorteada será incorporada à solução

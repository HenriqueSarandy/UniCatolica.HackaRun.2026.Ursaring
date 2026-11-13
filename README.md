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

CapiBot, a assistente do Capim Dourado Shopping · Web app mobile-first

Ideia geral

CapiBot é uma chatbot que vive em um web app mobile-first: a pessoa não instala nada e não precisa de conta. Basta apontar a câmera do 
celular para um QR Code no shopping, e o navegador abre direto a conversa com o CapiBot. Na tela de entrada aparecem as perguntas mais 
frequentes dos visitantes, e também é possível fazer perguntas livres, por texto ou por voz. Com uma base de conhecimento própria do 
shopping (lojas, horários, serviços, eventos e mapa), o CapiBot responde sobre o Capim Dourado, melhora a experiência de quem está ali e 
ajuda no funcionamento dinâmico do shopping, avisando a equipe quando alguém precisa de ajuda.

Visual

• Cores: fundo creme claro (#FFF8E1), texto marrom-escuro quase preto (#2B1D00) e botões dourados (#F2B705) com texto preto. É uma 
referência ao capim dourado, e o contraste passa de 10:1. Há um botão para alto contraste (preto e amarelo) e outro para modo escuro.
• Letra: Atkinson Hyperlegible, uma fonte criada para pessoas com baixa visão. Tamanho base de 20 px, com botão “A+” visível.
• Formas: cantos arredondados, bastante espaço entre os elementos, nenhuma animação automática.
• Mascote: CapiBot, uma capivara em tons de marrom e amarelo, que aparece em figurinhas e ilustrações ao lado das mensagens.
• Formato: tela de conversa em coluna única, pensada primeiro para o celular. Em telas maiores, a mesma conversa fica centralizada, 
sem mudar o jeito de usar.

Como é cada parte da tela

O ponto de partida: o mundo físico (antes da Tela 1)
A mágica começa no próprio shopping. Em todas as portas de entrada e em pontos estratégicos de algumas lojas âncoras (como na frente 
da C&A ou da Renner), há um totem creme e dourado com um QR Code grande e a frase: “Perdido? Escaneie e chame o CapiBot!”
Cada QR Code é único e leva um endereço que identifica o ponto onde ele está, por exemplo CapiBot.exemplo.com.br/?p=entrada-principal. É 
assim que o web app sabe onde a pessoa está, sem pedir GPS, que não funciona bem dentro de shoppings.

Tela 1: o “Oi” telepático (a pessoa escaneia o QR Code)
Quando a pessoa aponta a câmera para o QR Code da Entrada Principal, o navegador abre o web app, sem login e sem baixar nada. A 
conversa já começa com a primeira mensagem da pessoa enviada automaticamente: “Oi Capibot! Tô aqui na Entrada Principal.”
Em seguida aparece uma figurinha do CapiBot, com cara de inteligente, e a mensagem: “Oie! ✨ Que bom te ver! Como você me chamou pelo QR 
Code da Entrada, eu já sei exataaaamente onde você está no mapa. O que você quer fazer agora?”
Logo embaixo aparecem as opções rápidas, em botões grandes: [Banheiros e Fraldário], [Praça de Alimentação], [Lojas e Cinema] e [Resolver um B.O. / Serviços]. No rodapé fixo ficam o campo “Escreva sua dúvida” e o botão de microfone.

Tela 2: a Rota Dourada (quando ela aperta “Banheiros e Fraldário”)
Suponha que bateu o desespero e a pessoa apertou o botão do banheiro. A resposta aparece na hora, como um balão do CapiBot: “Sua bexiga 
agradece! 🚽 O banheiro com fraldário mais pertinho de você é o do corredor Sul.”
Junto com o texto, o balão traz um mapa dentro da própria página. O fundo é creme, as lojinhas em volta têm contorno marrom e o 
caminho de onde a pessoa está até o banheiro é uma linha tracejada grossa, amarela quase dourada. O mapa pode ser ampliado com dois 
dedos ou com os botões + e −, e vem acompanhado de uma descrição em texto para quem usa leitor de tela. O CapiBot complementa: “É só 
seguir essa linha dourada no mapa! Vai reto e vira na primeira esquerda.” Um botão 🔊 Ouvir lê a resposta em voz alta.

Tela 3: quando o cliente precisa resolver um B.O. (serviços e problemas)
Se na primeira tela a pessoa tivesse apertado [Resolver um B.O. / Serviços], entra em ação o atendimento, com foco em melhorar a 
experiência. O CapiBot aparece com um chapeuzinho de segurança marrom e diz: “Deu ruim? Pode falar comigo! Se você não achou seu carro, 
perdeu um objeto, precisa de cadeira de rodas ou viu um banheiro sem papel, manda um áudio ou uma foto aqui agora que eu aciono a 
equipe do shopping na velocidade da luz! ⚡”
A pessoa tem três jeitos de pedir ajuda, todos dentro da própria página:
• Botão de microfone: grava o áudio direto pelo navegador, e o CapiBot mostra o texto transcrito para a pessoa conferir.
• Botão de câmera: abre a câmera do celular, ou a galeria, para anexar uma foto.
• Campo de texto: para quem prefere escrever.
Se a pessoa mandar a foto, aparece: “Tudo certo! Já mandei um aviso pro rádio da equipe mais próxima. Eles chegam aí em 3 
minutinhos!” O aviso chega ao painel da equipe, uma página web que a segurança e o SAC deixam aberta em tablets ou computadores, com 
o local de origem (o QR escaneado), a foto, o áudio e o horário. Quando alguém da equipe assume o chamado, o CapiBot atualiza a 
conversa: “Marcos, da equipe de atendimento, já está a caminho.”

Tela 4: a navegação livre (achando lojas)
Se a pessoa apertou [Lojas e Cinema], aparece: “Opa, bora gastar! 🛍️ Digita o nome da loja que você tá procurando ou manda um áudio 
pra mim!” Conforme a pessoa digita, o campo sugere nomes de lojas (autocompletar). Quando ela escolhe, por exemplo, “Pernambucanas”, 
o sistema usa o ponto de origem da pessoa (o QR que ela escaneou, ou a última localização informada), calcula a rota e responde: 
“Achei! Fica no piso 2. Segue esse mapinha com a rota dourada aqui embaixo!” O mapa aparece no mesmo formato da Tela 2.

Acessibilidade em todas as telas
• Todos os caminhos principais funcionam só com toques, sem digitar.
• Cada resposta tem o botão Ouvir, o microfone aceita voz e todo conteúdo em imagem (mapas, figurinhas) tem descrição em texto.
• Funciona com leitor de tela (TalkBack e VoiceOver), com navegação por teclado e com zoom de até 200%.
• Botões de no mínimo 48×48 px e uma faixa fixa “Falar com uma pessoa” em qualquer tela.
• Os emojis são decorativos e têm rótulo em texto, para não atrapalhar quem usa leitor de tela.

Linguagem de programação escolhida

Python no servidor e HTML, CSS e JavaScript na tela

• Interface (front-end): HTML para a estrutura da tela, CSS para as cores, os botões grandes e o layout mobile-first, e JavaScript básico só para mostrar as mensagens na conversa. A foto vem de um campo <input type="file" accept="image/*" capture>, que já abre a câmera do celular sem código extra.
• Servidor (back-end): Python com Flask, um framework pequeno em que cada tela é uma função. Ele recebe as mensagens, decide a resposta e salva os chamados.
• Banco de dados: SQLite, que já vem com o Python e é um único arquivo. Guarda as sessões, o ponto de origem de cada pessoa e os chamados de B.O. As fotos ficam numa pasta uploads/.
• Inteligência: os 4 botões respondem com regras simples em Python (if/else), sem IA, o que garante respostas certas e rápidas. As perguntas livres vão para a API do Gemini, junto com a base do shopping (base-shopping.json: lojas, horários, serviços, eventos e pontos do mapa), que o Python lê e envia como contexto.
• Voz: o microfone usa o reconhecimento de voz do próprio navegador (Web Speech API), que transforma a fala em texto, e o botão Ouvir usa a síntese de voz do navegador. Não tem custo nem instalação. Funciona melhor no Chrome, por isso o campo de texto sempre existe como alternativa.
• Mapas e rotas: a planta é um arquivo SVG (imagem vetorial). Na primeira versão, a rota dourada de cada par "origem → destino" é desenhada à mão e guardada em um arquivo JSON. Como evolução, o Python calcula o caminho com o algoritmo de Dijkstra.
• Painel da equipe: uma página HTML protegida por senha, que consulta o servidor a cada poucos segundos e mostra os chamados novos, com local, foto, texto e horário.
• Testes: testes manuais no celular e no modo celular do navegador, checagem de acessibilidade com o Lighthouse do Chrome e teste com leitor de tela (TalkBack no Android).

Arquitetura proposta

Fluxo de ponta a ponta:
1.  Totem com QR Code e NFC → endereço do web app com o ponto de origem (?p=entrada-principal).
2.  Web app (celular da pessoa): páginas em HTML, CSS e JavaScript abertas no navegador, com conversa, microfone, câmera e mapas.
3.  Servidor do CapiBot (Python + Flask), com estes módulos:
    ◦ Sessões: guarda de qual QR a pessoa veio.
    ◦ Orquestrador: controla em qual das 4 telas a pessoa está e qual resposta dar.
    ◦ IA: Gemini + base do shopping, para perguntas livres.
    ◦ Chamados de B.O.: cria o chamado, guarda a foto e avisa a equipe.
    ◦ Rotas: escolhe o SVG com a rota dourada para o par origem e destino.
4.  SQLite + pasta uploads/: sessões, chamados e fotos.
5.  Painel da equipe (página HTML com senha): atualiza sozinha a cada poucos segundos, com os chamados novos, e permite marcar como "assumido" ou "concluído".
6.  FAQ web acessível: versão em página simples das perguntas frequentes, para quem não quiser conversar.
7.  Hospedagem: Render (plano gratuito) ou o notebook da equipe durante a apresentação.

Plataformas e tecnologias adotadas

• GitHub
• VSCode
• Fedora
• Gemini
• Claude
• Python 3, Flask e SQLite
• Lighthouse (Chrome)


# TechSpec 05 — Ciclo de atendimento (integração)

Fecha o desafio "07. Atendimento e experiência de serviços": o visitante é orientado (mapa), informado (botões, FAQ, IA), registra uma reclamação e acompanha a resolução; a equipe aceita ou recusa, conclui e mede a qualidade.

**A documentação do fluxo atual está em [docs/atendimento/](../atendimento/README.md)** e prevalece sobre as TechSpecs 01–04, que são o planejamento original.

| Quero saber… | Leia |
|---|---|
| Como o chat funciona | [fluxo-chat.md](../atendimento/fluxo-chat.md) |
| O que a equipe faz no painel | [painel.md](../atendimento/painel.md) |
| Rotas e tipos | [api.md](../atendimento/api.md) |
| Banco e categorização | [dados.md](../atendimento/dados.md) |
| Rodar, testar e limitações | [operacao.md](../atendimento/operacao.md) |

**Pronto quando:** pelo celular o visitante escolhe um tópico, vê o mapa **ou** registra uma reclamação (nome e texto) e recebe um protocolo; a equipe vê o chamado em menos de 6 s e aceita ou recusa (com motivo); o chat mostra o resultado; ao concluir, o visitante confirma "deu certo?" ou reabre.

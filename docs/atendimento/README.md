# Atendimento do CapiBot: visão geral

O visitante escaneia um QR, escolhe um assunto e vê o mapa **ou** registra uma reclamação. A equipe aceita ou recusa no painel e o chat avisa o resultado.

| Tela | Rota | Quem usa | Para quê |
|---|---|---|---|
| Chat | `/?p=<ponto>` | Visitante | Mapas, informações e reclamação |
| Reclamações e serviços | `/atendimento?p=<ponto>` | Visitante | Formulário com foto, voz e contato (fora do chat; só por URL ou pelo `/faq`) |
| Painel | `/painel` | Equipe | Aceitar, recusar, concluir, indicadores. **Sem senha** |
| FAQ | `/faq` | Visitante | Perguntas e orientações, sem JavaScript |

```
QR → 4 botões → "localização ou reclamação?"
                   ├─ localização → mapa com a rota → volta aos 4 botões
                   └─ reclamação → nome → texto → protocolo BO-XXXX
                                                     ↓
                  painel: aceitar / recusar / concluir  →  chat avisa  →  "Deu certo?" + nota
```

## Documentos

| Arquivo | Conteúdo |
|---|---|
| [fluxo-chat.md](fluxo-chat.md) | Passo a passo do chat, estados e ids dos botões |
| [painel.md](painel.md) | Ações da equipe, prazos (SLA) e indicadores |
| [api.md](api.md) | Rotas e tipos |
| [dados.md](dados.md) | Banco, categorização e base do shopping |
| [operacao.md](operacao.md) | Rodar, testar, variáveis, segurança e limitações |

As [TechSpecs 01–04](../techspecs/README.md) são o planejamento original; onde divergirem, vale esta pasta.

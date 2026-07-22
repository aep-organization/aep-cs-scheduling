# Setor de Relacionamento AEP — site estático

Página estática (HTML/CSS/JS puro, **sem framework e sem build**) usada pelo
Setor de Relacionamento da AEP para direcionar cada cliente ao CS (Customer
Success) responsável pelo seu atendimento, com um botão para agendar uma
videochamada.

O cliente recebe um link do tipo `https://seusite.com/?e-mail=cliente@empresa.com`.
Ao abrir, o site:

1. Lê o e-mail da query string (parâmetro `e-mail`, configurável).
2. Consulta um **webhook do n8n** (via `POST`, corpo `{ "email": "..." }`) para
   descobrir qual CS é responsável por aquele e-mail.
3. Renderiza o(s) card(s) do(s) responsável(is): avatar (foto ou iniciais),
   nome e um botão **"Agendar"** que abre o link de agendamento em uma nova aba.

Caso o webhook não encontre um responsável (ou o cliente acesse sem e-mail na
URL), o site mostra todos os CS disponíveis para agendamento. Em caso de erro
de rede, timeout ou falha HTTP, exibe um estado de erro com botão para tentar
novamente — a tela nunca fica em branco.

Enquanto o link de agendamento de um CS não vem do webhook, o site usa um mapa
de links **hardcoded** em `js/config.js` (`CALENDAR_LINKS`) como fallback,
casando pelo nome da pessoa.

Se a URL do webhook ainda não estiver configurada, o site roda em **modo
demonstração**, com dados de exemplo, para permitir validar o layout.

O **backend não faz parte deste projeto** — é o webhook do n8n (já existente).
Este repositório é apenas o front-end.

## Estrutura

```
agendamentoCs/
├── index.html
├── css/styles.css
├── js/config.js        # WEBHOOK_URL, EMAIL_PARAM e CALENDAR_LINKS
├── js/app.js
├── assets/logo-aep.avif                  # logo oficial AEP
├── assets/duas-mulheres-conversando.jpeg # foto de fundo
└── README.md
```

Sem `localStorage`, sem cookies, sem dependências externas.

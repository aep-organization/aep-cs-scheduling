# Setor de Relacionamento AEP — site estático

Página estática (HTML/CSS/JS puro, **sem framework e sem build**) que lê o e-mail
do cliente na URL, consulta um **webhook do n8n** e exibe o(s) CS responsável(is)
pelo atendimento, com botão para agendar.

O **backend não faz parte deste projeto** — ele é o webhook do n8n (já existente).
Este repositório é apenas o front-end, pronto para subir na Hostinger
(hospedagem compartilhada, pasta `public_html`).

```
agendamentoCs/
├── index.html
├── css/styles.css
├── js/config.js        # só WEBHOOK_URL e EMAIL_PARAM
├── js/app.js
├── assets/logo-aep.avif           # logo oficial AEP
├── assets/duas-mulheres-conversando.jpeg # foto de fundo
└── README.md
```

---

## 1) Deploy na Hostinger

O site é 100% estático — basta enviar os arquivos para a pasta pública.

**Opção A — Gerenciador de Arquivos (hPanel):**
1. Acesse o **hPanel** da Hostinger → **Gerenciador de Arquivos**.
2. Entre na pasta **`public_html`** do seu domínio.
3. Envie **o conteúdo** desta pasta (`index.html`, `css/`, `js/`, `assets/`) —
   **não** a pasta `agendamentoCs` em si. O `index.html` precisa ficar na raiz de
   `public_html` (ou de um subdiretório, se preferir servir em `/agendamento`).
4. Acesse o domínio no navegador para conferir.

**Opção B — FTP:**
1. Conecte via FTP (FileZilla) usando as credenciais do hPanel → **Contas FTP**.
2. Navegue até `public_html` e envie o conteúdo da pasta.

> Dica: para servir em um subcaminho (ex.: `https://seusite.com/agendamento/`),
> crie a subpasta dentro de `public_html` e envie os arquivos para lá.

---

## 2) Onde editar a URL do webhook

Edite **apenas** o arquivo [`js/config.js`](js/config.js):

```js
window.APP_CONFIG = {
  WEBHOOK_URL: 'COLE_A_URL_DO_N8N_AQUI', // ← cole aqui a URL do webhook do n8n
  EMAIL_PARAM: 'e-mail',                  // nome do parâmetro na query string
  CALENDAR_LINKS: {                       // links de agendamento por CS (ver seção 2.1)
    'Evelyn Celestino': 'https://calendly.com/evelyn-aep'
    // ...
  }
};
```

- **`WEBHOOK_URL`** — URL de produção do webhook do n8n (método POST).
- **`EMAIL_PARAM`** — nome do parâmetro que traz o e-mail na URL. Padrão: `e-mail`
  (com hífen). Exemplo de link enviado ao cliente:

  ```
  https://seusite.com/?e-mail=cliente@empresa.com
  ```

### Modo demonstração
Enquanto `WEBHOOK_URL` continuar como `COLE_A_URL_DO_N8N_AQUI`, o site roda em
**modo demonstração** com dados de exemplo (Evelyn, Luana, Agna, Christiam,
Gabriella), permitindo validar o layout antes de ligar o n8n. Assim que você
colar a URL real, o modo demonstração é desativado automaticamente.

### 2.1) Links de agendamento hardcoded (`CALENDAR_LINKS`)

Enquanto o webhook do n8n não retorna a URL de agendamento de cada CS, o site usa
o mapa `CALENDAR_LINKS` em `js/config.js`, casando pelo **nome** exatamente como
o webhook envia (ou como está em `DEMO`, no modo demonstração):

```js
CALENDAR_LINKS: {
  'Evelyn Celestino': 'https://calendly.com/evelyn-aep',
  'Luana': 'https://calendly.com/luana-aep'
}
```

Regra de prioridade: se o webhook já enviar um campo `url` para a pessoa, ele é
usado; `CALENDAR_LINKS` só entra como **fallback** quando `url` vier vazio/ausente.
Assim, dá para ligar o n8n aos poucos — pessoa por pessoa — sem quebrar nada nem
precisar mexer no código depois. Sem um link (nem do webhook, nem do mapa), o
botão "Agendar" aparece desabilitado.

---

## 3) Contrato JSON esperado do n8n

### Requisição (o site envia)
`POST` para `WEBHOOK_URL`, com header `Content-Type: application/json` e corpo:

```json
{ "email": "cliente@empresa.com" }
```

Timeout de **10 segundos** no lado do site.

### Resposta (o n8n deve retornar)

```json
{
  "status": "found",
  "responsaveis": [
    { "nome": "Evelyn Celestino", "foto": "https://.../evelyn.jpg", "url": "https://calendly.com/evelyn" }
  ]
}
```

| Campo                 | Tipo    | Descrição                                                        |
|-----------------------|---------|------------------------------------------------------------------|
| `status`              | string  | `"found"` ou `"not_found"`.                                       |
| `responsaveis`        | array   | Lista de responsáveis.                                            |
| `responsaveis[].nome` | string  | Nome exibido no card.                                             |
| `responsaveis[].foto` | string  | **Opcional.** URL da foto; se ausente, mostra as iniciais.       |
| `responsaveis[].url`  | string  | Link de agendamento (abre em nova aba). Sem `url`, botão fica desabilitado. |

### Comportamento por status
- **`found`** → mostra **apenas** os cards recebidos.
- **`not_found`** (ou quando **não há e-mail** na URL) → mostra o aviso
  *"Não foi possível encontrar o seu CS responsável."* com subtexto liberando o
  agendamento com qualquer um, e renderiza **todos** os `responsaveis` da lista.
- **Erro de rede / timeout / HTTP** → estado de erro com botão **"Tentar de novo"**.
  A tela nunca fica em branco.

---

## 4) CORS no webhook do n8n (importante)

Como o site (domínio da Hostinger) e o n8n estão em **origens diferentes**, o
navegador exige **CORS**. Habilite no webhook do n8n a resposta com os cabeçalhos:

```
Access-Control-Allow-Origin: https://seusite.com
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

- Troque `https://seusite.com` pelo domínio real da Hostinger (evite `*` em
  produção quando possível).
- O navegador pode enviar uma requisição **preflight `OPTIONS`** antes do `POST`;
  garanta que o n8n responda a ela com os mesmos cabeçalhos e status 200/204.
- No n8n, isso costuma ser configurado nas opções do nó **Webhook**
  (Response Headers) ou por um nó de resposta que define os headers acima.

> Sintoma típico de CORS ausente: o `POST` falha no navegador (aparece o estado
> de erro) mesmo com o webhook funcionando em testes via Postman/curl.

---

## 5) Personalização

- **Logo:** usa [`assets/logo-aep.avif`](assets/logo-aep.avif) (logo oficial).
  Para trocar, substitua o arquivo mantendo o nome (ou atualize `src`/`width`/
  `height` da tag `<img class="card__logo">` em `index.html`).
- **Fundo por imagem:** o fundo usa `assets/duas-mulheres-conversando.jpeg` com
  um overlay escuro em gradiente (mantém o contraste com o cartão branco). Para
  trocar a foto, substitua o arquivo mantendo o nome (ou atualize o caminho no
  seletor `body` em [`css/styles.css`](css/styles.css)). Para voltar ao gradiente
  puro (sem foto), comente a linha do `background` com `url(...)` e descomente a
  linha do gradiente logo abaixo.
- **Cores da marca:** definidas como variáveis no topo de `css/styles.css`
  (`--navy: #16375c`, `--teal: #15a3b5`, `--teal-hover: #0f8695`).

---

Sem `localStorage`, sem cookies, sem dependências externas.

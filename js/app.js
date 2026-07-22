/* ==========================================================================
   Setor de Relacionamento AEP — lógica do front-end
   Lê o e-mail da URL, chama o webhook do n8n e mostra o(s) CS responsável(is).
   Sem dependências externas, sem localStorage, sem cookies.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = window.APP_CONFIG || {};
  var WEBHOOK_URL = CONFIG.WEBHOOK_URL || '';
  var EMAIL_PARAM = CONFIG.EMAIL_PARAM || 'e-mail';
  var PLACEHOLDER_URL = 'COLE_A_URL_DO_N8N_AQUI';
  var TIMEOUT_MS = 10000;

  var content = document.getElementById('content');

  // Dados de exemplo usados no modo demonstração (enquanto o webhook não é ligado).
  // As URLs de agendamento vêm de CONFIG.CALENDAR_LINKS (ver resolveUrl).
  var DEMO = [
    { nome: 'Evelyn Celestino' },
    { nome: 'Luana' },
    { nome: 'Agna Luiza' },
    { nome: 'Christiam Santana' },
    { nome: 'Gabriella' },
    { nome: 'Mariany' }
  ];

  // ---------- Utilidades ----------------------------------------------------

  // URL do webhook para essa pessoa; se ausente, usa o link hardcoded em
  // config.js (CALENDAR_LINKS), casando pelo nome.
  function resolveUrl(pessoa) {
    if (pessoa.url) return pessoa.url;
    var links = CONFIG.CALENDAR_LINKS || {};
    return links[pessoa.nome] || '';
  }

  function getEmailFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var value = params.get(EMAIL_PARAM);
    return value ? value.trim() : '';
  }

  function isDemoMode() {
    return !WEBHOOK_URL || WEBHOOK_URL === PLACEHOLDER_URL;
  }

  function initials(nome) {
    if (!nome) return '?';
    var parts = nome.trim().split(/\s+/);
    var first = parts[0].charAt(0);
    var last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // ---------- Renderização --------------------------------------------------

  function renderLoading() {
    clear(content);
    var wrap = document.createElement('div');
    wrap.className = 'state-loading';
    var spin = document.createElement('div');
    spin.className = 'spinner';
    var msg = document.createElement('p');
    msg.textContent = 'Buscando o seu CS responsável...';
    wrap.appendChild(spin);
    wrap.appendChild(msg);
    content.appendChild(wrap);
  }

  function buildAvatar(pessoa) {
    if (pessoa.foto) {
      var img = document.createElement('img');
      img.className = 'person__avatar';
      img.src = pessoa.foto;
      img.alt = pessoa.nome || '';
      return img;
    }
    var div = document.createElement('div');
    div.className = 'person__avatar';
    div.setAttribute('aria-hidden', 'true');
    div.textContent = initials(pessoa.nome);
    return div;
  }

  function buildCard(pessoa) {
    var card = document.createElement('article');
    card.className = 'person';

    card.appendChild(buildAvatar(pessoa));

    var name = document.createElement('h2');
    name.className = 'person__name';
    name.textContent = pessoa.nome || 'Sem nome';
    card.appendChild(name);

    var url = resolveUrl(pessoa);
    if (url) {
      var link = document.createElement('a');
      link.className = 'btn';
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Agendar';
      card.appendChild(link);
    } else {
      var disabled = document.createElement('span');
      disabled.className = 'btn btn--disabled';
      disabled.setAttribute('aria-disabled', 'true');
      disabled.textContent = 'Agendar';
      card.appendChild(disabled);
    }

    return card;
  }

  function buildPeopleGrid(lista) {
    var grid = document.createElement('div');
    grid.className = 'people';
    lista.forEach(function (pessoa) {
      grid.appendChild(buildCard(pessoa));
    });
    return grid;
  }

  // status "found": só os cards recebidos.
  function renderFound(lista) {
    clear(content);
    content.appendChild(buildPeopleGrid(lista));
  }

  // status "not_found" (ou sem e-mail): todos os responsáveis.
  // Aviso "Não foi possível encontrar o seu CS responsável" desativado por
  // enquanto, a pedido do time, até a lógica de correspondência por e-mail
  // estar implementada no n8n. Reativar depois é só descomentar o bloco abaixo.
  function renderNotFound(lista) {
    clear(content);

    // var notice = document.createElement('div');
    // notice.className = 'notice';
    // var t = document.createElement('p');
    // t.className = 'notice__title';
    // t.textContent = 'Não foi possível encontrar o seu CS responsável.';
    // var s = document.createElement('p');
    // s.className = 'notice__text';
    // s.textContent = 'Sem problemas! Você pode agendar com qualquer um dos nossos responsáveis abaixo.';
    // notice.appendChild(t);
    // notice.appendChild(s);
    // content.appendChild(notice);

    if (lista && lista.length) {
      content.appendChild(buildPeopleGrid(lista));
    }
  }

  // Estado de erro com botão "Tentar de novo".
  function renderError() {
    clear(content);
    var wrap = document.createElement('div');
    wrap.className = 'state-error';

    var t = document.createElement('p');
    t.className = 'state-error__title';
    t.textContent = 'Ops! Algo deu errado.';

    var s = document.createElement('p');
    s.className = 'state-error__text';
    s.textContent = 'Não conseguimos carregar os responsáveis. Verifique sua conexão e tente novamente.';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = 'Tentar de novo';
    btn.addEventListener('click', run);

    wrap.appendChild(t);
    wrap.appendChild(s);
    wrap.appendChild(btn);
    content.appendChild(wrap);
  }

  // ---------- Rede ----------------------------------------------------------

  function fetchResponsaveis(email) {
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, TIMEOUT_MS);

    return fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email }),
      signal: controller.signal
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .finally(function () {
        clearTimeout(timer);
      });
  }

  // ---------- Fluxo principal ----------------------------------------------

  function run() {
    var email = getEmailFromUrl();

    // Modo demonstração: mostra o layout sem chamar o n8n.
    if (isDemoMode()) {
      if (email) {
        renderFound(DEMO.slice(0, 1));
      } else {
        renderNotFound(DEMO);
      }
      return;
    }

    // Sem e-mail na URL: já mostra a lista completa (comportamento not_found).
    if (!email) {
      renderLoading();
      fetchResponsaveis('')
        .then(function (data) {
          renderNotFound((data && data.responsaveis) || []);
        })
        .catch(function () {
          renderError();
        });
      return;
    }

    renderLoading();
    fetchResponsaveis(email)
      .then(function (data) {
        data = data || {};
        var lista = data.responsaveis || [];
        if (data.status === 'found') {
          renderFound(lista);
        } else {
          renderNotFound(lista);
        }
      })
      .catch(function () {
        renderError();
      });
  }

  run();
})();

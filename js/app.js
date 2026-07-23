/* ==========================================================================
   Setor de Relacionamento AEP — lógica do front-end
   Lê email/cpf da URL, chama /api/responsavel (proxy do webhook n8n) e mostra
   o owner designado (em destaque) e/ou a lista completa de owners ativos.
   Sem dependências externas, sem localStorage, sem cookies, sem logar PII.
   ========================================================================== */
(function () {
  'use strict';

  var TIMEOUT_MS = 8000;
  var GROUP_THRESHOLD = 8;

  var content = document.getElementById('content');

  // ---------- Utilidades ----------------------------------------------------

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

  // Agrupa por team preservando a ordem de primeira aparição. Owners sem
  // team caem no grupo "Outros".
  function groupByTeam(owners) {
    var order = [];
    var groups = {};
    owners.forEach(function (owner) {
      var key = owner.team || 'Outros';
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(owner);
    });
    return order.map(function (team) {
      return { team: team, owners: groups[team] };
    });
  }

  // ---------- Renderização --------------------------------------------------

  function renderLoading() {
    clear(content);
    var wrap = document.createElement('div');
    wrap.className = 'state-loading';
    var spin = document.createElement('div');
    spin.className = 'spinner';
    var msg = document.createElement('p');
    msg.textContent = 'Buscando o responsável...';
    wrap.appendChild(spin);
    wrap.appendChild(msg);
    content.appendChild(wrap);
  }

  function buildAvatar(owner) {
    var div = document.createElement('div');
    div.className = 'person__avatar';
    div.setAttribute('aria-hidden', 'true');
    div.textContent = initials(owner.name);
    return div;
  }

  function buildOwnerCard(owner, opts) {
    opts = opts || {};
    var card = document.createElement('article');
    card.className = 'person' + (opts.highlight ? ' person--assigned' : '');

    card.appendChild(buildAvatar(owner));

    var name = document.createElement('h2');
    name.className = 'person__name';
    name.textContent = owner.name || 'Sem nome';
    card.appendChild(name);

    if (owner.team) {
      var team = document.createElement('span');
      team.className = 'owner-team';
      team.textContent = owner.team;
      card.appendChild(team);
    }

    var buttonLabel = opts.highlight ? 'Agendar com ' + owner.name : 'Agendar';

    if (owner.calendar_link) {
      var link = document.createElement('a');
      link.className = 'btn';
      link.href = owner.calendar_link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = buttonLabel;
      card.appendChild(link);
    } else {
      var disabled = document.createElement('span');
      disabled.className = 'btn btn--disabled';
      disabled.setAttribute('aria-disabled', 'true');
      disabled.textContent = buttonLabel;
      card.appendChild(disabled);
    }

    return card;
  }

  function buildOwnersGrid(owners) {
    var grid = document.createElement('div');
    grid.className = 'people';
    owners.forEach(function (owner) {
      grid.appendChild(buildOwnerCard(owner));
    });
    return grid;
  }

  // Lista de owners (grid simples, ou agrupada por team se passar do limite).
  function buildOwnersList(owners) {
    if (owners.length > GROUP_THRESHOLD) {
      var wrap = document.createElement('div');
      wrap.className = 'team-groups';
      groupByTeam(owners).forEach(function (group) {
        var section = document.createElement('div');
        section.className = 'team-group';
        var title = document.createElement('h3');
        title.className = 'team-group__title';
        title.textContent = group.team;
        section.appendChild(title);
        section.appendChild(buildOwnersGrid(group.owners));
        wrap.appendChild(section);
      });
      return wrap;
    }
    return buildOwnersGrid(owners);
  }

  // found: true — destaque do assigned_owner + demais owners recolhidos.
  function renderAssigned(assignedOwner, owners) {
    clear(content);
    content.appendChild(buildOwnerCard(assignedOwner, { highlight: true }));

    var others = owners.filter(function (owner) {
      return !owner.is_match;
    });

    if (others.length) {
      var details = document.createElement('details');
      details.className = 'other-owners';
      var summary = document.createElement('summary');
      summary.textContent = 'Prefere outro horário? Ver outros responsáveis';
      details.appendChild(summary);
      details.appendChild(buildOwnersList(others));
      content.appendChild(details);
    }
  }

  // found: false (ou sem email/cpf na URL) — sem destaque, lista completa.
  function renderAllOwners(owners) {
    clear(content);
    var msg = document.createElement('p');
    msg.className = 'content-message';
    msg.textContent = 'Escolha um responsável para agendar';
    content.appendChild(msg);
    content.appendChild(buildOwnersList(owners));
  }

  // Estado de erro com botão "Tentar de novo".
  function renderError(retry) {
    clear(content);
    var wrap = document.createElement('div');
    wrap.className = 'state-error';

    var t = document.createElement('p');
    t.className = 'state-error__title';
    t.textContent = 'Ops! Algo deu errado.';

    var s = document.createElement('p');
    s.className = 'state-error__text';
    s.textContent = 'Não foi possível encontrar os dados. Tente novamente mais tarde.';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = 'Tentar de novo';
    btn.addEventListener('click', retry);

    wrap.appendChild(t);
    wrap.appendChild(s);
    wrap.appendChild(btn);
    content.appendChild(wrap);
  }

  // ---------- Rede ----------------------------------------------------------

  function fetchResponsavel(email, cpf) {
    var params = new URLSearchParams();
    if (email) params.set('email', email);
    if (cpf) params.set('cpf', cpf);
    var url = '/api/responsavel' + (params.toString() ? '?' + params.toString() : '');

    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, TIMEOUT_MS);

    return fetch(url, { signal: controller.signal })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .finally(function () {
        clearTimeout(timer);
      });
  }

  // ---------- Fluxo principal ----------------------------------------------

  function init() {
    var params = new URLSearchParams(window.location.search);
    var email = (params.get('email') || '').trim();
    var cpf = (params.get('cpf') || '').trim();
    var urlCleaned = false;

    function cleanUrl() {
      if (urlCleaned) return;
      urlCleaned = true;
      if (window.location.search) {
        history.replaceState(null, '', window.location.pathname);
      }
    }

    function load() {
      renderLoading();
      fetchResponsavel(email, cpf)
        .then(function (data) {
          cleanUrl();
          var owners = (data && Array.isArray(data.owners)) ? data.owners : [];
          if (!owners.length) {
            renderError(load);
            return;
          }
          if (data.found && data.assigned_owner) {
            renderAssigned(data.assigned_owner, owners);
          } else {
            renderAllOwners(owners);
          }
        })
        .catch(function () {
          cleanUrl();
          renderError(load);
        });
    }

    load();
  }

  init();
})();

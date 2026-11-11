/* ==========================================================================
   Painel de gestão — RF012 a RF017
   GESTOR: tudo · FUNCIONÁRIO: agenda, serviços, profissionais e clientes
   ========================================================================== */
(() => {
  const { $, $$, esc, moeda, minutos, toast } = U;
  const cfg = window.APP_CONFIG;
  Api.usarArea("painel");
  const raiz = $("#raiz");

  const ICON = {
    agenda: '<path d="M4 6h16M4 6v13h16V6M8 3v5M16 3v5M4 11h16"/>',
    servicos: '<path d="M6 4c-2 3 2 6 0 9M6 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 13 9 3M6 13l9-10"/>',
    profissionais: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5 7-5s7 1.5 7 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2.5.5 4 2 4 5"/>',
    financeiro: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    relatorio: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7M9 9h3"/>',
    usuarios: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  };
  const MENU = [
    ["agenda", "Agenda", null], ["servicos", "Serviços", null], ["profissionais", "Profissionais", null], ["clientes", "Clientes", null],
    ["financeiro", "Financeiro", "GESTOR"], ["relatorio", "Relatório do mês", "GESTOR"], ["usuarios", "Usuários e acessos", "GESTOR"],
  ];
  const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
  const marcaHtml = () => esc(cfg.marca).replace("&amp;", '<span class="amp">&amp;</span>');
  const gestor = () => Api.sessao()?.perfil === "GESTOR";

  if (cfg.demo) {
    const s = document.createElement("div");
    s.className = "selo-demo";
    s.innerHTML = `Modo demonstração · dados simulados <button type="button">reiniciar</button>`;
    s.querySelector("button").onclick = () => { Mock.resetar(); location.reload(); };
    document.body.append(s);
  }

  // ================================================================ LOGIN (RF012)
  function telaLogin() {
    raiz.innerHTML = `
      <div class="login-tela">
        <div class="login-arte">
          <div class="display" style="font-size:26px">✂ ${marcaHtml()}</div>
          <div>
            <div class="eyebrow">Painel da equipe</div>
            <h1 class="display">Bastidores<br>da <em>cadeira.</em></h1>
            <p>Agenda do dia, serviços, profissionais, clientes e o caixa — cada um vê o que o seu perfil permite.</p>
          </div>
          <div class="small" style="color:#8e9a8f">Acesso restrito a gestores e funcionários.</div>
        </div>
        <div class="login-form">
          <form novalidate>
            <div class="eyebrow">Entrar</div>
            <h2 class="display">Olá, <em>equipe.</em></h2>
            <div class="field"><label for="e">E-mail</label><input class="input" id="e" name="identificador" type="email" autocomplete="username" required></div>
            <div class="field"><label for="s">Senha</label><input class="input" id="s" name="senha" type="password" autocomplete="current-password" required></div>
            <button class="btn btn-block">Entrar no painel</button>
            ${cfg.demo ? `<p class="small muted" style="margin-top:16px">Demo — gestor: <b>gestor@barbearia.com</b> / Admin@123<br>funcionário: <b>recepcao@barbearia.com</b> / Func@123</p>` : ""}
            <p class="small" style="margin-top:20px"><a href="index.html">← Voltar ao site de agendamento</a></p>
          </form>
        </div>
      </div>`;
    const f = $("form", raiz);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("button", f); btn.disabled = true;
      try {
        const s = await Api.post("/auth/interno/login", U.dadosForm(f));
        if (s.perfil === "CLIENTE") throw new ApiError("Use o site de agendamento para entrar como cliente.", 403);
        Api.salvarSessao(s);
        location.hash = "#/agenda";
        montar();
      } catch (err) { U.erroForm(f, err); btn.disabled = false; }
    });
    setTimeout(() => $("#e")?.focus(), 50);
  }

  // ================================================================ CASCA + ROTAS
  function montar() {
    const s = Api.sessao();
    if (!s) return telaLogin();
    raiz.innerHTML = `
      <div class="casca">
        <aside class="lateral">
          <div class="marca-p"><span class="display">${marcaHtml()}</span><span class="eyebrow">Painel da equipe</span></div>
          <nav class="menu" aria-label="Seções">
            ${MENU.map(([k, rot, perfil], i) => {
              if (perfil && s.perfil !== perfil) return "";
              const grupo = i === 0 ? `<div class="grupo">Operação</div>` : i === 4 ? `<div class="grupo">Gestão</div>` : "";
              return `${grupo}<a href="#/${k}" data-k="${k}">${svg(k)}${rot}</a>`;
            }).join("")}
          </nav>
          <div class="usuario">
            <span class="monograma-p">${U.iniciais(s.nome)}</span>
            <span><b style="color:var(--paper)">${esc(s.nome)}</b><small>${s.perfil === "GESTOR" ? "Gestor" : "Funcionário"}</small></span>
            <button id="sair" type="button">Sair</button>
          </div>
        </aside>
        <main class="conteudo" id="conteudo"></main>
      </div>`;
    $("#sair").addEventListener("click", () => { Api.sair(); location.hash = ""; telaLogin(); });
    rota();
  }

  const VIEWS = {};
  function rota() {
    if (!Api.sessao()) return telaLogin();
    if (!$("#conteudo")) return montar();
    let k = location.hash.replace("#/", "") || "agenda";
    let item = MENU.find((m) => m[0] === k);
    if (!item || (item[2] && Api.sessao().perfil !== item[2])) { k = "agenda"; item = MENU[0]; } // RNF005: bloqueia telas fora do perfil
    $$(".menu a").forEach((a) => (a.dataset.k === k ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    document.title = `${item[1]} · Painel`;
    VIEWS[k]($("#conteudo"));
  }
  window.addEventListener("hashchange", rota);

  async function tentar(promessa, alvo) {
    try { return await promessa; }
    catch (e) {
      if (e.status === 401) { Api.sair(); telaLogin(); toast("Sessão expirada. Entre novamente.", "erro"); throw e; }
      if (alvo) alvo.innerHTML = `<div class="vazio"><div class="display">Ops.</div>${esc(e.message)}</div>`;
      else toast(e.message, "erro");
      throw e;
    }
  }

  function cabecalho(eyebrow, titulo, acoes = "") {
    return `<div class="cabecalho"><div><div class="eyebrow">${eyebrow}</div><h1 class="display">${titulo}</h1></div><div class="flex wrap">${acoes}</div></div>`;
  }

  function drawer(eyebrow, titulo, corpo, rodape = "") {
    const ov = document.createElement("div"); ov.className = "drawer-ov";
    const d = document.createElement("aside"); d.className = "drawer"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true");
    d.innerHTML = `<div class="drawer-head"><button class="fechar" aria-label="Fechar">×</button><div class="eyebrow">${eyebrow}</div><h2 class="display">${titulo}</h2></div>
      <div class="drawer-body">${corpo}</div>${rodape ? `<div class="drawer-foot">${rodape}</div>` : ""}`;
    const fechar = () => { ov.remove(); d.remove(); document.removeEventListener("keydown", esc_); };
    const esc_ = (e) => { if (e.key === "Escape") fechar(); };
    ov.addEventListener("click", fechar);
    $(".fechar", d).addEventListener("click", fechar);
    document.addEventListener("keydown", esc_);
    document.body.append(ov, d);
    setTimeout(() => $("input,select,textarea", d)?.focus(), 40);
    return { el: d, fechar };
  }

  // ================================================================ AGENDA (RF013)
  const ag = { data: U.hoje(), modo: "linha", barbeiroId: "", status: "", barbeiros: null };
  const HORA_INI = 8, HORA_FIM = 20, HH = 72;

  VIEWS.agenda = async (c) => {
    if (!ag.barbeiros) ag.barbeiros = await tentar(Api.get("/admin/barbeiros"), c);
    const d = ag.data;
    const fimSemana = U.addDias(d, 6);
    c.innerHTML = `
      ${cabecalho("Operação · RF013", "Agenda", `<div class="seg" role="group" aria-label="Visualização">
        <button data-m="linha" aria-pressed="${ag.modo === "linha"}">Por profissional</button>
        <button data-m="lista" aria-pressed="${ag.modo === "lista"}">Lista da semana</button></div>`)}
      <div class="ferramentas">
        <div class="navdata">
          <button data-nav="-1" aria-label="Anterior">‹</button>
          <strong>${ag.modo === "linha" ? `${U.DIAS_LONGOS[d.getDay()]}, ${d.getDate()} ${U.MESES[d.getMonth()].slice(0, 3)}` : `${U.dataCurta(d)} a ${U.dataCurta(fimSemana)}`}</strong>
          <button data-nav="1" aria-label="Próximo">›</button>
        </div>
        <button class="btn btn-ghost btn-sm" id="hoje">Hoje</button>
        <input class="input" type="date" id="ir-data" value="${U.isoData(d)}" aria-label="Ir para a data">
        <span class="grow"></span>
        <select class="input" id="f-barb" aria-label="Filtrar por profissional"><option value="">Todos os profissionais</option>
          ${ag.barbeiros.filter((b) => b.ativo).map((b) => `<option value="${b.id}" ${String(b.id) === ag.barbeiroId ? "selected" : ""}>${esc(b.nome)}</option>`).join("")}</select>
        <select class="input" id="f-st" aria-label="Filtrar por status"><option value="">Todos os status</option>
          ${Object.entries(U.STATUS).map(([k, v]) => `<option value="${k}" ${k === ag.status ? "selected" : ""}>${v}</option>`).join("")}</select>
      </div>
      <div id="agenda-corpo"><div class="carregando"></div></div>`;

    $$(".seg button", c).forEach((b) => b.addEventListener("click", () => { ag.modo = b.dataset.m; VIEWS.agenda(c); }));
    $$("[data-nav]", c).forEach((b) => b.addEventListener("click", () => { ag.data = U.addDias(ag.data, Number(b.dataset.nav) * (ag.modo === "linha" ? 1 : 7)); VIEWS.agenda(c); }));
    $("#hoje", c).addEventListener("click", () => { ag.data = U.hoje(); VIEWS.agenda(c); });
    $("#ir-data", c).addEventListener("change", (e) => { if (e.target.value) { ag.data = U.parseLocal(e.target.value); VIEWS.agenda(c); } });
    $("#f-barb", c).addEventListener("change", (e) => { ag.barbeiroId = e.target.value; VIEWS.agenda(c); });
    $("#f-st", c).addEventListener("change", (e) => { ag.status = e.target.value; VIEWS.agenda(c); });

    const ate = ag.modo === "linha" ? d : fimSemana;
    const lista = await tentar(Api.get(`/admin/agenda${Api.q({ de: U.isoData(d), ate: U.isoData(ate), barbeiroId: ag.barbeiroId, status: ag.status })}`), $("#agenda-corpo"));
    const corpo = $("#agenda-corpo");
    if (!corpo) return;
    if (ag.modo === "lista") return agendaLista(corpo, lista);
    agendaLinha(corpo, lista);
  };

  function agendaLinha(corpo, lista) {
    const barbs = ag.barbeiros.filter((b) => b.ativo && (!ag.barbeiroId || String(b.id) === ag.barbeiroId));
    const ds = ag.data.getDay() === 0 ? 7 : ag.data.getDay();
    const horas = HORA_FIM - HORA_INI;
    const y = (dt) => ((dt.getHours() + dt.getMinutes() / 60) - HORA_INI) * HH;
    const agora = new Date();
    const ehHoje = U.isoData(agora) === U.isoData(ag.data);
    const totais = lista.filter((a) => !["CANCELADO", "EXPIRADO"].includes(a.status));

    corpo.innerHTML = `
      <div class="agenda-grade" style="--hh:${HH}px;grid-template-columns:64px repeat(${barbs.length}, minmax(190px, 1fr))">
        <div class="agenda-cab"><div></div>${barbs.map((b) => {
          const n = totais.filter((a) => a.barbeiroId === b.id).length;
          return `<div><span class="mini">${U.iniciais(b.nome)}</span><span>${esc(b.nome)}<small>${n} atendimento${n === 1 ? "" : "s"}</small></span></div>`;
        }).join("")}</div>
        <div class="regua">${Array.from({ length: horas }, (_, i) => `<div>${U.pad(HORA_INI + i)}:00</div>`).join("")}</div>
        ${barbs.map((b) => {
          const faixas = b.horarios.filter((h) => h.diaSemana === ds).map((h) => [U.parseLocal(`2000-01-01T${h.horaInicio}`), U.parseLocal(`2000-01-01T${h.horaFim}`)]);
          // sombreia o que está fora do expediente
          let fora = "", cursor = HORA_INI;
          faixas.sort((a, b) => a[0] - b[0]).forEach(([i, f]) => {
            const hi = i.getHours() + i.getMinutes() / 60, hf = f.getHours() + f.getMinutes() / 60;
            if (hi > cursor) fora += `<div class="fora" style="top:${(cursor - HORA_INI) * HH}px;height:${(hi - cursor) * HH}px"></div>`;
            cursor = Math.max(cursor, hf);
          });
          if (cursor < HORA_FIM) fora += `<div class="fora" style="top:${(cursor - HORA_INI) * HH}px;height:${(HORA_FIM - cursor) * HH}px"></div>`;
          const blocos = lista.filter((a) => a.barbeiroId === b.id).map((a) => {
            const i = U.parseLocal(a.inicio), f = U.parseLocal(a.fim);
            const top = Math.max(0, y(i)), h = Math.max(26, y(f) - y(i) - 3);
            return `<button class="bloco st-${a.status} ${h < 58 ? "curto" : ""}" data-id="${a.id}" style="top:${top}px;height:${h}px" title="${esc(a.clienteNome)} · ${U.STATUS[a.status]}">
              <span class="h">${U.hora(a.inicio)}–${U.hora(a.fim)}</span><b>${esc(a.clienteNome)}</b><span>${a.itens.map((x) => esc(x.nome)).join(" + ")}</span></button>`;
          }).join("");
          const linhaAgora = ehHoje && agora.getHours() >= HORA_INI && agora.getHours() < HORA_FIM ? `<div class="agora-linha" style="top:${y(agora)}px"></div>` : "";
          return `<div class="coluna" style="height:${horas * HH}px">${fora}${blocos}${linhaAgora}</div>`;
        }).join("")}
      </div>
      <div class="legenda">${["CONFIRMADO", "PENDENTE_PAGAMENTO", "CONCLUIDO", "NAO_COMPARECEU", "CANCELADO"].map((s) => U.chip(s)).join("")}
        <span>· área hachurada = fora do expediente</span></div>`;
    if (!barbs.length) corpo.innerHTML = `<div class="vazio">Nenhum profissional ativo.</div>`;
    $$(".bloco", corpo).forEach((b) => b.addEventListener("click", () => detalheAgendamento(lista.find((a) => a.id === Number(b.dataset.id)))));
    if (ehHoje) { const g = $(".agenda-grade", corpo); g.scrollTop = Math.max(0, y(agora) - 160); }
  }

  function agendaLista(corpo, lista) {
    if (!lista.length) { corpo.innerHTML = `<div class="vazio"><div class="display">Semana livre</div>Nenhum agendamento com esses filtros.</div>`; return; }
    corpo.innerHTML = `<div class="tabela-wrap"><table class="tabela">
      <thead><tr><th>Data</th><th>Horário</th><th>Cliente</th><th>Serviços</th><th>Profissional</th><th class="num-c">Tempo</th><th class="num-c">Valor</th><th>Status</th></tr></thead>
      <tbody>${lista.map((a) => `<tr data-id="${a.id}" style="cursor:pointer">
        <td>${U.DIAS[U.parseLocal(a.inicio).getDay()]} ${U.dataCurta(a.inicio)}</td><td class="mono">${U.hora(a.inicio)}</td>
        <td><b>${esc(a.clienteNome)}</b><div class="small muted mono">${U.telefone(a.clienteTelefone)}</div></td>
        <td>${a.itens.map((x) => esc(x.nome)).join(", ")}</td><td>${esc(a.barbeiroNome)}</td>
        <td class="num-c">${minutos(a.duracaoMin)}</td><td class="num-c">${moeda(a.valorTotal)}</td><td>${U.chip(a.status)}</td></tr>`).join("")}
      </tbody></table></div>`;
    $$("tbody tr", corpo).forEach((tr) => tr.addEventListener("click", () => detalheAgendamento(lista.find((a) => a.id === Number(tr.dataset.id)))));
  }

  function detalheAgendamento(a) {
    const TR = { PENDENTE_PAGAMENTO: ["CANCELADO"], CONFIRMADO: ["CONCLUIDO", "NAO_COMPARECEU", "CANCELADO"], NAO_COMPARECEU: ["CONCLUIDO"], CONCLUIDO: ["CONFIRMADO"] };
    const ROT = { CONCLUIDO: ["Concluir atendimento", "btn"], NAO_COMPARECEU: ["Não compareceu", "btn btn-ghost"], CANCELADO: ["Cancelar", "btn btn-danger"], CONFIRMADO: ["Reabrir", "btn btn-ghost"] };
    const acoes = (TR[a.status] || []).map((s) => `<button class="${ROT[s][1]} btn-sm" data-st="${s}">${ROT[s][0]}</button>`).join("");
    const dr = drawer(`Agendamento nº ${a.id}`, esc(a.clienteNome), `
      <div style="margin-bottom:18px">${U.chip(a.status)}</div>
      <dl class="detalhes">
        <dt>Quando</dt><dd>${U.dataExtenso(a.inicio)} · ${U.hora(a.inicio)}–${U.hora(a.fim)}</dd>
        <dt>Profissional</dt><dd>${esc(a.barbeiroNome)}</dd>
        <dt>Telefone</dt><dd class="mono">${U.telefone(a.clienteTelefone)}</dd>
        <dt>Duração</dt><dd>${minutos(a.duracaoMin)}</dd>
      </dl>
      <h3 class="eyebrow" style="margin:24px 0 8px">Serviços</h3>
      <div class="tabela-wrap"><table class="tabela"><tbody>
        ${a.itens.map((i) => `<tr><td>${esc(i.nome)}</td><td class="num-c">${minutos(i.duracaoMin)}</td><td class="num-c">${moeda(i.preco)}</td></tr>`).join("")}
        ${Number(a.desconto) > 0 ? `<tr><td colspan="2">Desconto de aniversário</td><td class="num-c">− ${moeda(a.desconto)}</td></tr>` : ""}
        <tr><td colspan="2"><b>Total</b></td><td class="num-c"><b>${moeda(a.valorTotal)}</b></td></tr>
        <tr><td colspan="2" class="muted">Taxa paga online</td><td class="num-c muted">${moeda(a.taxaAgendamento)}</td></tr>
        <tr><td colspan="2"><b>Receber no local</b></td><td class="num-c"><b>${moeda(a.restanteNoLocal)}</b></td></tr>
      </tbody></table></div>
      ${a.observacao ? `<h3 class="eyebrow" style="margin:24px 0 8px">Observação</h3><p>${esc(a.observacao)}</p>` : ""}
      <p class="small muted" style="margin-top:20px"><a href="https://wa.me/55${U.somenteDigitos(a.clienteTelefone)}" target="_blank" rel="noopener">Abrir conversa no WhatsApp ↗</a></p>`,
      acoes || `<span class="muted small">Sem ações disponíveis para este status.</span>`);
    $$("[data-st]", dr.el).forEach((b) => b.addEventListener("click", async () => {
      if (b.dataset.st === "CANCELADO" && !confirm("Cancelar este agendamento?")) return;
      try {
        await Api.patch(`/admin/agenda/${a.id}/status`, { status: b.dataset.st });
        toast(`Agendamento marcado como “${U.STATUS[b.dataset.st]}”.`);
        dr.fechar(); VIEWS.agenda($("#conteudo"));
      } catch (e) { toast(e.message, "erro"); }
    }));
  }

  // ================================================================ SERVIÇOS (RF014)
  VIEWS.servicos = async (c) => {
    c.innerHTML = `${cabecalho("Cadastros · RF014", "Serviços", `<button class="btn btn-brass" id="novo">+ Novo serviço</button>`)}<div id="lista"><div class="carregando"></div></div>`;
    $("#novo", c).addEventListener("click", () => formServico(null, lista));
    const lista = await tentar(Api.get("/admin/servicos"), $("#lista", c));
    $("#lista", c).innerHTML = `<div class="tabela-wrap"><table class="tabela">
      <thead><tr><th>Serviço</th><th>Tipo</th><th class="num-c">Duração</th><th class="num-c">Preço</th><th>Status</th><th></th></tr></thead>
      <tbody>${lista.map((s) => `<tr class="${s.ativo ? "" : "inativo"}">
        <td><b>${esc(s.nome)}</b><div class="small muted">${esc(s.tipo === "COMBO" ? s.itens.join(" + ") : s.descricao || "")}</div></td>
        <td>${s.tipo === "COMBO" ? "Combo" : "Serviço"}</td><td class="num-c">${minutos(s.duracaoMin)}</td><td class="num-c">${moeda(s.preco)}</td>
        <td>${s.ativo ? `<span class="chip st-CONCLUIDO">Ativo</span>` : `<span class="chip st-CANCELADO">Inativo</span>`}</td>
        <td><div class="acoes"><button class="btn btn-ghost btn-sm" data-ed="${s.id}">Editar</button><button class="btn btn-danger btn-sm" data-ex="${s.id}">Excluir</button></div></td>
      </tr>`).join("")}</tbody></table></div>`;
    $$("[data-ed]", c).forEach((b) => b.addEventListener("click", () => formServico(lista.find((s) => s.id === Number(b.dataset.ed)), lista)));
    $$("[data-ex]", c).forEach((b) => b.addEventListener("click", async () => {
      const s = lista.find((x) => x.id === Number(b.dataset.ex));
      if (!confirm(`Excluir “${s.nome}”? Se já tiver atendimentos, ele será apenas desativado.`)) return;
      try { const r = await Api.del(`/admin/servicos/${s.id}`); toast(r.mensagem); VIEWS.servicos(c); } catch (e) { toast(e.message, "erro"); }
    }));
  };

  function formServico(s, todos) {
    const simples = todos.filter((x) => x.tipo === "SERVICO" && x.id !== s?.id);
    const dr = drawer(s ? "Editar serviço" : "Novo serviço", s ? esc(s.nome) : "Cadastrar <em>serviço</em>", `
      <form id="fs" novalidate>
        <div class="field"><label>Tipo</label><div class="seg" role="group">
          <button type="button" data-tipo="SERVICO" aria-pressed="${(s?.tipo || "SERVICO") === "SERVICO"}">Serviço</button>
          <button type="button" data-tipo="COMBO" aria-pressed="${s?.tipo === "COMBO"}">Combo</button></div></div>
        <div class="field"><label for="sn">Nome</label><input class="input" id="sn" name="nome" value="${esc(s?.nome || "")}" required maxlength="80"></div>
        <div class="field"><label for="sd">Descrição</label><input class="input" id="sd" name="descricao" value="${esc(s?.descricao || "")}" maxlength="255"></div>
        <div class="row">
          <div class="field"><label for="sp">Preço (R$)</label><input class="input mono" id="sp" name="preco" type="number" min="0" step="0.01" value="${s?.preco ?? ""}" required></div>
          <div class="field"><label for="sm">Duração (min)</label><input class="input mono" id="sm" name="duracaoMin" type="number" min="5" max="480" step="5" value="${s?.duracaoMin ?? ""}" required></div>
        </div>
        <div class="field" id="itens-combo" ${s?.tipo === "COMBO" ? "" : "hidden"}><label>Serviços do combo</label>
          <div class="checks">${simples.map((x) => `<label class="check"><input type="checkbox" name="itens" value="${x.id}" ${s?.itens.includes(x.nome) ? "checked" : ""}> ${esc(x.nome)} <span class="muted small">(${moeda(x.preco)})</span></label>`).join("")}</div>
          <p class="small muted" id="soma-combo"></p></div>
        <label class="check"><input type="checkbox" name="ativo" ${s?.ativo === false ? "" : "checked"}> Disponível para agendamento</label>
      </form>`,
      `<button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-brass" form="fs">Salvar</button>`);
    let tipo = s?.tipo || "SERVICO";
    const f = $("#fs", dr.el);
    const atualizarSoma = () => {
      const marc = $$("[name=itens]:checked", f).map((i) => simples.find((x) => x.id === Number(i.value)));
      const p = marc.reduce((t, x) => t + Number(x.preco), 0), d = marc.reduce((t, x) => t + x.duracaoMin, 0);
      $("#soma-combo", f).textContent = marc.length ? `Avulso: ${moeda(p)} · ${minutos(d)}. Defina um preço menor para o cliente economizar.` : "";
    };
    $$("[name=itens]", f).forEach((i) => i.addEventListener("change", atualizarSoma)); atualizarSoma();
    $$("[data-tipo]", f).forEach((b) => b.addEventListener("click", () => {
      tipo = b.dataset.tipo;
      $$("[data-tipo]", f).forEach((x) => x.setAttribute("aria-pressed", x === b));
      $("#itens-combo", f).hidden = tipo !== "COMBO";
    }));
    $("[data-x]", dr.el).addEventListener("click", dr.fechar);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = U.dadosForm(f);
      const body = { nome: d.nome, descricao: d.descricao, preco: d.preco === "" ? null : Number(d.preco), duracaoMin: d.duracaoMin === "" ? null : Number(d.duracaoMin),
        tipo, itensIds: tipo === "COMBO" ? $$("[name=itens]:checked", f).map((i) => Number(i.value)) : [], ativo: $("[name=ativo]", f).checked };
      try {
        s ? await Api.put(`/admin/servicos/${s.id}`, body) : await Api.post("/admin/servicos", body);
        toast("Serviço salvo."); dr.fechar(); VIEWS.servicos($("#conteudo"));
      } catch (err) { U.erroForm(f, err); }
    });
  }

  // ================================================================ PROFISSIONAIS (RF014)
  VIEWS.profissionais = async (c) => {
    c.innerHTML = `${cabecalho("Cadastros · RF014", "Profissionais", `<button class="btn btn-brass" id="novo">+ Novo profissional</button>`)}<div id="lista"><div class="carregando"></div></div>`;
    const [barbs, servs] = await Promise.all([tentar(Api.get("/admin/barbeiros"), $("#lista", c)), Api.get("/admin/servicos")]);
    ag.barbeiros = barbs;
    $("#novo", c).addEventListener("click", () => formBarbeiro(null, servs));
    const nomeS = (id) => servs.find((s) => s.id === id)?.nome || "?";
    const resumoExp = (hs) => {
      const dias = [...new Set(hs.map((h) => h.diaSemana))].sort();
      if (!dias.length) return "Sem expediente";
      const nomes = ["", "seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
      return `${dias.map((d) => nomes[d]).join(", ")} · ${U.horaCurta(hs[0].horaInicio)}–${U.horaCurta(hs[hs.length - 1].horaFim)}`;
    };
    $("#lista", c).innerHTML = `<div class="grade g3">${barbs.map((b, i) => `
      <article class="painel-card" style="--i:${i};${b.ativo ? "" : "opacity:.55"}">
        <div class="flex" style="align-items:flex-start">
          <span style="width:50px;height:50px;border-radius:15px;display:grid;place-items:center;background:var(--grad);color:#fff;font-family:var(--f-display);font-weight:800;font-size:19px;flex:none">${U.iniciais(b.nome)}</span>
          <div class="grow"><b style="font-size:17px">${esc(b.nome)}</b><div class="small muted">${esc(b.especialidade || "")}</div></div>
          ${b.ativo ? `<span class="chip st-CONCLUIDO">Ativo</span>` : `<span class="chip st-CANCELADO">Inativo</span>`}
        </div>
        <p class="small" style="margin:14px 0 6px"><span class="muted">Expediente:</span> ${resumoExp(b.horarios)}</p>
        <div class="flex wrap" style="gap:6px;margin-bottom:16px">${b.servicosIds.map((id) => `<span class="chip" style="color:var(--text-2);background:var(--paper-2)">${esc(nomeS(id))}</span>`).join("")}</div>
        <div class="flex wrap">
          <button class="btn btn-ghost btn-sm" data-ed="${b.id}">Editar</button>
          <button class="btn btn-ghost btn-sm" data-bl="${b.id}">Bloquear horário</button>
          <button class="btn ${b.ativo ? "btn-danger" : "btn-ghost"} btn-sm" data-at="${b.id}">${b.ativo ? "Desativar" : "Reativar"}</button>
        </div>
      </article>`).join("")}</div>`;
    $$("[data-ed]", c).forEach((x) => x.addEventListener("click", () => formBarbeiro(barbs.find((b) => b.id === Number(x.dataset.ed)), servs)));
    $$("[data-bl]", c).forEach((x) => x.addEventListener("click", () => formBloqueio(barbs.find((b) => b.id === Number(x.dataset.bl)))));
    $$("[data-at]", c).forEach((x) => x.addEventListener("click", async () => {
      const b = barbs.find((y) => y.id === Number(x.dataset.at));
      if (b.ativo && !confirm(`Desativar ${b.nome}? Ele deixa de aparecer para os clientes; o histórico é mantido.`)) return;
      try { await Api.patch(`/admin/barbeiros/${b.id}/ativo?valor=${!b.ativo}`); toast(b.ativo ? "Profissional desativado." : "Profissional reativado."); VIEWS.profissionais(c); }
      catch (e) { toast(e.message, "erro"); }
    }));
  };

  function formBarbeiro(b, servs) {
    const DIAS = [[2, "Ter"], [3, "Qua"], [4, "Qui"], [5, "Sex"], [6, "Sáb"], [7, "Dom"], [1, "Seg"]];
    const faixasDe = (d) => (b?.horarios || []).filter((h) => h.diaSemana === d);
    const padrao = !b;
    const dr = drawer(b ? "Editar profissional" : "Novo profissional", b ? esc(b.nome) : "Cadastrar <em>profissional</em>", `
      <form id="fb" novalidate>
        <div class="field"><label for="bn">Nome</label><input class="input" id="bn" name="nome" value="${esc(b?.nome || "")}" required></div>
        <div class="row">
          <div class="field"><label for="bt">Telefone</label><input class="input mono" id="bt" name="telefone" value="${esc(b ? U.telefone(b.telefone || "") : "")}"></div>
          <div class="field"><label for="be">Especialidade</label><input class="input" id="be" name="especialidade" value="${esc(b?.especialidade || "")}"></div>
        </div>
        <div class="field"><label>Serviços que realiza</label><div class="checks">
          ${servs.filter((s) => s.ativo).map((s) => `<label class="check"><input type="checkbox" name="srv" value="${s.id}" ${b?.servicosIds.includes(s.id) ? "checked" : ""}> ${esc(s.nome)}</label>`).join("")}</div></div>
        <div class="field"><label>Expediente <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">— duas faixas por dia (ex.: manhã e tarde); deixe vazio para folga</span></label>
          <div class="expediente">${DIAS.map(([d, n]) => {
            const f = faixasDe(d);
            const v = (i, k) => (f[i] ? U.horaCurta(f[i][k]) : padrao && d >= 2 && d <= 6 ? ["09:00", "12:00", "13:00", "19:00"][i * 2 + (k === "horaFim" ? 1 : 0)] : "");
            return `<div class="exp-dia" data-dia="${d}"><b>${n}</b><div class="faixas">
              <span class="faixa"><input class="input mono" type="time" value="${v(0, "horaInicio")}" aria-label="${n} início 1"><span class="sep">–</span><input class="input mono" type="time" value="${v(0, "horaFim")}" aria-label="${n} fim 1"></span>
              <span class="faixa"><input class="input mono" type="time" value="${v(1, "horaInicio")}" aria-label="${n} início 2"><span class="sep">–</span><input class="input mono" type="time" value="${v(1, "horaFim")}" aria-label="${n} fim 2"></span>
            </div></div>`;
          }).join("")}</div></div>
      </form>`,
      `<button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-brass" form="fb">Salvar</button>`);
    const f = $("#fb", dr.el);
    U.mascara($("#bt", f), "tel");
    $("[data-x]", dr.el).addEventListener("click", dr.fechar);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const horarios = [];
      $$(".exp-dia", f).forEach((row) => {
        const t = $$("input", row).map((i) => i.value);
        [[t[0], t[1]], [t[2], t[3]]].forEach(([i, fim]) => { if (i && fim) horarios.push({ diaSemana: Number(row.dataset.dia), horaInicio: `${i}:00`, horaFim: `${fim}:00` }); });
      });
      const d = U.dadosForm(f);
      const body = { nome: d.nome, telefone: U.somenteDigitos(d.telefone), especialidade: d.especialidade, servicosIds: $$("[name=srv]:checked", f).map((i) => Number(i.value)), horarios };
      try {
        b ? await Api.put(`/admin/barbeiros/${b.id}`, body) : await Api.post("/admin/barbeiros", body);
        toast("Profissional salvo."); dr.fechar(); ag.barbeiros = null; VIEWS.profissionais($("#conteudo"));
      } catch (err) { U.erroForm(f, err); }
    });
  }

  function formBloqueio(b) {
    const hoje = U.isoData(new Date());
    const dr = drawer(`Agenda de ${esc(b.nome)}`, "Bloquear <em>horário</em>", `
      <form id="fbl" novalidate>
        <p class="muted" style="margin-top:0">Folga, consulta médica, curso… o período some da agenda do cliente.</p>
        <div class="row"><div class="field"><label for="i">Início</label><input class="input" id="i" name="inicio" type="datetime-local" value="${hoje}T13:00" required></div>
        <div class="field"><label for="fi">Fim</label><input class="input" id="fi" name="fim" type="datetime-local" value="${hoje}T19:00" required></div></div>
        <div class="field"><label for="m">Motivo</label><input class="input" id="m" name="motivo" maxlength="120" placeholder="Ex.: folga"></div>
      </form>`, `<button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-brass" form="fbl">Bloquear</button>`);
    $("[data-x]", dr.el).addEventListener("click", dr.fechar);
    const f = $("#fbl", dr.el);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = U.dadosForm(f);
      try { await Api.post(`/admin/barbeiros/${b.id}/bloqueios`, { inicio: `${d.inicio}:00`, fim: `${d.fim}:00`, motivo: d.motivo }); toast("Horário bloqueado."); dr.fechar(); }
      catch (err) { U.erroForm(f, err); }
    });
  }

  // ================================================================ CLIENTES (RF016)
  const cl = { busca: "", sel: new Set(), filtro: "todos" };
  VIEWS.clientes = async (c) => {
    c.innerHTML = `${cabecalho("Relacionamento · RF016", "Clientes", `<button class="btn btn-brass" id="comunicar">✉ Enviar comunicação</button>`)}
      <div class="ferramentas">
        <input class="input" id="busca" placeholder="Buscar por nome, telefone ou CPF" value="${esc(cl.busca)}" style="min-width:280px">
        <div class="seg" role="group" aria-label="Filtro">
          ${[["todos", "Todos"], ["aniv", "Aniversariantes"], ["sumidos", "Sem vir há 45+ dias"], ["faltosos", "Com faltas"]].map(([k, r]) => `<button data-f="${k}" aria-pressed="${cl.filtro === k}">${r}</button>`).join("")}
        </div>
        <span class="grow"></span><span class="small muted" id="contagem"></span>
      </div>
      <div id="lista"><div class="carregando"></div></div>`;
    let t;
    $("#busca", c).addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { cl.busca = e.target.value; carregar(); }, 300); });
    $$("[data-f]", c).forEach((b) => b.addEventListener("click", () => { cl.filtro = b.dataset.f; $$("[data-f]", c).forEach((x) => x.setAttribute("aria-pressed", x === b)); desenhar(); }));
    $("#comunicar", c).addEventListener("click", () => formComunicacao(todos));
    let todos = [];
    async function carregar() { todos = await tentar(Api.get(`/admin/clientes${Api.q({ busca: cl.busca })}`), $("#lista", c)); desenhar(); }
    function desenhar() {
      const limite = U.addDias(new Date(), -45);
      const lista = todos.filter((x) => cl.filtro === "todos" || (cl.filtro === "aniv" && x.aniversarianteDoMes)
        || (cl.filtro === "sumidos" && x.ultimoAtendimento && U.parseLocal(x.ultimoAtendimento) < limite) || (cl.filtro === "faltosos" && x.faltas > 0));
      $("#contagem", c).textContent = `${lista.length} cliente(s) · ${cl.sel.size} selecionado(s)`;
      if (!lista.length) { $("#lista", c).innerHTML = `<div class="vazio">Nenhum cliente encontrado.</div>`; return; }
      $("#lista", c).innerHTML = `<div class="tabela-wrap"><table class="tabela">
        <thead><tr><th><input type="checkbox" id="todos" aria-label="Selecionar todos"></th><th>Cliente</th><th>Contato</th><th class="num-c">Atendimentos</th><th class="num-c">Faltas</th><th>Último atendimento</th><th>Aniversário</th></tr></thead>
        <tbody>${lista.map((x) => `<tr>
          <td><input type="checkbox" data-sel="${x.id}" ${cl.sel.has(x.id) ? "checked" : ""} aria-label="Selecionar ${esc(x.nome)}"></td>
          <td><b>${esc(x.nome)}</b>${x.aceitaPromocoes ? "" : `<div class="small muted">não aceita promoções</div>`}</td>
          <td><div class="mono small">${U.telefone(x.telefone)}</div><div class="small muted">${esc(x.email)}</div></td>
          <td class="num-c">${x.atendimentos}</td>
          <td class="num-c" style="${x.faltas ? "color:var(--red);font-weight:700" : ""}">${x.faltas}</td>
          <td>${x.ultimoAtendimento ? U.data(x.ultimoAtendimento) : `<span class="muted">—</span>`}</td>
          <td>${U.dataCurta(x.dataNascimento)} ${x.aniversarianteDoMes ? "🎂" : ""}</td></tr>`).join("")}</tbody></table></div>`;
      $$("[data-sel]", c).forEach((i) => i.addEventListener("change", () => { const id = Number(i.dataset.sel); i.checked ? cl.sel.add(id) : cl.sel.delete(id); $("#contagem", c).textContent = `${lista.length} cliente(s) · ${cl.sel.size} selecionado(s)`; }));
      $("#todos", c).addEventListener("change", (e) => { lista.forEach((x) => (e.target.checked ? cl.sel.add(x.id) : cl.sel.delete(x.id))); desenhar(); });
    }
    carregar();
  };

  function formComunicacao(todos) {
    const n = cl.sel.size;
    const dr = drawer("Comunicação · RF016", "Enviar <em>mensagem</em>", `
      <form id="fc" novalidate>
        <div class="field"><span class="label">Destinatários</span>
          <label class="check"><input type="radio" name="dest" value="sel" ${n ? "checked" : "disabled"}> Clientes selecionados (${n})</label>
          <label class="check"><input type="radio" name="dest" value="todos" ${n ? "" : "checked"}> Todos os clientes (disparo em massa)</label></div>
        <div class="row">
          <div class="field"><label for="cn">Canal</label><select class="input" id="cn" name="canal"><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">E-mail</option></select></div>
          <div class="field"><label for="tp">Tipo</label><select class="input" id="tp" name="tipo">
            <option value="PROMOCAO">Promoção</option><option value="CAMPANHA">Campanha</option><option value="AVISO">Aviso / informativo</option></select></div>
        </div>
        <div class="field"><label for="msg">Mensagem</label><textarea class="input" id="msg" name="mensagem" maxlength="1000" required>Olá, {nome}! </textarea>
          <span class="small muted">Use <b>{nome}</b> para personalizar. Promoções e campanhas só vão para quem aceitou recebê-las.</span></div>
        <div class="flex wrap" style="gap:6px">
          ${["Olá, {nome}! Este mês aniversariantes ganham 10% de desconto. Agende pelo site.", "Olá, {nome}! Faz tempo que você não aparece. Que tal renovar o visual esta semana?", "Aviso: no feriado a barbearia funcionará das 9h às 13h."]
            .map((m) => `<button type="button" class="btn btn-ghost btn-sm" data-mod="${esc(m)}">${esc(m.slice(0, 28))}…</button>`).join("")}
        </div>
      </form>`, `<button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-brass" form="fc">Enviar</button>`);
    const f = $("#fc", dr.el);
    $$("[data-mod]", f).forEach((b) => b.addEventListener("click", () => { $("#msg", f).value = b.dataset.mod; }));
    $("[data-x]", dr.el).addEventListener("click", dr.fechar);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = U.dadosForm(f);
      const todosSel = d.dest === "todos";
      if (todosSel && !confirm(`Enviar para todos os ${todos.length} clientes?`)) return;
      try {
        const r = await Api.post("/admin/comunicacoes", { clientesIds: todosSel ? [] : [...cl.sel], todos: todosSel, canal: d.canal, tipo: d.tipo, mensagem: d.mensagem });
        toast(`${r.enviadas} de ${r.destinatarios} mensagem(ns) enviada(s).`);
        dr.fechar();
      } catch (err) { U.erroForm(f, err); }
    });
  }

  // ================================================================ FINANCEIRO (RF015)
  const fin = { preset: "mes" };
  VIEWS.financeiro = async (c) => {
    const h = U.hoje();
    const presets = {
      hoje: [h, h], "7d": [U.addDias(h, -6), h], mes: [new Date(h.getFullYear(), h.getMonth(), 1), h],
      ant: [new Date(h.getFullYear(), h.getMonth() - 1, 1), new Date(h.getFullYear(), h.getMonth(), 0)],
    };
    if (fin.preset !== "custom") [fin.de, fin.ate] = presets[fin.preset];
    c.innerHTML = `${cabecalho("Gestão · RF015", "Financeiro")}
      <div class="ferramentas">
        <div class="seg" role="group" aria-label="Período">${[["hoje", "Hoje"], ["7d", "7 dias"], ["mes", "Este mês"], ["ant", "Mês anterior"]].map(([k, r]) => `<button data-p="${k}" aria-pressed="${fin.preset === k}">${r}</button>`).join("")}</div>
        <input class="input" type="date" id="de" value="${U.isoData(fin.de)}" aria-label="De"><span class="muted">até</span><input class="input" type="date" id="ate" value="${U.isoData(fin.ate)}" aria-label="Até">
      </div>
      <div id="fin"><div class="carregando"></div></div>`;
    $$("[data-p]", c).forEach((b) => b.addEventListener("click", () => { fin.preset = b.dataset.p; VIEWS.financeiro(c); }));
    ["de", "ate"].forEach((k) => $(`#${k}`, c).addEventListener("change", (e) => { if (!e.target.value) return; fin.preset = "custom"; fin[k] = U.parseLocal(e.target.value); VIEWS.financeiro(c); }));
    const r = await tentar(Api.get(`/admin/financeiro${Api.q({ de: U.isoData(fin.de), ate: U.isoData(fin.ate) })}`), $("#fin", c));
    const box = $("#fin", c);
    box.innerHTML = `
      <div class="grade g4">
        <div class="kpi destaque"><div class="eyebrow">Faturamento</div><div class="valor">${moeda(r.faturamento)}</div><div class="det">atendimentos concluídos</div></div>
        <div class="kpi"><div class="eyebrow">Atendimentos</div><div class="valor">${r.atendimentos}</div><div class="det">${U.dataCurta(r.de)} a ${U.dataCurta(r.ate)}</div></div>
        <div class="kpi"><div class="eyebrow">Ticket médio</div><div class="valor">${moeda(r.ticketMedio)}</div><div class="det">por atendimento</div></div>
        <div class="kpi"><div class="eyebrow">Taxas recebidas online</div><div class="valor">${moeda(r.taxasRecebidas)}</div><div class="det">${r.porMetodoPagamento.map((m) => `${m.rotulo} ${m.quantidade}`).join(" · ") || "—"}</div></div>
      </div>
      <div class="painel-card" style="margin-top:16px"><h3>Faturamento por dia</h3><div id="g-dia"></div></div>
      <div class="grade g2" style="margin-top:16px">
        <div class="painel-card"><h3>Por profissional</h3><div id="g-barb"></div></div>
        <div class="painel-card"><h3>Por serviço</h3><div id="g-serv"></div></div>
      </div>
      <details style="margin-top:16px"><summary class="eyebrow" style="cursor:pointer">Ver em tabela</summary>
        <div class="tabela-wrap" style="margin-top:10px"><table class="tabela"><thead><tr><th>Dia</th><th class="num-c">Atendimentos</th><th class="num-c">Faturamento</th></tr></thead>
        <tbody>${r.porDia.map((l) => `<tr><td>${U.data(l.rotulo)}</td><td class="num-c">${l.quantidade}</td><td class="num-c">${moeda(l.valor)}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">Sem movimento.</td></tr>`}</tbody></table></div>
      </details>`;
    contarKpis(box);
    barrasVerticais($("#g-dia", box), r.porDia.map((l) => ({ ...l, rotulo: U.dataCurta(l.rotulo) })));
    barrasHorizontais($("#g-barb", box), r.porBarbeiro);
    barrasHorizontais($("#g-serv", box), r.porServico.slice().sort((a, b) => b.valor - a.valor));
  };

  // ---------- números dos cards sobem de 0 até o valor (animação)
  function contarKpis(box) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    $$(".kpi .valor", box).forEach((el) => {
      const final = el.textContent;
      const m = final.match(/[\d.]+(,\d+)?/);
      if (!m) return;
      const alvo = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
      const casas = m[1] ? m[1].length - 1 : 0;
      const t0 = performance.now(), dur = 900;
      const passo = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        const v = (alvo * e).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
        el.textContent = p < 1 ? final.replace(m[0], v) : final;
        if (p < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    });
  }

  // ---------- gráficos: uma série, latão, tooltip no hover
  function barrasVerticais(alvo, dados, fmt = moeda) {
    if (!dados.length) { alvo.innerHTML = `<div class="vazio">Sem movimento no período.</div>`; return; }
    const W = 900, H = 240, P = { t: 12, r: 8, b: 26, l: 58 };
    const max = Math.max(...dados.map((d) => d.valor)) || 1;
    const passo = Math.pow(10, Math.floor(Math.log10(max)));
    const topo = Math.ceil(max / passo) * passo;
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const bw = iw / dados.length, gap = Math.max(4, bw * .38);
    const ticks = [0, .25, .5, .75, 1].map((f) => f * topo);
    const cadaN = Math.ceil(dados.length / 14);
    let barras = "";
    dados.forEach((d, i) => {
      const h = (d.valor / topo) * ih, x = P.l + i * bw + gap / 2, y = P.t + ih - h, w = Math.max(2, bw - gap), r = Math.min(4, w / 2);
      barras += `<path class="barra" style="--i:${i}" data-i="${i}" d="M${x},${P.t + ih} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${P.t + ih} Z"/>`;
      barras += `<rect data-i="${i}" x="${P.l + i * bw}" y="${P.t}" width="${bw}" height="${ih}" fill="transparent"/>`;
      if (i % cadaN === 0) barras += `<text x="${x + w / 2}" y="${H - 6}" text-anchor="middle">${esc(d.rotulo)}</text>`;
    });
    alvo.innerHTML = `<div class="grafico"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de barras">
      ${ticks.map((t) => `<line class="grade-l" x1="${P.l}" x2="${W - P.r}" y1="${P.t + ih - (t / topo) * ih}" y2="${P.t + ih - (t / topo) * ih}"/><text x="${P.l - 8}" y="${P.t + ih - (t / topo) * ih + 4}" text-anchor="end">${t >= 1000 ? `${(t / 1000).toLocaleString("pt-BR")}k` : t}</text>`).join("")}
      <line class="eixo" x1="${P.l}" x2="${W - P.r}" y1="${P.t + ih}" y2="${P.t + ih}"/>${barras}</svg><div class="dica" hidden></div></div>`;
    const g = $(".grafico", alvo), dica = $(".dica", g), s = $("svg", g);
    s.addEventListener("mousemove", (e) => {
      const i = e.target.dataset?.i;
      $$(".barra", s).forEach((b) => b.classList.toggle("ativa", b.dataset.i === i));
      if (i === undefined) { dica.hidden = true; return; }
      const d = dados[i], rect = g.getBoundingClientRect(), br = $(`.barra[data-i="${i}"]`, s).getBoundingClientRect();
      dica.hidden = false; dica.style.left = `${br.left - rect.left + br.width / 2}px`; dica.style.top = `${br.top - rect.top}px`;
      dica.innerHTML = `${esc(d.rotulo)} · <b>${fmt(d.valor)}</b> · ${d.quantidade} atend.`;
    });
    s.addEventListener("mouseleave", () => { dica.hidden = true; $$(".barra", s).forEach((b) => b.classList.remove("ativa")); });
  }

  function barrasHorizontais(alvo, dados, fmt = moeda) {
    if (!dados.length) { alvo.innerHTML = `<div class="vazio">Sem dados.</div>`; return; }
    const max = Math.max(...dados.map((d) => d.valor)) || 1;
    alvo.innerHTML = `<div class="hbarras">${dados.map((d) => `
      <div class="hb" title="${esc(d.rotulo)}: ${fmt(d.valor)} em ${d.quantidade}">
        <span class="rot">${esc(d.rotulo)}</span>
        <span class="trilho"><span class="preench" style="display:block;width:${(d.valor / max) * 100}%"></span></span>
        <span class="v">${fmt(d.valor)} <span class="muted">· ${d.quantidade}</span></span>
      </div>`).join("")}</div>`;
  }

  // ================================================================ RELATÓRIO DO MÊS (RF017)
  const rel = { ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 };
  VIEWS.relatorio = async (c) => {
    c.innerHTML = `${cabecalho("Gestão · RF017", "Relatório do mês", `<button class="btn btn-ghost" id="imprimir">Imprimir / PDF</button>`)}
      <div class="ferramentas"><div class="navdata"><button data-nav="-1" aria-label="Mês anterior">‹</button>
        <strong>${U.MESES[rel.mes - 1]} de ${rel.ano}</strong><button data-nav="1" aria-label="Próximo mês">›</button></div></div>
      <div id="rel"><div class="carregando"></div></div>`;
    $("#imprimir", c).addEventListener("click", () => window.print());
    $$("[data-nav]", c).forEach((b) => b.addEventListener("click", () => {
      const d = new Date(rel.ano, rel.mes - 1 + Number(b.dataset.nav), 1); rel.ano = d.getFullYear(); rel.mes = d.getMonth() + 1; VIEWS.relatorio(c);
    }));
    const r = await tentar(Api.get(`/admin/relatorios/mensal${Api.q({ ano: rel.ano, mes: rel.mes })}`), $("#rel", c));
    const box = $("#rel", c);
    const st = r.porStatus;
    box.innerHTML = `
      <article class="relatorio">
        <header>
          <div><div class="eyebrow">${esc(cfg.marca)} · relatório mensal</div><h2 class="display">${U.MESES[r.mes - 1]} <em>${r.ano}</em></h2></div>
          <div class="small muted right">Gerado em ${U.data(new Date())} às ${U.hora(new Date())}<br>por ${esc(Api.sessao().nome)}</div>
        </header>
        <div class="grade g4">
          <div class="kpi destaque"><div class="eyebrow">Faturamento</div><div class="valor">${moeda(r.faturamento)}</div><div class="det">${r.atendimentosRealizados} atendimentos</div></div>
          <div class="kpi"><div class="eyebrow">Ticket médio</div><div class="valor">${moeda(r.ticketMedio)}</div></div>
          <div class="kpi"><div class="eyebrow">Não comparecimento</div><div class="valor">${String(r.taxaNaoComparecimentoPct).replace(".", ",")}%</div><div class="det">${st.NAO_COMPARECEU} falta(s)</div></div>
          <div class="kpi"><div class="eyebrow">Novos clientes</div><div class="valor">${r.novosClientes}</div><div class="det">cadastros no mês</div></div>
        </div>
        <section><h3><span class="n">1.</span> Agendamentos</h3>
          <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Status</th><th class="num-c">Quantidade</th><th class="num-c">% do total</th></tr></thead><tbody>
            ${Object.entries(st).map(([k, v]) => `<tr><td>${U.chip(k)}</td><td class="num-c">${v}</td><td class="num-c">${r.totalAgendamentos ? ((v * 100) / r.totalAgendamentos).toFixed(1).replace(".", ",") : "0,0"}%</td></tr>`).join("")}
            <tr><td><b>Total</b></td><td class="num-c"><b>${r.totalAgendamentos}</b></td><td class="num-c">100%</td></tr>
          </tbody></table></div></section>
        <section><h3><span class="n">2.</span> Faturamento diário</h3><div id="r-dia"></div></section>
        <div class="grade g2">
          <section><h3><span class="n">3.</span> Serviços mais realizados</h3><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Serviço</th><th class="num-c">Qtde</th><th class="num-c">Receita</th></tr></thead><tbody>
            ${r.servicosMaisRealizados.map((l) => `<tr><td>${esc(l.rotulo)}</td><td class="num-c">${l.quantidade}</td><td class="num-c">${moeda(l.valor)}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">—</td></tr>`}</tbody></table></div></section>
          <section><h3><span class="n">4.</span> Desempenho por profissional</h3><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Profissional</th><th class="num-c">Atend.</th><th class="num-c">Faturamento</th></tr></thead><tbody>
            ${r.desempenhoPorBarbeiro.map((l) => `<tr><td>${esc(l.rotulo)}</td><td class="num-c">${l.quantidade}</td><td class="num-c">${moeda(l.valor)}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">—</td></tr>`}</tbody></table></div></section>
        </div>
        <section><h3><span class="n">5.</span> Movimento por dia da semana</h3><div id="r-sem"></div></section>
        <section><h3><span class="n">6.</span> Caixa</h3>
          <dl class="detalhes"><dt>Faturamento de atendimentos concluídos</dt><dd class="mono">${moeda(r.faturamento)}</dd>
          <dt>Recebido no balcão (concluídos, sem a taxa)</dt><dd class="mono">${moeda(r.recebidoNoBalcao)}</dd>
          <dt>Taxas de agendamento pagas online no mês</dt><dd class="mono">${moeda(r.taxasRecebidas)}</dd></dl>
          <p class="small muted">As taxas pagas no mês incluem reservas de atendimentos futuros.</p></section>
      </article>`;
    contarKpis(box);
    barrasVerticais($("#r-dia", box), r.porDia.map((l) => ({ ...l, rotulo: U.dataCurta(l.rotulo) })));
    barrasHorizontais($("#r-sem", box), r.movimentoPorDiaSemana);
  };

  // ================================================================ USUÁRIOS (RF012)
  VIEWS.usuarios = async (c) => {
    c.innerHTML = `${cabecalho("Gestão · RF012", "Usuários e acessos", `<button class="btn btn-brass" id="novo">+ Novo usuário</button>`)}
      <p class="muted" style="margin-top:-6px">Gestores veem tudo. Funcionários acessam agenda, serviços, profissionais e clientes — sem financeiro, relatórios ou usuários.</p>
      <div id="lista"><div class="carregando"></div></div>`;
    $("#novo", c).addEventListener("click", formUsuario);
    const lista = await tentar(Api.get("/admin/usuarios"), $("#lista", c));
    const eu = Api.sessao().id;
    $("#lista", c).innerHTML = `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th></th></tr></thead><tbody>
      ${lista.map((u) => `<tr class="${u.ativo ? "" : "inativo"}"><td><b>${esc(u.nome)}</b>${u.id === eu ? ` <span class="muted small">(você)</span>` : ""}</td><td>${esc(u.email)}</td>
        <td>${u.perfil === "GESTOR" ? "Gestor" : "Funcionário"}</td><td>${u.ativo ? `<span class="chip st-CONCLUIDO">Ativo</span>` : `<span class="chip st-CANCELADO">Inativo</span>`}</td>
        <td><div class="acoes">${u.id === eu ? "" : `<button class="btn ${u.ativo ? "btn-danger" : "btn-ghost"} btn-sm" data-at="${u.id}" data-v="${!u.ativo}">${u.ativo ? "Desativar" : "Reativar"}</button>`}</div></td></tr>`).join("")}
    </tbody></table></div>`;
    $$("[data-at]", c).forEach((b) => b.addEventListener("click", async () => {
      try { await Api.patch(`/admin/usuarios/${b.dataset.at}/ativo?valor=${b.dataset.v}`); toast("Acesso atualizado."); VIEWS.usuarios(c); } catch (e) { toast(e.message, "erro"); }
    }));
  };

  function formUsuario() {
    const dr = drawer("Acesso ao painel", "Novo <em>usuário</em>", `
      <form id="fu" novalidate>
        <div class="field"><label for="un">Nome</label><input class="input" id="un" name="nome" required></div>
        <div class="field"><label for="ue">E-mail (login)</label><input class="input" id="ue" name="email" type="email" required></div>
        <div class="field"><label for="ut">Telefone</label><input class="input mono" id="ut" name="telefone"></div>
        <div class="field"><label for="up">Perfil</label><select class="input" id="up" name="perfil"><option value="FUNCIONARIO">Funcionário</option><option value="GESTOR">Gestor</option></select></div>
        <div class="field"><label for="us">Senha inicial</label><input class="input" id="us" name="senha" type="password" autocomplete="new-password" required>
          <span class="small muted">8+ caracteres com letra, número e caractere especial.</span></div>
      </form>`, `<button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-brass" form="fu">Criar acesso</button>`);
    $("[data-x]", dr.el).addEventListener("click", dr.fechar);
    const f = $("#fu", dr.el);
    U.mascara($("#ut", f), "tel");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = U.dadosForm(f); d.telefone = U.somenteDigitos(d.telefone);
      try { await Api.post("/admin/usuarios", d); toast("Usuário criado."); dr.fechar(); VIEWS.usuarios($("#conteudo")); } catch (err) { U.erroForm(f, err); }
    });
  }

  montar();
})();

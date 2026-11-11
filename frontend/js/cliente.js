/* ==========================================================================
   Área do cliente — RF001 a RF011
   Fluxo: serviços → profissional → dia/horário → reservar (login) → pagar taxa → confirmado
   ========================================================================== */
(() => {
  const { $, $$, esc, moeda, minutos, toast } = U;
  const cfg = window.APP_CONFIG;
  Api.usarArea("cliente");

  const app = $("#app");
  const st = {
    servicos: [], sel: new Set(), barbeiros: [], barbeiro: null,
    data: null, horarios: [], hora: null, disponivelAte: null,
    agendamento: null, pagamento: null, metodo: "PIX", passo: 1, timer: null,
  };

  // ---------------------------------------------------------------- cabeçalho
  $("#marca").innerHTML = esc(cfg.marca).replace("&amp;", '<span class="amp">&amp;</span>');
  $("#cidade").textContent = cfg.cidade;
  document.title = `Agendamento · ${cfg.marca}`;
  if (cfg.demo) {
    const s = document.createElement("div");
    s.className = "selo-demo";
    s.innerHTML = `Modo demonstração · dados simulados <button type="button">reiniciar</button>`;
    s.querySelector("button").onclick = () => { Mock.resetar(); Api.sair(); location.reload(); };
    document.body.append(s);
  }

  function renderConta() {
    const s = Api.sessao();
    $("#area-conta").innerHTML = s
      ? `<span class="ola">Olá, ${esc(s.nome.split(" ")[0])}</span><button class="navlink" id="sair">Sair</button>`
      : `<button class="navlink" id="entrar">Entrar</button>`;
    $("#sair")?.addEventListener("click", () => { Api.sair(); renderConta(); toast("Você saiu da conta."); if (location.hash === "#/meus") rota(); });
    $("#entrar")?.addEventListener("click", () => abrirAuth());
  }

  // ---------------------------------------------------------------- rotas
  function rota() {
    clearInterval(st.timer);
    const r = location.hash.replace("#/", "") || "agendar";
    $$(".nav a").forEach((a) => (a.dataset.rota === r ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    if ($("#barra")) { $("#barra").hidden = true; document.body.classList.remove("tem-barra"); }
    if (r === "meus") return telaMeus();
    telaAgendar();
  }
  window.addEventListener("hashchange", rota);

  // ================================================================ AGENDAR
  async function telaAgendar() {
    app.innerHTML = `
      <div class="hero-wrap"><section class="hero">
        <div>
          <span class="pilula"><b>Online</b> Agende em menos de 3 minutos</span>
          <h1 class="display">Reserve sua <em>cadeira.</em></h1>
          <p>Escolha os serviços, o profissional e o horário. Sem fila e sem troca de mensagens.</p>
        </div>
        <aside class="placa" aria-label="Funcionamento">
          <div class="eyebrow">Funcionamento</div>
          <dl><dt>Ter–Sáb</dt><dd>09h–12h · 13h–19h</dd><dt>Seg e Dom</dt><dd>Fechado</dd></dl>
        </aside>
      </section></div>
      <div class="agendar">
        <div class="passos" id="passos"></div>
        <div class="comanda-wrap"><div class="comanda" id="comanda" aria-live="polite"></div></div>
      </div>`;
    if (!st.servicos.length) {
      $("#passos").innerHTML = `<div class="carregando"></div>`;
      try { st.servicos = await Api.get("/servicos"); }
      catch (e) { $("#passos").innerHTML = `<div class="vazio"><div class="display">Ops.</div>${esc(e.message)}</div>`; return; }
    }
    renderPassos();
    renderComanda();
  }

  const selecionados = () => st.servicos.filter((s) => st.sel.has(s.id));
  const duracao = () => selecionados().reduce((t, s) => t + s.duracaoMin, 0);
  const subtotal = () => selecionados().reduce((t, s) => t + Number(s.preco), 0);
  const inicioISO = () => (st.data && st.hora ? `${st.data}T${st.hora.slice(0, 5)}:00` : null);

  function passoEstado(n) {
    if (n < st.passo) return "feito";
    if (n === st.passo) return "ativo";
    return "bloqueado";
  }

  function renderPassos() {
    const p = $("#passos");
    if (!p) return;
    const sel = selecionados();
    p.innerHTML = `
      ${secao(1, "Serviços", sel.length ? sel.map((s) => s.nome).join(", ") : "")}
      ${secao(2, "Profissional", st.barbeiro?.nome || "")}
      ${secao(3, "Dia e horário", st.hora ? `${U.dataExtenso(st.data)} · ${U.horaCurta(st.hora)}` : "")}
      ${secao(4, st.agendamento ? "Pagamento da taxa" : "Confirmar", "")}`;
    $$(".passo-head .editar", p).forEach((b) => b.addEventListener("click", () => irPara(Number(b.dataset.passo))));
    if (st.passo === 1) corpoServicos();
    if (st.passo === 2) corpoProfissional();
    if (st.passo === 3) corpoHorario();
    if (st.passo === 4) (st.agendamento ? corpoPagamento() : corpoConfirmar());
    // RNF001: mantém o passo atual sempre à vista
    const ativo = $(`.passo[data-estado="ativo"]`, p);
    if (ativo && st.passo > 1) ativo.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function secao(n, titulo, resumo) {
    const e = passoEstado(n);
    const podeEditar = e === "feito" && !st.agendamento;
    return `<section class="passo" data-passo="${n}" data-estado="${e}" aria-labelledby="t${n}" style="--i:${n - 1}">
      <div class="passo-head">
        <span class="num">${n}</span>
        <h2 id="t${n}">${titulo}</h2>
        <span class="resumo">${e === "feito" ? `${esc(resumo)}${podeEditar ? ` · <button class="link-btn editar" data-passo="${n}">alterar</button>` : ""}` : ""}</span>
      </div>
      <div class="passo-corpo" id="c${n}"></div>
    </section>`;
  }

  function irPara(n) {
    st.passo = n;
    if (n <= 1) { st.barbeiro = null; }
    if (n <= 2) { st.data = null; st.hora = null; }
    renderPassos();
    renderComanda();
  }

  // ---------- passo 1: serviços (RF001 / RF002)
  function corpoServicos() {
    const grupos = [["SERVICO", "Serviços"], ["COMBO", "Combos"]];
    const dentroDeCombo = new Set(selecionados().filter((s) => s.tipo === "COMBO").flatMap((c) => st.servicos.filter((x) => c.itens.includes(x.nome)).map((x) => x.id)));
    $("#c1").innerHTML = grupos.map(([tipo, rot]) => {
      const itens = st.servicos.filter((s) => s.tipo === tipo);
      if (!itens.length) return "";
      return `<div class="quadro"><h3 class="eyebrow">${rot}</h3><div class="lista-servicos">
        ${itens.map((s, idx) => {
          const bloqueado = dentroDeCombo.has(s.id);
          return `<button type="button" class="item-servico anima" style="--i:${idx}" data-id="${s.id}" aria-pressed="${st.sel.has(s.id)}" ${bloqueado ? 'aria-disabled="true" title="Já incluído no combo selecionado"' : ""}>
            <span class="marcador" aria-hidden="true">✓</span>
            <span><span class="nome">${esc(s.nome)} <span class="dur">${minutos(s.duracaoMin)}</span>
              ${s.economia > 0 ? `<span class="economia">economize ${moeda(s.economia)}</span>` : ""}</span>
              <span class="desc">${esc(s.tipo === "COMBO" ? s.itens.join(" + ") : s.descricao || "")}</span></span>
            <span class="preco">${moeda(s.preco)}</span>
          </button>`;
        }).join("")}</div></div>`;
    }).join("");
    $$("#c1 .item-servico").forEach((b) => b.addEventListener("click", () => {
      if (b.getAttribute("aria-disabled") === "true") return toast("Esse serviço já está dentro do combo escolhido.", "erro");
      alternarServico(Number(b.dataset.id));
    }));
  }

  function alternarServico(id) {
    const s = st.servicos.find((x) => x.id === id);
    if (st.sel.has(id)) st.sel.delete(id);
    else {
      st.sel.add(id);
      if (s.tipo === "COMBO") st.servicos.filter((x) => s.itens.includes(x.nome)).forEach((x) => st.sel.delete(x.id));
    }
    st.barbeiro = null; st.data = null; st.hora = null;
    if (st.passo > 1) st.passo = 1;
    renderPassos(); renderComanda();
  }

  // ---------- passo 2: profissional (RF003)
  async function corpoProfissional() {
    const c = $("#c2");
    c.innerHTML = `<div class="carregando"></div>`;
    try { st.barbeiros = await Api.get(`/barbeiros${Api.q({ servicos: [...st.sel] })}`); }
    catch (e) { c.innerHTML = `<div class="vazio">${esc(e.message)}</div>`; return; }
    if (!st.barbeiros.length) {
      c.innerHTML = `<div class="vazio"><div class="display">Nenhum profissional</div>faz todos esses serviços juntos. Tente dividir em dois agendamentos.</div>`;
      return;
    }
    c.innerHTML = `<div class="profissionais">${st.barbeiros.map((b, idx) => `
      <button type="button" class="prof anima" style="--i:${idx}" data-id="${b.id}" aria-pressed="${st.barbeiro?.id === b.id}">
        <span class="monograma" aria-hidden="true">${U.iniciais(b.nome)}</span>
        <strong>${esc(b.nome)}</strong><span>${esc(b.especialidade || "")}</span>
      </button>`).join("")}</div>`;
    $$(".prof", c).forEach((b) => b.addEventListener("click", () => {
      st.barbeiro = st.barbeiros.find((x) => x.id === Number(b.dataset.id));
      st.data = null; st.hora = null; st.passo = 3;
      renderPassos(); renderComanda();
    }));
  }

  // ---------- passo 3: dia e horário (RF004)
  async function corpoHorario() {
    const c = $("#c3");
    // janela mensal: até o fim do mês (no último dia do mês, libera o mês seguinte)
    const h = U.hoje();
    const fimMes = new Date(h.getFullYear(), h.getMonth() + 1, 0);
    const ate = st.disponivelAte ? U.parseLocal(st.disponivelAte) : (h.getDate() === fimMes.getDate() ? new Date(h.getFullYear(), h.getMonth() + 2, 0) : fimMes);
    const dias = [];
    for (let d = new Date(h); d <= ate; d = U.addDias(d, 1)) dias.push(new Date(d));
    if (!st.data) st.data = U.isoData(dias[0]);

    c.innerHTML = `
      <div class="dias" role="group" aria-label="Dias disponíveis">
        ${dias.map((d) => `<button type="button" class="dia" data-d="${U.isoData(d)}" aria-pressed="${U.isoData(d) === st.data}">
          <small>${U.DIAS[d.getDay()]}</small><b>${d.getDate()}</b><small>${U.MESES[d.getMonth()].slice(0, 3)}</small></button>`).join("")}
      </div>
      <p class="small muted" style="margin:4px 0 0">A agenda abre mês a mês: as datas do próximo mês são liberadas no último dia de cada mês.</p>
      <div id="slots"></div>`;
    $$(".dia", c).forEach((b) => b.addEventListener("click", () => {
      st.data = b.dataset.d; st.hora = null;
      $$(".dia", c).forEach((x) => x.setAttribute("aria-pressed", x === b));
      carregarSlots(); renderComanda();
    }));
    $(`.dia[aria-pressed="true"]`, c)?.scrollIntoView({ block: "nearest", inline: "center" });
    carregarSlots();
  }

  async function carregarSlots() {
    const box = $("#slots");
    box.innerHTML = `<div class="carregando" style="margin-top:16px"></div>`;
    try {
      const r = await Api.get(`/disponibilidade${Api.q({ barbeiroId: st.barbeiro.id, data: st.data, servicos: [...st.sel] })}`);
      st.disponivelAte = r.disponivelAte;
      st.horarios = r.horarios;
    } catch (e) { box.innerHTML = `<div class="vazio">${esc(e.message)}</div>`; return; }
    if (!st.horarios.length) {
      box.innerHTML = `<div class="vazio" style="margin-top:16px"><div class="display">Sem horários</div>${esc(st.barbeiro.nome)} não tem vaga nesse dia para ${minutos(duracao())}. Escolha outra data.</div>`;
      $(`.dia[data-d="${st.data}"]`)?.classList.add("fechado");
      return;
    }
    const manha = st.horarios.filter((h) => h < "12:00"), tarde = st.horarios.filter((h) => h >= "12:00");
    const bloco = (rot, lista) => lista.length ? `<div class="turno"><div class="eyebrow">${rot}</div><div class="horarios">${lista.map((h) =>
      `<button type="button" class="hora" style="--i:${lista.indexOf(h)}" data-h="${h}" aria-pressed="${st.hora === h}">${U.horaCurta(h)}</button>`).join("")}</div></div>` : "";
    box.innerHTML = bloco("Manhã", manha) + bloco("Tarde", tarde);
    $$(".hora", box).forEach((b) => b.addEventListener("click", () => {
      st.hora = b.dataset.h; st.passo = 4;
      renderPassos(); renderComanda();
    }));
  }

  // ---------- passo 4a: confirmar (RF008) → exige login (RF005/RF006)
  function corpoConfirmar() {
    $("#c4").innerHTML = `
      <div class="stack">
        <div class="aviso"><span>ℹ</span><span>Para garantir o horário, cobramos uma <b>taxa de agendamento</b>, paga agora por PIX ou cartão.
          Ela é descontada do valor no dia. O horário fica reservado por 15 minutos enquanto você paga.</span></div>
        <div class="field"><label for="obs">Observação para o profissional (opcional)</label>
          <textarea class="input" id="obs" maxlength="255" placeholder="Ex.: quero manter o comprimento em cima" style="min-height:76px"></textarea></div>
        <button class="btn btn-brass" id="reservar">Reservar horário</button>
      </div>`;
    $("#reservar").addEventListener("click", reservar);
  }

  async function reservar() {
    if (!Api.sessao()) return abrirAuth(reservar, "Entre ou crie sua conta para reservar.");
    const btn = $("#reservar");
    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Reservando…`;
    try {
      st.agendamento = await Api.post("/cliente/agendamentos", {
        servicosIds: [...st.sel], barbeiroId: st.barbeiro.id, inicio: inicioISO(), observacao: $("#obs")?.value || null,
      });
      renderPassos(); renderComanda();
    } catch (e) {
      toast(e.message, "erro");
      btn.disabled = false; btn.textContent = "Reservar horário";
      if (e.status === 409) { st.hora = null; st.passo = 3; renderPassos(); renderComanda(); }
      if (e.status === 401) abrirAuth(reservar);
    }
  }

  // ---------- passo 4b: pagamento da taxa (RF009 / RF010)
  function corpoPagamento() {
    const a = st.agendamento;
    $("#c4").innerHTML = `
      <div class="aviso"><span>⏱</span><span>Horário reservado. Pague a taxa de <b>${moeda(a.taxaAgendamento)}</b> em
        <span class="contagem" id="contagem">--:--</span> para confirmar.</span></div>
      <div class="metodos" role="group" aria-label="Forma de pagamento">
        ${[["PIX", "aprovação imediata"], ["CREDITO", "crédito"], ["DEBITO", "débito"]].map(([m, d]) =>
          `<button type="button" class="metodo" data-m="${m}" aria-pressed="${st.metodo === m}">${m === "PIX" ? "PIX" : "Cartão"}<small>${d}</small></button>`).join("")}
      </div>
      <div id="form-pag"></div>`;
    $$(".metodo").forEach((b) => b.addEventListener("click", () => {
      st.metodo = b.dataset.m; st.pagamento = null;
      $$(".metodo").forEach((x) => x.setAttribute("aria-pressed", x === b));
      formPagamento();
    }));
    formPagamento();
    iniciarContagem();
  }

  function iniciarContagem() {
    clearInterval(st.timer);
    const fim = U.parseLocal(st.agendamento.expiraEm).getTime();
    const tick = () => {
      const el = $("#contagem");
      if (!el) return clearInterval(st.timer);
      const s = Math.max(0, Math.round((fim - Date.now()) / 1000));
      el.textContent = `${U.pad(Math.floor(s / 60))}:${U.pad(s % 60)}`;
      if (s === 0) {
        clearInterval(st.timer);
        toast("O tempo de reserva acabou. Escolha o horário novamente.", "erro");
        st.agendamento = null; st.pagamento = null; st.hora = null; st.passo = 3;
        renderPassos(); renderComanda();
      }
    };
    tick();
    st.timer = setInterval(tick, 1000);
  }

  function formPagamento() {
    const box = $("#form-pag");
    if (st.metodo === "PIX") {
      if (!st.pagamento) {
        box.innerHTML = `<button class="btn btn-brass btn-block" id="gerar-pix">Gerar PIX de ${moeda(st.agendamento.taxaAgendamento)}</button>`;
        $("#gerar-pix").addEventListener("click", () => pagar({ metodo: "PIX" }));
        return;
      }
      box.innerHTML = `
        <div class="pix">
          ${qrSvg(st.pagamento.pixCopiaCola)}
          <div class="stack">
            <div class="eyebrow">PIX copia e cola</div>
            <div class="copia" id="copia">${esc(st.pagamento.pixCopiaCola)}</div>
            <div class="flex wrap">
              <button class="btn btn-ghost btn-sm" id="copiar">Copiar código</button>
              <button class="btn btn-sm" id="ja-paguei">${cfg.demo ? "Simular pagamento" : "Já paguei"}</button>
            </div>
            <p class="small muted" style="margin:0">A confirmação chega automaticamente pelo banco. ${cfg.demo ? "(QR e código fictícios no modo demonstração.)" : ""}</p>
          </div>
        </div>`;
      $("#copiar").addEventListener("click", () => { navigator.clipboard?.writeText(st.pagamento.pixCopiaCola); toast("Código PIX copiado."); });
      $("#ja-paguei").addEventListener("click", confirmarPix);
      return;
    }
    box.innerHTML = `
      <form id="cartao" novalidate>
        <div class="field"><label for="cnum">Número do cartão</label><input class="input mono" id="cnum" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" required></div>
        <div class="field"><label for="cnome">Nome impresso</label><input class="input" id="cnome" autocomplete="cc-name" required></div>
        <div class="row">
          <div class="field"><label for="cval">Validade</label><input class="input mono" id="cval" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" required></div>
          <div class="field"><label for="ccvv">CVV</label><input class="input mono" id="ccvv" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="123" required></div>
        </div>
        <button class="btn btn-brass btn-block">Pagar ${moeda(st.agendamento.taxaAgendamento)} no ${st.metodo === "CREDITO" ? "crédito" : "débito"}</button>
        <p class="small muted">Os dados do cartão vão direto para a operadora; o sistema recebe só um token.${cfg.demo ? " Demo: cartão terminado em 0000 é recusado." : ""}</p>
      </form>`;
    U.mascara($("#cnum"), "cartao"); U.mascara($("#cval"), "validade");
    $("#cartao").addEventListener("submit", (e) => {
      e.preventDefault();
      const num = U.somenteDigitos($("#cnum").value);
      if (num.length < 13 || !$("#cnome").value.trim() || !/^\d{2}\/\d{2}$/.test($("#cval").value) || $("#ccvv").value.length < 3)
        return toast("Confira os dados do cartão.", "erro");
      // Em produção, este token vem do SDK do gateway (Mercado Pago, Stripe…), nunca o número do cartão.
      pagar({ metodo: st.metodo, tokenCartao: `tok_${Date.now()}_${num.slice(-4)}` });
    });
  }

  async function pagar(body) {
    const btn = $("#form-pag button.btn-brass, #gerar-pix");
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Processando…`; }
    try {
      st.pagamento = await Api.post(`/cliente/agendamentos/${st.agendamento.id}/pagamento`, body);
      if (st.pagamento.status === "APROVADO") return concluir();
      formPagamento();
    } catch (e) {
      toast(e.message, "erro");
      if (btn) { btn.disabled = false; formPagamento(); }
    }
  }

  async function confirmarPix() {
    try {
      st.pagamento = await Api.post(`/cliente/pagamentos/${st.pagamento.id}/confirmar-pix`);
      if (st.pagamento.status === "APROVADO") concluir();
    } catch (e) { toast(e.message, "erro"); }
  }

  // ---------- confirmado (RF010 / RF011)
  function concluir() {
    clearInterval(st.timer);
    const a = st.agendamento;
    const d = U.parseLocal(a.inicio);
    app.innerHTML = `
      <section class="confirmado">
        <div class="selo" aria-hidden="true">✓</div>
        <div class="eyebrow">Pagamento aprovado</div>
        <h1 class="display">Horário <em>confirmado.</em></h1>
        <p class="muted">Enviamos a confirmação no seu WhatsApp. Você também vai receber um lembrete 4 horas antes.</p>
        <div class="canhoto">
          <div class="corpo">
            <dl>
              <dt>Quando</dt><dd>${U.dataExtenso(a.inicio)}, ${U.hora(a.inicio)}</dd>
              <dt>Profissional</dt><dd>${esc(a.barbeiroNome)}</dd>
              <dt>Serviços</dt><dd>${a.itens.map((i) => esc(i.nome)).join(", ")}</dd>
              <dt>Duração</dt><dd>${minutos(a.duracaoMin)}</dd>
              <dt>Taxa paga</dt><dd class="mono">${moeda(a.taxaAgendamento)}</dd>
              <dt>Pagar no local</dt><dd class="mono">${moeda(a.restanteNoLocal)}</dd>
            </dl>
          </div>
          <div class="lado"><div><span class="eyebrow">${U.MESES[d.getMonth()].slice(0, 3)}</span><b>${d.getDate()}</b><span class="mono">${U.hora(a.inicio)}</span></div></div>
        </div>
        <div class="flex" style="justify-content:center">
          <a class="btn btn-ghost" href="#/meus">Ver meus horários</a>
          <button class="btn" id="novo">Novo agendamento</button>
        </div>
      </section>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
    if ($("#barra")) { $("#barra").hidden = true; document.body.classList.remove("tem-barra"); }
    $("#novo").addEventListener("click", () => { reiniciar(); telaAgendar(); });
    reiniciar();
  }

  function reiniciar() {
    Object.assign(st, { sel: new Set(), barbeiro: null, data: null, hora: null, agendamento: null, pagamento: null, passo: 1, metodo: "PIX" });
  }

  // ---------- comanda / carrinho (RF007)
  function renderComanda() {
    const c = $("#comanda");
    if (!c) return;
    const sel = selecionados();
    const a = st.agendamento;
    const linha = (rot, val, extra = "", cls = "") => `<div class="linha ${cls}"><span class="rot">${rot}</span><span class="pontos"></span><span class="val">${val}</span>${extra}</div>`;
    let corpo;
    if (!sel.length) {
      corpo = `<div class="vazio-c"><span class="icone" aria-hidden="true">✂</span>Sua comanda está vazia.<br>Escolha um serviço para começar.</div>`;
    } else {
      corpo = sel.map((s) => linha(esc(s.nome), moeda(s.preco), a ? "" : `<button type="button" aria-label="Remover ${esc(s.nome)}" data-rm="${s.id}">×</button>`)).join("");
      corpo += `<hr>`;
      if (a && Number(a.desconto) > 0) {
        corpo += linha("Subtotal", moeda(a.valorServicos)) + linha("Desc. aniversário", `− ${moeda(a.desconto)}`, "", "destaque");
      }
      corpo += linha("Total", moeda(a ? a.valorTotal : subtotal()), "", "total");
      corpo += linha("Duração", minutos(duracao()));
      if (st.barbeiro || st.data) {
        corpo += `<hr><dl class="info">
          ${st.barbeiro ? `<dt>Profissional</dt><dd>${esc(st.barbeiro.nome)}</dd>` : ""}
          ${st.hora ? `<dt>Data</dt><dd>${U.dataCurta(st.data)} · ${U.DIAS[U.parseLocal(st.data).getDay()]}</dd><dt>Horário</dt><dd>${U.horaCurta(st.hora)}</dd>` : ""}
        </dl>`;
      }
      if (a) {
        corpo += `<hr>` + linha("Taxa agora", moeda(a.taxaAgendamento), "", "destaque") + linha("No local", moeda(a.restanteNoLocal));
      }
      const proximo = { 1: "Escolher profissional", 2: null, 3: null }[st.passo];
      if (proximo) corpo += `<button class="btn btn-block" id="avancar">${proximo} →</button>`;
      if (!a) corpo += `<p class="dica-aniv">Aniversariante do mês ganha desconto 🎂</p>`;
    }
    renderBarra(sel);
    const totalAntes = c.dataset.total;
    c.innerHTML = `<h3>Comanda</h3><div class="sub">${a ? `Reserva nº ${a.id}` : "Seu pedido"}</div><hr>${corpo}`;
    const tot = String(a ? a.valorTotal : subtotal());
    if (totalAntes !== undefined && totalAntes !== tot) $(".linha.total .val", c)?.classList.add("pulsa");
    c.dataset.total = tot;
    $$("[data-rm]", c).forEach((b) => b.addEventListener("click", () => alternarServico(Number(b.dataset.rm))));
    $("#avancar", c)?.addEventListener("click", () => { st.passo = 2; renderPassos(); renderComanda(); });
  }

  // barra fixa no celular: total sempre à vista + atalho para a comanda
  function renderBarra(sel) {
    let b = $("#barra");
    if (!b) { b = document.createElement("div"); b.id = "barra"; b.className = "barra-mobile"; document.body.append(b); }
    const mostrar = sel.length > 0 && !!$("#comanda");
    b.hidden = !mostrar;
    document.body.classList.toggle("tem-barra", mostrar && matchMedia("(max-width: 920px)").matches);
    if (!mostrar) return;
    b.innerHTML = `<span>${sel.length} ${sel.length > 1 ? "itens" : "item"} · <b>${moeda(st.agendamento ? st.agendamento.valorTotal : subtotal())}</b></span>
      <button class="btn btn-brass btn-sm" type="button">${st.passo === 1 ? "Continuar" : "Ver comanda"}</button>`;
    b.querySelector("button").onclick = () => {
      if (st.passo === 1) { st.passo = 2; renderPassos(); renderComanda(); }
      else $("#comanda").scrollIntoView({ behavior: "smooth" });
    };
  }

  // ---------- QR decorativo (o real vem do provedor do PIX)
  function qrSvg(texto) {
    const n = 29; let h = 2166136261;
    const bits = [];
    for (let i = 0; i < n * n; i++) { h ^= texto.charCodeAt(i % texto.length) + i; h = Math.imul(h, 16777619); bits.push((h >>> 7) & 1); }
    const finder = (x, y) => { const cx = x < 7 ? 0 : n - 7, cy = y < 7 ? 0 : n - 7; const dx = x - cx, dy = y - cy; return Math.max(Math.abs(dx - 3), Math.abs(dy - 3)) !== 2 && Math.max(Math.abs(dx - 3), Math.abs(dy - 3)) <= 3; };
    let rects = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const emFinder = (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
      const on = emFinder ? ((x < 7 || x >= n - 7) && (y < 7 || y >= n - 7) && finder(x, y)) : bits[y * n + x];
      if (on) rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
    return `<svg viewBox="0 0 ${n} ${n}" role="img" aria-label="QR Code PIX" shape-rendering="crispEdges"><g fill="#0f1115">${rects}</g></svg>`;
  }

  // ================================================================ MEUS HORÁRIOS
  async function telaMeus() {
    if (!Api.sessao()) {
      app.innerHTML = `<section class="meus"><div class="eyebrow">Sua conta</div><h1 class="display">Meus <em>horários.</em></h1>
        <div class="vazio"><div class="display">Entre para ver</div>seus agendamentos, cancelar ou remarcar.<br><br><button class="btn" id="ent">Entrar</button></div></section>`;
      $("#ent").addEventListener("click", () => abrirAuth(telaMeus));
      return;
    }
    app.innerHTML = `<section class="meus"><div class="eyebrow">Sua conta</div><h1 class="display">Meus <em>horários.</em></h1><div id="lista"><div class="carregando"></div></div></section>`;
    let lista;
    try { lista = await Api.get("/cliente/agendamentos"); }
    catch (e) { $("#lista").innerHTML = `<div class="vazio">${esc(e.message)}</div>`; if (e.status === 401) renderConta(); return; }
    if (!lista.length) {
      $("#lista").innerHTML = `<div class="vazio"><div class="display">Nada por aqui</div>Você ainda não tem agendamentos.<br><br><a class="btn" href="#/agendar">Agendar agora</a></div>`;
      return;
    }
    const agora = new Date();
    const futuros = lista.filter((a) => U.parseLocal(a.inicio) >= agora && ["CONFIRMADO", "PENDENTE_PAGAMENTO"].includes(a.status)).reverse();
    const outros = lista.filter((a) => !futuros.includes(a));
    const card = (a, passado, i = 0) => {
      const d = U.parseLocal(a.inicio);
      const pode = !passado && ["CONFIRMADO", "PENDENTE_PAGAMENTO"].includes(a.status);
      return `<article class="cartao-ag ${passado ? "passado" : ""}" style="--i:${i}">
        <div class="quando"><small>${U.DIAS[d.getDay()]}</small><b>${d.getDate()}</b><small>${U.MESES[d.getMonth()].slice(0, 3)} · ${U.hora(a.inicio)}</small></div>
        <div><h3>${a.itens.map((i) => esc(i.nome)).join(" + ")}</h3>
          <div class="small muted">com ${esc(a.barbeiroNome)} · ${minutos(a.duracaoMin)} · ${moeda(a.valorTotal)}</div>
          <div style="margin-top:6px">${U.chip(a.status)}</div></div>
        <div>${pode ? `<button class="btn btn-danger btn-sm" data-cancelar="${a.id}">Cancelar</button>` : ""}</div>
      </article>`;
    };
    $("#lista").innerHTML =
      (futuros.length ? `<div class="eyebrow" style="margin-bottom:4px">Próximos</div>${futuros.map((a, i) => card(a, false, i)).join("")}` : "") +
      (outros.length ? `<div class="eyebrow" style="margin:34px 0 4px">Histórico</div>${outros.map((a, i) => card(a, true, futuros.length + i)).join("")}` : "");
    $$("[data-cancelar]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Cancelar este agendamento?")) return;
      try { await Api.post(`/cliente/agendamentos/${b.dataset.cancelar}/cancelar`); toast("Agendamento cancelado."); telaMeus(); }
      catch (e) { toast(e.message, "erro"); }
    }));
  }

  // ================================================================ LOGIN / CADASTRO (RF005 / RF006)
  function abrirAuth(depois, aviso) {
    const m = U.modal(`
      <div class="modal-head">
        <button class="fechar" aria-label="Fechar">×</button>
        <div class="eyebrow">${aviso ? esc(aviso) : "Sua conta"}</div>
        <h2 class="display" style="font-size:38px;margin:6px 0 0">Bem-<em>vindo!</em></h2>
      </div>
      <div class="modal-body">
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" data-t="entrar" aria-selected="true">Entrar</button>
          <button class="tab" role="tab" data-t="criar" aria-selected="false">Criar conta</button>
        </div>
        <div id="auth-corpo"></div>
      </div>`);
    const corpo = $("#auth-corpo", m.el);
    const sucesso = (s) => {
      Api.salvarSessao(s); renderConta(); m.fechar();
      toast(`Olá, ${s.nome.split(" ")[0]}!`);
      if (typeof depois === "function") depois();
    };

    function entrar() {
      corpo.innerHTML = `
        <form novalidate>
          <div class="field"><label for="ident">E-mail ou telefone</label><input class="input" id="ident" name="identificador" autocomplete="username" required></div>
          <div class="field"><label for="sen">Senha</label><input class="input" id="sen" type="password" name="senha" autocomplete="current-password" required></div>
          <button class="btn btn-block">Entrar</button>
          <p class="small" style="text-align:center;margin:14px 0 0"><button type="button" class="link-btn" id="esqueci">Esqueci minha senha</button></p>
          ${cfg.demo ? `<p class="small muted" style="text-align:center">Demo: joao@email.com · Cliente@123</p>` : ""}
        </form>`;
      const f = $("form", corpo);
      $("#esqueci", corpo).addEventListener("click", esqueci);
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        try { sucesso(await Api.post("/auth/clientes/login", U.dadosForm(f))); } catch (err) { U.erroForm(f, err); }
      });
    }

    function criar() {
      corpo.innerHTML = `
        <form novalidate>
          <div class="field"><label for="nome">Nome completo</label><input class="input" id="nome" name="nome" autocomplete="name" required></div>
          <div class="row">
            <div class="field"><label for="cpf">CPF</label><input class="input mono" id="cpf" name="cpf" inputmode="numeric" placeholder="000.000.000-00" required></div>
            <div class="field"><label for="nasc">Nascimento</label><input class="input" id="nasc" type="date" name="dataNascimento" required></div>
          </div>
          <div class="field"><label for="email">E-mail</label><input class="input" id="email" type="email" name="email" autocomplete="email" required></div>
          <div class="field"><label for="tel">WhatsApp</label><input class="input mono" id="tel" name="telefone" inputmode="tel" autocomplete="tel" placeholder="(83) 90000-0000" required></div>
          <div class="field"><label for="senha">Senha</label><input class="input" id="senha" type="password" name="senha" autocomplete="new-password" required></div>
          <ul class="regras" id="regras">${U.SENHA_REGRAS.map(([r]) => `<li>${r}</li>`).join("")}</ul>
          <label class="check" style="margin-bottom:16px"><input type="checkbox" name="aceitaPromocoes" checked> Quero receber promoções e o desconto de aniversário</label>
          <button class="btn btn-block">Criar conta</button>
          <p class="small muted">O CPF evita cadastros duplicados; a data de nascimento libera o desconto no mês do seu aniversário.</p>
        </form>`;
      const f = $("form", corpo);
      U.mascara($("#cpf", f), "cpf"); U.mascara($("#tel", f), "tel");
      $("#senha", f).addEventListener("input", (e) => {
        $$("#regras li", f).forEach((li, i) => li.classList.toggle("ok", U.SENHA_REGRAS[i][1](e.target.value)));
      });
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const d = U.dadosForm(f);
        d.aceitaPromocoes = $("[name=aceitaPromocoes]", f).checked;
        d.cpf = U.somenteDigitos(d.cpf); d.telefone = U.somenteDigitos(d.telefone);
        if (!U.SENHA_REGRAS.every(([, t]) => t(d.senha))) return U.erroForm(f, { message: "A senha não atende às regras.", campos: { senha: "Use 8+ caracteres com letra, número e caractere especial." } });
        try { sucesso(await Api.post("/auth/clientes/cadastro", d)); } catch (err) { U.erroForm(f, err); }
      });
    }

    function esqueci() {
      corpo.innerHTML = `
        <form novalidate id="f1">
          <p class="muted" style="margin-top:0">Enviaremos um código de 6 dígitos para você criar uma nova senha.</p>
          <div class="field"><label for="idr">E-mail ou telefone da conta</label><input class="input" id="idr" name="identificador" required></div>
          <div class="field"><span class="label">Receber por</span>
            <div class="flex"><label class="check"><input type="radio" name="canal" value="WHATSAPP" checked> WhatsApp</label>
            <label class="check"><input type="radio" name="canal" value="EMAIL"> E-mail</label></div></div>
          <button class="btn btn-block">Enviar código</button>
          <p class="small" style="text-align:center"><button type="button" class="link-btn" id="voltar">Voltar ao login</button></p>
        </form>`;
      $("#voltar", corpo).addEventListener("click", entrar);
      const f = $("#f1", corpo);
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const d = U.dadosForm(f);
        try {
          const r = await Api.post("/auth/esqueci-senha", d);
          toast(r.mensagem);
          redefinir(d.identificador);
        } catch (err) { U.erroForm(f, err); }
      });
    }

    function redefinir(identificador) {
      corpo.innerHTML = `
        <form novalidate>
          <div class="field"><label for="cod">Código recebido</label><input class="input mono" id="cod" name="codigo" inputmode="numeric" maxlength="6" required></div>
          <div class="field"><label for="ns">Nova senha</label><input class="input" id="ns" type="password" name="novaSenha" autocomplete="new-password" required></div>
          <button class="btn btn-block">Salvar nova senha</button>
        </form>`;
      const f = $("form", corpo);
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        try { const r = await Api.post("/auth/redefinir-senha", { identificador, ...U.dadosForm(f) }); toast(r.mensagem); entrar(); }
        catch (err) { U.erroForm(f, err); }
      });
    }

    $$(".tab", m.el).forEach((t) => t.addEventListener("click", () => {
      $$(".tab", m.el).forEach((x) => x.setAttribute("aria-selected", x === t));
      t.dataset.t === "entrar" ? entrar() : criar();
    }));
    entrar();
  }

  // ---------------------------------------------------------------- início
  renderConta();
  rota();
})();

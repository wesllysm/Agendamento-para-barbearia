/*
 * Back-end simulado para o MODO DEMONSTRAÇÃO.
 * Implementa as mesmas rotas e regras da API Spring Boot (mesmos formatos de resposta),
 * guardando os dados no localStorage do navegador.
 * Contas de teste:  gestor@barbearia.com / Admin@123 · recepcao@barbearia.com / Func@123
 *                   cliente: joao@email.com / Cliente@123
 */
const Mock = (() => {
  const KEY = "barbearia.mock.v2";
  const TAXA = 10, DESC_ANIV = 10, EXPIRA_MIN = 15, SLOT = 30, LEMBRETE_H = 4;
  const ATIVOS = ["PENDENTE_PAGAMENTO", "CONFIRMADO", "CONCLUIDO"];
  const pad = (n) => String(n).padStart(2, "0");
  const isoD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const isoDT = (d) => `${isoD(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  const parse = (s) => U.parseLocal(s);
  const r2 = (v) => Math.round(v * 100) / 100;
  const agora = () => new Date();

  let db = null;

  // ---------------------------------------------------------------- seed
  function seed() {
    let s = 42;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pick = (a) => a[Math.floor(rnd() * a.length)];

    const servicos = [
      [1, "Cabelo", "Corte na tesoura ou máquina, lavagem e finalização", 40, 40],
      [2, "Barba", "Barba com toalha quente, navalha e balm", 30, 30],
      [3, "Sobrancelha", "Design e limpeza na navalha ou pinça", 15, 15],
      [4, "Selagem", "Alinhamento e redução de volume dos fios", 90, 90],
    ].map(([id, nome, descricao, preco, duracaoMin]) => ({ id, nome, descricao, preco, duracaoMin, tipo: "SERVICO", ativo: true, itensIds: [] }));
    servicos.push(
      { id: 7, nome: "Combo 1", descricao: "Barba + Cabelo", preco: 60, duracaoMin: 70, tipo: "COMBO", ativo: true, itensIds: [1, 2] },
      { id: 8, nome: "Combo 2", descricao: "Barba + Cabelo + Sobrancelha", preco: 72, duracaoMin: 85, tipo: "COMBO", ativo: true, itensIds: [1, 2, 3] },
    );
    const expediente = [];
    for (let d = 2; d <= 6; d++) expediente.push({ diaSemana: d, horaInicio: "09:00:00", horaFim: "12:00:00" }, { diaSemana: d, horaInicio: "13:00:00", horaFim: "19:00:00" });
    const barbeiros = [
      { id: 1, nome: "Rafael Andrade", telefone: "83999990001", especialidade: "Cortes clássicos e navalha", ativo: true, servicosIds: [1, 2, 3, 4, 7, 8], horarios: structuredClone(expediente) },
      { id: 2, nome: "Diego Martins", telefone: "83999990002", especialidade: "Degradê e barba", ativo: true, servicosIds: [1, 2, 3, 4, 7, 8], horarios: structuredClone(expediente) },
      { id: 3, nome: "Thiago Nunes", telefone: "83999990003", especialidade: "Barba e acabamento na navalha", ativo: true, servicosIds: [1, 2, 3, 7, 8], horarios: structuredClone(expediente) },
    ];

    const nomes = ["Lucas Ferreira", "Mateus Lima", "Pedro Henrique", "Gabriel Costa", "Thiago Alves", "Bruno Rocha", "André Nunes", "Felipe Duarte", "Gustavo Ramos", "Carlos Eduardo", "Rodrigo Pires", "Vinícius Melo", "Leonardo Dias", "Marcos Vieira", "Daniel Barros", "Igor Teixeira", "Paulo Sérgio", "Renato Cruz", "Eduardo Moura", "Fábio Lopes", "Ana Beatriz", "Juliana Reis"];
    const hojeMes = new Date().getMonth();
    const clientes = [{ id: 1, nome: "João Silva", cpf: "52998224725", dataNascimento: `1998-${pad(hojeMes + 1)}-14`, email: "joao@email.com", telefone: "83988887777", senha: "Cliente@123", aceitaPromocoes: true, ativo: true, criadoEm: isoDT(new Date(Date.now() - 90 * 864e5)) }];
    nomes.forEach((nome, i) => {
      const nasc = new Date(1975 + Math.floor(rnd() * 30), Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27));
      clientes.push({
        id: i + 2, nome, cpf: String(10000000000 + i * 7919), dataNascimento: isoD(nasc),
        email: nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ".") + "@email.com",
        telefone: "8398" + String(1000000 + i * 3571).slice(0, 7), senha: "Cliente@123", aceitaPromocoes: rnd() > .2, ativo: true,
        criadoEm: isoDT(new Date(Date.now() - (5 + rnd() * 120) * 864e5)),
      });
    });

    db = { seq: { ag: 1, pg: 1, cli: clientes.length + 1, srv: 10, bar: 4, usr: 3, not: 1 }, servicos, barbeiros, clientes, agendamentos: [], pagamentos: [], notificacoes: [], bloqueios: [],
      usuarios: [
        { id: 1, nome: "Gestor", email: "gestor@barbearia.com", telefone: "", perfil: "GESTOR", ativo: true, senha: "Admin@123" },
        { id: 2, nome: "Recepção", email: "recepcao@barbearia.com", telefone: "", perfil: "FUNCIONARIO", ativo: true, senha: "Func@123" },
      ] };

    // histórico: 50 dias para trás e 10 para frente
    const carrinhos = [[1], [1], [1], [2], [7], [7], [7], [8], [8], [1, 3], [4], [2, 3]];
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    for (let off = -50; off <= 10; off++) {
      const dia = new Date(hoje); dia.setDate(dia.getDate() + off);
      const ds = dia.getDay(); if (ds === 0 || ds === 1) continue;
      for (const b of barbeiros) {
        const n = off > 0 ? 2 + Math.floor(rnd() * 3) : 4 + Math.floor(rnd() * 5);
        for (let k = 0; k < n; k++) {
          const ids = pick(carrinhos.filter((c) => c.every((id) => b.servicosIds.includes(id))));
          const dur = ids.reduce((t, id) => t + srv(id).duracaoMin, 0);
          const livres = slotsLivres(b, dia, dur, true);
          if (!livres.length) break;
          const ini = parse(`${isoD(dia)}T${pick(livres)}`);
          const cli = pick(clientes.slice(1));
          let st;
          if (off < 0 || (off === 0 && ini < new Date())) { const r = rnd(); st = r < .82 ? "CONCLUIDO" : r < .91 ? "NAO_COMPARECEU" : "CANCELADO"; }
          else st = "CONFIRMADO";
          const ag = montar(cli, b, ids, ini, st);
          ag.lembreteEnviadoEm = st === "CONFIRMADO" ? null : ag.inicio;
          db.agendamentos.push(ag);
          if (st !== "CANCELADO") {
            const pagoEm = new Date(ini); pagoEm.setDate(pagoEm.getDate() - 1 - Math.floor(rnd() * 4));
            db.pagamentos.push({ id: db.seq.pg++, agendamentoId: ag.id, metodo: pick(["PIX", "PIX", "PIX", "CREDITO", "DEBITO"]), valor: ag.taxaAgendamento, status: "APROVADO", pixCopiaCola: null, pagoEm: isoDT(pagoEm) });
          }
        }
      }
    }
    salvar();
  }

  function salvar() { localStorage.setItem(KEY, JSON.stringify(db)); }
  function carregar() {
    if (db) return;
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
    if (!db) seed();
  }
  function resetar() { localStorage.removeItem(KEY); db = null; carregar(); }

  // ---------------------------------------------------------------- helpers
  const err = (msg, status = 422, campos) => { throw new ApiError(msg, status, campos); };
  const srv = (id) => db.servicos.find((s) => s.id === Number(id));
  const bar = (id) => db.barbeiros.find((b) => b.id === Number(id));
  const cli = (id) => db.clientes.find((c) => c.id === Number(id));

  function servicoResp(s) {
    const itens = s.itensIds.map((id) => srv(id)).filter(Boolean);
    const avulso = itens.reduce((t, i) => t + i.preco, 0);
    return { id: s.id, nome: s.nome, descricao: s.descricao, preco: s.preco, duracaoMin: s.duracaoMin, tipo: s.tipo, ativo: s.ativo,
      itens: itens.map((i) => i.nome).sort(), economia: s.tipo === "COMBO" && itens.length ? Math.max(0, r2(avulso - s.preco)) : null };
  }
  const barbeiroResp = (b) => ({ ...structuredClone(b) });

  function montar(c, b, ids, ini, status) {
    const itens = ids.map((id) => { const s = srv(id); return { servicoId: s.id, nome: s.nome, preco: s.preco, duracaoMin: s.duracaoMin }; });
    const dur = itens.reduce((t, i) => t + i.duracaoMin, 0);
    const valorServicos = r2(itens.reduce((t, i) => t + i.preco, 0));
    const aniv = Number(c.dataNascimento.slice(5, 7)) === ini.getMonth() + 1;
    const desconto = aniv ? r2(valorServicos * DESC_ANIV / 100) : 0;
    const valorTotal = r2(valorServicos - desconto);
    return { id: db.seq.ag++, status, inicio: isoDT(ini), fim: isoDT(new Date(ini.getTime() + dur * 6e4)), clienteId: c.id, barbeiroId: b.id,
      itens, valorServicos, desconto, valorTotal, taxaAgendamento: Math.min(TAXA, valorTotal), expiraEm: null, observacao: null, lembreteEnviadoEm: null };
  }

  function agResp(a) {
    const c = cli(a.clienteId), b = bar(a.barbeiroId);
    return { id: a.id, status: a.status, inicio: a.inicio, fim: a.fim, duracaoMin: (parse(a.fim) - parse(a.inicio)) / 6e4,
      barbeiroId: b.id, barbeiroNome: b.nome, clienteId: c.id, clienteNome: c.nome, clienteTelefone: c.telefone,
      itens: a.itens, valorServicos: a.valorServicos, desconto: a.desconto, valorTotal: a.valorTotal, taxaAgendamento: a.taxaAgendamento,
      restanteNoLocal: Math.max(0, r2(a.valorTotal - a.taxaAgendamento)), expiraEm: a.expiraEm, observacao: a.observacao };
  }

  function disponivelAte() {
    const h = new Date(); h.setHours(0, 0, 0, 0);
    const fim = new Date(h.getFullYear(), h.getMonth() + 1, 0);
    return h.getTime() === fim.getTime() ? new Date(h.getFullYear(), h.getMonth() + 2, 0) : fim;
  }

  function expirarPendentes() {
    const n = agora();
    db.agendamentos.forEach((a) => { if (a.status === "PENDENTE_PAGAMENTO" && a.expiraEm && parse(a.expiraEm) < n) a.status = "EXPIRADO"; });
  }

  function slotsLivres(b, dia, dur, ignorarPassado = false) {
    const ds = dia.getDay() === 0 ? 7 : dia.getDay();
    const iniDia = new Date(dia); iniDia.setHours(0, 0, 0, 0);
    const n = agora();
    const ocup = db.agendamentos.filter((a) => a.barbeiroId === b.id && ATIVOS.includes(a.status) && a.inicio.startsWith(isoD(iniDia)));
    const bloq = db.bloqueios.filter((x) => x.barbeiroId === b.id);
    const out = [];
    for (const f of b.horarios.filter((h) => h.diaSemana === ds)) {
      let c = parse(`${isoD(iniDia)}T${f.horaInicio}`);
      const lim = parse(`${isoD(iniDia)}T${f.horaFim}`);
      while (c.getTime() + dur * 6e4 <= lim.getTime()) {
        const fim = new Date(c.getTime() + dur * 6e4);
        const conflita = ocup.some((a) => parse(a.inicio) < fim && parse(a.fim) > c) || bloq.some((x) => parse(x.inicio) < fim && parse(x.fim) > c);
        if (!conflita && (ignorarPassado || c > n)) out.push(`${pad(c.getHours())}:${pad(c.getMinutes())}:00`);
        c = new Date(c.getTime() + SLOT * 6e4);
      }
    }
    return out.sort();
  }

  function validarCarrinho(ids, b) {
    if (!ids?.length) err("Selecione ao menos um serviço.");
    const lista = [...new Set(ids.map(Number))].map((id) => srv(id) || err("Serviço não encontrado(a).", 404));
    for (const s of lista) {
      if (!s.ativo) err(`O serviço ${s.nome} não está disponível.`);
      if (b && !b.servicosIds.includes(s.id)) err(`${b.nome} não realiza o serviço ${s.nome}.`);
    }
    const dentro = new Set(lista.filter((s) => s.tipo === "COMBO").flatMap((s) => s.itensIds));
    lista.forEach((s) => { if (dentro.has(s.id)) err(`O serviço ${s.nome} já está incluído em um combo do carrinho.`); });
    return lista;
  }

  function notificar(c, agId, canal, tipo, mensagem) {
    db.notificacoes.push({ id: db.seq.not++, clienteId: c.id, agendamentoId: agId, canal, tipo, mensagem, status: "ENVIADA", enviadaEm: isoDT(agora()) });
    console.info(`[${canal} → ${canal === "WHATSAPP" ? c.telefone : c.email}] ${mensagem}`);
  }

  // ---------------------------------------------------------------- sessão
  function usuario(token, ...perfis) {
    if (!token) err("Faça login para continuar.", 401);
    const [, perfil, id] = token.split(":");
    if (perfis.length && !perfis.includes(perfil)) err("Você não tem permissão para esta operação.", 403);
    return { perfil, id: Number(id) };
  }
  const emitir = (id, nome, perfil) => ({ token: `mock:${perfil}:${id}`, id, nome, perfil });
  const soDig = (s) => String(s || "").replace(/\D/g, "");

  // ---------------------------------------------------------------- relatórios
  function linhas(lista, chave, porValor) {
    const m = new Map();
    lista.forEach((a) => { const k = chave(a); const x = m.get(k) || { rotulo: k, quantidade: 0, valor: 0 }; x.quantidade++; x.valor = r2(x.valor + a.valorTotal); m.set(k, x); });
    const out = [...m.values()].sort((a, b) => a.rotulo.localeCompare(b.rotulo));
    return porValor ? out.sort((a, b) => b.valor - a.valor) : out;
  }
  function porServico(lista) {
    const m = new Map();
    lista.forEach((a) => {
      const f = a.valorServicos ? a.valorTotal / a.valorServicos : 1;
      a.itens.forEach((i) => { const x = m.get(i.nome) || { rotulo: i.nome, quantidade: 0, valor: 0 }; x.quantidade++; x.valor = r2(x.valor + i.preco * f); m.set(i.nome, x); });
    });
    return [...m.values()].sort((a, b) => b.quantidade - a.quantidade);
  }
  const noPeriodo = (ini, fim) => db.agendamentos.filter((a) => { const d = parse(a.inicio); return d >= ini && d < fim; });
  const taxas = (ini, fim) => r2(db.pagamentos.filter((p) => p.status === "APROVADO" && parse(p.pagoEm) >= ini && parse(p.pagoEm) < fim).reduce((t, p) => t + p.valor, 0));
  const soma = (l) => r2(l.reduce((t, a) => t + a.valorTotal, 0));

  // ---------------------------------------------------------------- rotas
  const rotas = [
    // ---------- auth
    ["POST", /^\/auth\/clientes\/cadastro$/, (m, b) => {
      const campos = {};
      if (!b.nome) campos.nome = "não deve estar em branco";
      if (!b.dataNascimento) campos.dataNascimento = "não deve ser nulo";
      if (!/^\S+@\S+\.\S+$/.test(b.email || "")) campos.email = "deve ser um endereço de e-mail bem formado";
      if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/.test(b.senha || "")) campos.senha = "A senha precisa ter 8+ caracteres, com letra, número e caractere especial.";
      if (Object.keys(campos).length) err("Verifique os campos informados.", 400, campos);
      const cpf = soDig(b.cpf), tel = soDig(b.telefone), email = b.email.toLowerCase();
      if (!cpfValido(cpf)) err("CPF inválido.");
      if (tel.length < 10) err("Telefone inválido.");
      if (db.clientes.some((c) => c.cpf === cpf)) err("Já existe uma conta com este CPF.", 409);
      if (db.clientes.some((c) => c.email === email)) err("Este e-mail já está cadastrado.", 409);
      if (db.clientes.some((c) => c.telefone === tel)) err("Este telefone já está cadastrado.", 409);
      const c = { id: db.seq.cli++, nome: b.nome, cpf, dataNascimento: b.dataNascimento, email, telefone: tel, senha: b.senha, aceitaPromocoes: !!b.aceitaPromocoes, ativo: true, criadoEm: isoDT(agora()) };
      db.clientes.push(c);
      return emitir(c.id, c.nome, "CLIENTE");
    }],
    ["POST", /^\/auth\/clientes\/login$/, (m, b) => {
      const id = String(b.identificador || "").trim();
      const c = db.clientes.find((x) => (id.includes("@") ? x.email === id.toLowerCase() : x.telefone === soDig(id)) && x.senha === b.senha && x.ativo);
      if (!c) err("Login ou senha inválidos.", 401);
      return emitir(c.id, c.nome, "CLIENTE");
    }],
    ["POST", /^\/auth\/interno\/login$/, (m, b) => {
      const u = db.usuarios.find((x) => x.email === String(b.identificador).trim().toLowerCase() && x.senha === b.senha && x.ativo);
      if (!u) err("Login ou senha inválidos.", 401);
      return emitir(u.id, u.nome, u.perfil);
    }],
    ["POST", /^\/auth\/esqueci-senha$/, (m, b) => {
      const id = String(b.identificador || "").trim();
      const c = db.clientes.find((x) => (id.includes("@") ? x.email === id.toLowerCase() : x.telefone === soDig(id)));
      if (c) { c.codigo = "123456"; notificar(c, null, b.canal, "RECUPERACAO_SENHA", "Seu código para redefinir a senha é 123456."); }
      return { mensagem: "Se a conta existir, enviaremos um código de 6 dígitos. (Demo: use 123456)" };
    }],
    ["POST", /^\/auth\/redefinir-senha$/, (m, b) => {
      const id = String(b.identificador || "").trim();
      const c = db.clientes.find((x) => (id.includes("@") ? x.email === id.toLowerCase() : x.telefone === soDig(id)));
      if (!c || c.codigo !== b.codigo) err("Código inválido ou expirado.");
      if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/.test(b.novaSenha || "")) err("Verifique os campos informados.", 400, { novaSenha: "A senha precisa ter 8+ caracteres, com letra, número e caractere especial." });
      c.senha = b.novaSenha; delete c.codigo;
      return { mensagem: "Senha alterada. Faça login com a nova senha." };
    }],

    // ---------- público
    ["GET", /^\/servicos$/, () => db.servicos.filter((s) => s.ativo).sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome)).map(servicoResp).reverse().sort((a, b) => (a.tipo === b.tipo ? a.nome.localeCompare(b.nome) : a.tipo === "SERVICO" ? -1 : 1))],
    ["GET", /^\/barbeiros$/, (m, b, q) => {
      const ids = (q.get("servicos") || "").split(",").filter(Boolean).map(Number);
      return db.barbeiros.filter((x) => x.ativo && ids.every((id) => x.servicosIds.includes(id))).map((x) => ({ id: x.id, nome: x.nome, especialidade: x.especialidade }));
    }],
    ["GET", /^\/disponibilidade$/, (m, b, q) => {
      expirarPendentes();
      const barb = bar(q.get("barbeiroId")) || err("Barbeiro não encontrado(a).", 404);
      const lista = validarCarrinho((q.get("servicos") || "").split(",").filter(Boolean), barb);
      const dur = lista.reduce((t, s) => t + s.duracaoMin, 0);
      const data = parse(q.get("data")), h = new Date(); h.setHours(0, 0, 0, 0);
      const ate = disponivelAte();
      const horarios = data < h || data > ate || !barb.ativo ? [] : slotsLivres(barb, data, dur);
      return { data: q.get("data"), barbeiroId: barb.id, duracaoMin: dur, disponivelAte: isoD(ate), horarios };
    }],

    // ---------- cliente
    ["POST", /^\/cliente\/agendamentos$/, (m, b, q, t) => {
      const u = usuario(t, "CLIENTE");
      expirarPendentes();
      const barb = bar(b.barbeiroId) || err("Barbeiro não encontrado(a).", 404);
      const lista = validarCarrinho(b.servicosIds, barb);
      const dur = lista.reduce((x, s) => x + s.duracaoMin, 0);
      const ini = parse(b.inicio);
      if (ini <= agora()) err("Verifique os campos informados.", 400, { inicio: "deve ser uma data futura" });
      const h = new Date(ini); h.setHours(0, 0, 0, 0);
      if (h > disponivelAte() || !slotsLivres(barb, h, dur).includes(`${pad(ini.getHours())}:${pad(ini.getMinutes())}:00`))
        err("Horário indisponível para este profissional. Escolha outro horário.", 409);
      const a = montar(cli(u.id), barb, lista.map((s) => s.id), ini, "PENDENTE_PAGAMENTO");
      a.expiraEm = isoDT(new Date(Date.now() + EXPIRA_MIN * 6e4));
      a.observacao = b.observacao || null;
      db.agendamentos.push(a);
      return agResp(a);
    }],
    ["GET", /^\/cliente\/agendamentos$/, (m, b, q, t) => {
      const u = usuario(t, "CLIENTE"); expirarPendentes();
      return db.agendamentos.filter((a) => a.clienteId === u.id).sort((a, b) => b.inicio.localeCompare(a.inicio)).map(agResp);
    }],
    ["POST", /^\/cliente\/agendamentos\/(\d+)\/cancelar$/, (m, b, q, t) => {
      const u = usuario(t, "CLIENTE");
      const a = db.agendamentos.find((x) => x.id === Number(m[1]) && x.clienteId === u.id) || err("Agendamento não encontrado(a).", 404);
      if (!["PENDENTE_PAGAMENTO", "CONFIRMADO"].includes(a.status)) err("Este agendamento não pode mais ser cancelado.");
      if (parse(a.inicio) <= agora()) err("O horário já passou.");
      a.status = "CANCELADO";
      return agResp(a);
    }],
    ["POST", /^\/cliente\/agendamentos\/(\d+)\/pagamento$/, (m, b, q, t) => {
      const u = usuario(t, "CLIENTE"); expirarPendentes();
      const a = db.agendamentos.find((x) => x.id === Number(m[1]) && x.clienteId === u.id) || err("Agendamento não encontrado(a).", 404);
      if (a.status === "CONFIRMADO") err("Este agendamento já está pago e confirmado.", 409);
      if (a.status !== "PENDENTE_PAGAMENTO") err("O tempo para pagamento expirou. Faça um novo agendamento.");
      if (b.metodo !== "PIX" && !b.tokenCartao) err("Informe os dados do cartão.");
      const p = { id: db.seq.pg++, agendamentoId: a.id, metodo: b.metodo, valor: a.taxaAgendamento, status: "PENDENTE", pixCopiaCola: null, pagoEm: null };
      db.pagamentos.push(p);
      if (b.metodo === "PIX") {
        p.pixCopiaCola = `00020126580014BR.GOV.BCB.PIX0136${crypto.randomUUID?.() || Date.now()}52040000530398654${String(a.taxaAgendamento.toFixed(2)).length}${a.taxaAgendamento.toFixed(2)}5802BR5915CORTE E NAVALHA6009JOAOPESSOA62070503AG${a.id}6304B1F2`;
      } else if (String(b.tokenCartao).endsWith("0000")) {
        p.status = "RECUSADO"; salvar();
        err("Pagamento recusado pela operadora. Tente outro cartão ou PIX.");
      } else aprovar(p, a);
      return pgResp(p);
    }],
    ["POST", /^\/cliente\/pagamentos\/(\d+)\/confirmar-pix$/, (m, b, q, t) => {
      const u = usuario(t, "CLIENTE"); expirarPendentes();
      const p = db.pagamentos.find((x) => x.id === Number(m[1])) || err("Pagamento não encontrado(a).", 404);
      const a = db.agendamentos.find((x) => x.id === p.agendamentoId && x.clienteId === u.id) || err("Agendamento não encontrado(a).", 404);
      if (p.status === "APROVADO") return pgResp(p);
      if (a.status !== "PENDENTE_PAGAMENTO") err("Este PIX não pode mais ser confirmado.");
      aprovar(p, a);
      return pgResp(p);
    }],

    // ---------- admin
    ["GET", /^\/admin\/agenda$/, (m, b, q, t) => {
      usuario(t, "GESTOR", "FUNCIONARIO"); expirarPendentes();
      const de = parse(q.get("de")), ate = parse(q.get("ate")); ate.setDate(ate.getDate() + 1);
      const bid = q.get("barbeiroId"), st = q.get("status");
      return noPeriodo(de, ate).filter((a) => (!bid || a.barbeiroId === Number(bid)) && (!st || a.status === st)).sort((a, b) => a.inicio.localeCompare(b.inicio)).map(agResp);
    }],
    ["PATCH", /^\/admin\/agenda\/(\d+)\/status$/, (m, b, q, t) => {
      usuario(t, "GESTOR", "FUNCIONARIO");
      const TR = { PENDENTE_PAGAMENTO: ["CANCELADO", "CONFIRMADO"], CONFIRMADO: ["CONCLUIDO", "NAO_COMPARECEU", "CANCELADO"], NAO_COMPARECEU: ["CONCLUIDO"], CONCLUIDO: ["CONFIRMADO"] };
      const a = db.agendamentos.find((x) => x.id === Number(m[1])) || err("Agendamento não encontrado(a).", 404);
      if (!(TR[a.status] || []).includes(b.status)) err(`Não é possível mudar de ${a.status} para ${b.status}.`);
      a.status = b.status; a.expiraEm = null;
      return agResp(a);
    }],
    ["GET", /^\/admin\/servicos$/, (m, b, q, t) => { usuario(t, "GESTOR", "FUNCIONARIO"); return db.servicos.slice().sort((a, b) => (a.tipo === b.tipo ? a.nome.localeCompare(b.nome) : a.tipo === "SERVICO" ? -1 : 1)).map(servicoResp); }],
    ["POST", /^\/admin\/servicos$/, (m, b, q, t) => { usuario(t, "GESTOR", "FUNCIONARIO"); const s = { id: db.seq.srv++, ativo: true, itensIds: [] }; preencherServico(s, b); db.servicos.push(s); return servicoResp(s); }],
    ["PUT", /^\/admin\/servicos\/(\d+)$/, (m, b, q, t) => { usuario(t, "GESTOR", "FUNCIONARIO"); const s = srv(m[1]) || err("Serviço não encontrado(a).", 404); preencherServico(s, b); return servicoResp(s); }],
    ["DELETE", /^\/admin\/servicos\/(\d+)$/, (m, b, q, t) => {
      usuario(t, "GESTOR", "FUNCIONARIO");
      const s = srv(m[1]) || err("Serviço não encontrado(a).", 404);
      if (db.agendamentos.some((a) => a.itens.some((i) => i.servicoId === s.id))) { s.ativo = false; return { mensagem: "Serviço já possui histórico de atendimentos e foi desativado." }; }
      db.servicos = db.servicos.filter((x) => x.id !== s.id);
      db.barbeiros.forEach((x) => { x.servicosIds = x.servicosIds.filter((i) => i !== s.id); });
      db.servicos.forEach((x) => { x.itensIds = x.itensIds.filter((i) => i !== s.id); });
      return { mensagem: "Serviço excluído." };
    }],
    ["GET", /^\/admin\/barbeiros$/, (m, b, q, t) => { usuario(t, "GESTOR", "FUNCIONARIO"); return db.barbeiros.slice().sort((a, b) => b.ativo - a.ativo || a.nome.localeCompare(b.nome)).map(barbeiroResp); }],
    ["POST", /^\/admin\/barbeiros$/, (m, b, q, t) => { usuario(t, "GESTOR", "FUNCIONARIO"); const x = { id: db.seq.bar++, ativo: true, servicosIds: [], horarios: [] }; preencherBarbeiro(x, b); db.barbeiros.push(x); return barbeiroResp(x); }],
    ["PUT", /^\/admin\/barbeiros\/(\d+)$/, (m, b, q, t) => { usuario(t, "GESTOR", "FUNCIONARIO"); const x = bar(m[1]) || err("Barbeiro não encontrado(a).", 404); preencherBarbeiro(x, b); return barbeiroResp(x); }],
    ["PATCH", /^\/admin\/barbeiros\/(\d+)\/ativo$/, (m, b, q, t) => { usuario(t, "GESTOR", "FUNCIONARIO"); (bar(m[1]) || err("Barbeiro não encontrado(a).", 404)).ativo = q.get("valor") === "true"; return null; }],
    ["POST", /^\/admin\/barbeiros\/(\d+)\/bloqueios$/, (m, b, q, t) => {
      usuario(t, "GESTOR", "FUNCIONARIO");
      if (parse(b.fim) <= parse(b.inicio)) err("O fim do bloqueio deve ser após o início.");
      db.bloqueios.push({ id: Date.now(), barbeiroId: Number(m[1]), inicio: b.inicio, fim: b.fim, motivo: b.motivo });
      return null;
    }],
    ["GET", /^\/admin\/clientes$/, (m, b, q, t) => {
      usuario(t, "GESTOR", "FUNCIONARIO");
      const busca = (q.get("busca") || "").toLowerCase();
      const mes = new Date().getMonth() + 1;
      return db.clientes.filter((c) => !busca || c.nome.toLowerCase().includes(busca) || c.telefone.includes(busca) || c.cpf.includes(busca))
        .sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => {
          const ags = db.agendamentos.filter((a) => a.clienteId === c.id);
          const conc = ags.filter((a) => a.status === "CONCLUIDO");
          return { id: c.id, nome: c.nome, email: c.email, telefone: c.telefone, dataNascimento: c.dataNascimento, aceitaPromocoes: c.aceitaPromocoes,
            atendimentos: conc.length, faltas: ags.filter((a) => a.status === "NAO_COMPARECEU").length,
            ultimoAtendimento: conc.map((a) => a.inicio).sort().pop() || null, aniversarianteDoMes: Number(c.dataNascimento.slice(5, 7)) === mes };
        });
    }],
    ["POST", /^\/admin\/comunicacoes$/, (m, b, q, t) => {
      usuario(t, "GESTOR", "FUNCIONARIO");
      let dest = b.todos ? db.clientes.filter((c) => c.ativo) : (b.clientesIds || []).map(cli).filter(Boolean);
      if (!b.todos && !dest.length) err("Selecione ao menos um cliente ou marque 'todos'.");
      if (!b.mensagem) err("Verifique os campos informados.", 400, { mensagem: "não deve estar em branco" });
      if (["PROMOCAO", "CAMPANHA"].includes(b.tipo)) dest = dest.filter((c) => c.aceitaPromocoes);
      dest.forEach((c) => notificar(c, null, b.canal, b.tipo, b.mensagem.replace("{nome}", c.nome.split(" ")[0])));
      return { destinatarios: dest.length, enviadas: dest.length, falhas: 0 };
    }],
    ["GET", /^\/admin\/financeiro$/, (m, b, q, t) => {
      usuario(t, "GESTOR");
      const ini = parse(q.get("de")), fim = parse(q.get("ate")); fim.setDate(fim.getDate() + 1);
      const conc = noPeriodo(ini, fim).filter((a) => a.status === "CONCLUIDO");
      const fat = soma(conc);
      const pm = new Map();
      db.pagamentos.filter((p) => p.status === "APROVADO" && parse(p.pagoEm) >= ini && parse(p.pagoEm) < fim).forEach((p) => { const x = pm.get(p.metodo) || { rotulo: p.metodo, quantidade: 0, valor: 0 }; x.quantidade++; x.valor = r2(x.valor + p.valor); pm.set(p.metodo, x); });
      return { de: q.get("de"), ate: q.get("ate"), faturamento: fat, taxasRecebidas: taxas(ini, fim), ticketMedio: conc.length ? r2(fat / conc.length) : 0, atendimentos: conc.length,
        porDia: linhas(conc, (a) => a.inicio.slice(0, 10)), porServico: porServico(conc), porBarbeiro: linhas(conc, (a) => bar(a.barbeiroId).nome, true), porMetodoPagamento: [...pm.values()] };
    }],
    ["GET", /^\/admin\/relatorios\/mensal$/, (m, b, q, t) => {
      usuario(t, "GESTOR");
      const ano = Number(q.get("ano")), mes = Number(q.get("mes"));
      const ini = new Date(ano, mes - 1, 1), fim = new Date(ano, mes, 1);
      const todos = noPeriodo(ini, fim), conc = todos.filter((a) => a.status === "CONCLUIDO");
      const porStatus = {}; ["PENDENTE_PAGAMENTO", "CONFIRMADO", "CONCLUIDO", "CANCELADO", "NAO_COMPARECEU", "EXPIRADO"].forEach((s) => { porStatus[s] = todos.filter((a) => a.status === s).length; });
      const faltas = porStatus.NAO_COMPARECEU, fat = soma(conc);
      const nomesDia = ["seg.", "ter.", "qua.", "qui.", "sex.", "sáb.", "dom."];
      return { ano, mes, totalAgendamentos: todos.length, porStatus, atendimentosRealizados: conc.length, faturamento: fat, taxasRecebidas: taxas(ini, fim), recebidoNoBalcao: r2(fat - conc.reduce((t, a) => t + a.taxaAgendamento, 0)),
        ticketMedio: conc.length ? r2(fat / conc.length) : 0, taxaNaoComparecimentoPct: conc.length + faltas ? Math.round((faltas * 1000) / (conc.length + faltas)) / 10 : 0,
        novosClientes: db.clientes.filter((c) => parse(c.criadoEm) >= ini && parse(c.criadoEm) < fim).length,
        servicosMaisRealizados: porServico(conc).slice(0, 10), desempenhoPorBarbeiro: linhas(conc, (a) => bar(a.barbeiroId).nome, true),
        movimentoPorDiaSemana: nomesDia.map((n, i) => { const l = conc.filter((a) => ((parse(a.inicio).getDay() + 6) % 7) === i); return { rotulo: n, quantidade: l.length, valor: soma(l) }; }),
        porDia: linhas(conc, (a) => a.inicio.slice(0, 10)) };
    }],
    ["GET", /^\/admin\/usuarios$/, (m, b, q, t) => { usuario(t, "GESTOR"); return db.usuarios.map(({ senha, ...u }) => u); }],
    ["POST", /^\/admin\/usuarios$/, (m, b, q, t) => {
      usuario(t, "GESTOR");
      if (!b.senha) err("Informe uma senha inicial.");
      if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/.test(b.senha)) err("Verifique os campos informados.", 400, { senha: "A senha precisa ter 8+ caracteres, com letra, número e caractere especial." });
      if (db.usuarios.some((u) => u.email === b.email.toLowerCase())) err("E-mail já cadastrado.", 409);
      const u = { id: db.seq.usr++, nome: b.nome, email: b.email.toLowerCase(), telefone: b.telefone, perfil: b.perfil, ativo: true, senha: b.senha };
      db.usuarios.push(u); const { senha, ...r } = u; return r;
    }],
    ["PATCH", /^\/admin\/usuarios\/(\d+)\/ativo$/, (m, b, q, t) => {
      const eu = usuario(t, "GESTOR");
      const u = db.usuarios.find((x) => x.id === Number(m[1])) || err("Usuário não encontrado(a).", 404);
      if (u.id === eu.id && q.get("valor") !== "true") err("Você não pode desativar o próprio acesso.");
      u.ativo = q.get("valor") === "true"; const { senha, ...r } = u; return r;
    }],
  ];

  function aprovar(p, a) {
    p.status = "APROVADO"; p.pagoEm = isoDT(agora());
    a.status = "CONFIRMADO"; a.expiraEm = null;
    const c = cli(a.clienteId), b = bar(a.barbeiroId);
    notificar(c, a.id, "WHATSAPP", "CONFIRMACAO", `Olá, ${c.nome.split(" ")[0]}! Seu horário com ${b.nome} está confirmado para ${U.dataExtenso(a.inicio)} às ${U.hora(a.inicio)}.`);
    // RF011: no back-end real, um job envia o lembrete 4h antes; aqui só registramos se já estiver dentro da janela
    if (parse(a.inicio) - agora() <= LEMBRETE_H * 36e5) { a.lembreteEnviadoEm = isoDT(agora()); notificar(c, a.id, "WHATSAPP", "LEMBRETE", `Lembrete: você tem horário às ${U.hora(a.inicio)} com ${b.nome}.`); }
  }
  const pgResp = (p) => ({ id: p.id, agendamentoId: p.agendamentoId, metodo: p.metodo, valor: p.valor, status: p.status, pixCopiaCola: p.pixCopiaCola, pagoEm: p.pagoEm,
    statusAgendamento: db.agendamentos.find((a) => a.id === p.agendamentoId).status });

  function preencherServico(s, b) {
    const campos = {};
    if (!b.nome) campos.nome = "não deve estar em branco";
    if (!(Number(b.preco) >= 0) || b.preco === "") campos.preco = "informe um valor";
    if (!(Number(b.duracaoMin) >= 5)) campos.duracaoMin = "deve ser no mínimo 5";
    if (Object.keys(campos).length) err("Verifique os campos informados.", 400, campos);
    if (db.servicos.some((x) => x.id !== s.id && x.nome.toLowerCase() === b.nome.toLowerCase())) err("Já existe um serviço com este nome.", 409);
    if (b.tipo === "COMBO") {
      if (!b.itensIds || b.itensIds.length < 2) err("Um combo precisa ter pelo menos dois serviços.");
      if (b.itensIds.some((id) => srv(id)?.tipo === "COMBO" || Number(id) === s.id)) err("Um combo só pode conter serviços simples.");
    }
    Object.assign(s, { nome: b.nome, descricao: b.descricao || "", preco: Number(b.preco), duracaoMin: Number(b.duracaoMin), tipo: b.tipo, itensIds: b.tipo === "COMBO" ? b.itensIds.map(Number) : [] });
    if (b.ativo !== undefined && b.ativo !== null) s.ativo = !!b.ativo;
  }
  function preencherBarbeiro(x, b) {
    if (!b.nome) err("Verifique os campos informados.", 400, { nome: "não deve estar em branco" });
    (b.horarios || []).forEach((h) => { if (h.horaFim <= h.horaInicio) err("Em cada faixa de expediente o fim deve ser após o início."); });
    Object.assign(x, { nome: b.nome, telefone: soDig(b.telefone), especialidade: b.especialidade || "" });
    if (b.servicosIds) x.servicosIds = b.servicosIds.map(Number);
    if (b.horarios) x.horarios = b.horarios.map((h) => ({ diaSemana: Number(h.diaSemana), horaInicio: h.horaInicio.length === 5 ? h.horaInicio + ":00" : h.horaInicio, horaFim: h.horaFim.length === 5 ? h.horaFim + ":00" : h.horaFim }));
    if (b.ativo !== undefined && b.ativo !== null) x.ativo = !!b.ativo;
  }

  function cpfValido(c) {
    if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    for (let pos = 9; pos <= 10; pos++) {
      let soma = 0;
      for (let i = 0; i < pos; i++) soma += Number(c[i]) * (pos + 1 - i);
      if (((soma * 10) % 11) % 10 !== Number(c[pos])) return false;
    }
    return true;
  }

  async function handle(method, path, body, token) {
    carregar();
    await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
    const [p, qs = ""] = path.split("?");
    const q = new URLSearchParams(qs);
    for (const [mth, re, fn] of rotas) {
      const m = p.match(re);
      if (m && mth === method) {
        const res = fn(m, structuredClone(body ?? {}), q, token);
        salvar();
        return structuredClone(res);
      }
    }
    throw new ApiError(`Rota simulada não encontrada: ${method} ${p}`, 404);
  }

  return { handle, resetar };
})();

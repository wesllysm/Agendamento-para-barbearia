/* Utilitários compartilhados (formatação, DOM, toasts, máscaras). */
const U = (() => {
  const moedaFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  const pad = (n) => String(n).padStart(2, "0");

  /** "2026-11-20T10:00:00" → Date local (sem conversão de fuso). */
  function parseLocal(s) {
    if (s instanceof Date) return s;
    const [d, t = "00:00:00"] = String(s).split("T");
    const [y, m, dd] = d.split("-").map(Number);
    const [hh, mi, ss = 0] = t.split(":").map((x) => parseInt(x, 10));
    return new Date(y, m - 1, dd, hh, mi, ss || 0);
  }
  const isoData = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const isoLocal = (d) => `${isoData(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  const hora = (s) => { const d = parseLocal(s); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const horaCurta = (t) => String(t).slice(0, 5);
  const data = (s) => { const d = parseLocal(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
  const dataCurta = (s) => { const d = parseLocal(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
  const dataExtenso = (s) => {
    const d = parseLocal(s);
    return `${DIAS_LONGOS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
  };
  const moeda = (v) => moedaFmt.format(Number(v || 0));
  const minutos = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ""}` : `${m} min`);
  const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const addDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  const STATUS = {
    PENDENTE_PAGAMENTO: "Aguardando pagamento",
    CONFIRMADO: "Confirmado",
    CONCLUIDO: "Concluído",
    CANCELADO: "Cancelado",
    NAO_COMPARECEU: "Não compareceu",
    EXPIRADO: "Expirado",
  };
  const chip = (st) => `<span class="chip st-${st}">${STATUS[st] || st}</span>`;

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function toast(msg, tipo = "ok") {
    let box = $(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("role", "status"); document.body.append(box); }
    const t = document.createElement("div");
    t.className = `toast ${tipo}`;
    t.textContent = msg;
    box.append(t);
    setTimeout(() => { t.style.transition = "opacity .3s"; t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, tipo === "erro" ? 5200 : 3400);
  }

  /** Abre um modal com HTML; devolve { el, fechar }. */
  function modal(html, { largura } = {}) {
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" ${largura ? `style="width:min(${largura}px,100%)"` : ""}>${html}</div>`;
    const anterior = document.activeElement;
    const fechar = () => { ov.remove(); document.removeEventListener("keydown", esc_); anterior?.focus?.(); };
    const esc_ = (e) => { if (e.key === "Escape") fechar(); };
    ov.addEventListener("mousedown", (e) => { if (e.target === ov) fechar(); });
    document.addEventListener("keydown", esc_);
    document.body.append(ov);
    ov.querySelector(".fechar")?.addEventListener("click", fechar);
    setTimeout(() => ov.querySelector("input,select,textarea,button:not(.fechar)")?.focus(), 30);
    return { el: ov.querySelector(".modal"), fechar };
  }

  /** Mostra os erros devolvidos pela API (inclusive por campo). */
  function erroForm(form, e) {
    $$(".erro", form).forEach((x) => x.remove());
    $$(".invalido", form).forEach((x) => x.classList.remove("invalido"));
    if (e && e.campos) {
      for (const [campo, msg] of Object.entries(e.campos)) {
        const inp = form.querySelector(`[name="${campo}"]`);
        if (inp) {
          inp.classList.add("invalido");
          const s = document.createElement("span"); s.className = "erro"; s.textContent = msg;
          inp.closest(".field")?.append(s);
        }
      }
    }
    toast(e?.message || "Algo deu errado.", "erro");
  }

  // máscaras simples
  const somenteDigitos = (s) => String(s || "").replace(/\D/g, "");
  function mascara(input, tipo) {
    input.addEventListener("input", () => {
      const d = somenteDigitos(input.value);
      if (tipo === "cpf") input.value = d.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      if (tipo === "tel") input.value = d.slice(0, 11).replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
      if (tipo === "cartao") input.value = d.slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
      if (tipo === "validade") input.value = d.slice(0, 4).replace(/(\d{2})(\d)/, "$1/$2");
    });
  }
  const telefone = (t) => { const d = somenteDigitos(t); return d.length === 11 ? d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3") : d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3"); };
  const iniciais = (nome) => String(nome).split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  const SENHA_REGRAS = [
    ["8 ou mais caracteres", (s) => s.length >= 8],
    ["uma letra", (s) => /[A-Za-z]/.test(s)],
    ["um número", (s) => /\d/.test(s)],
    ["um caractere especial", (s) => /[^A-Za-z0-9]/.test(s)],
  ];

  function dadosForm(form) {
    const o = {};
    new FormData(form).forEach((v, k) => { o[k] = typeof v === "string" ? v.trim() : v; });
    return o;
  }

  return { parseLocal, isoData, isoLocal, hora, horaCurta, data, dataCurta, dataExtenso, moeda, minutos, hoje, addDias, pad,
    STATUS, chip, esc, $, $$, toast, modal, erroForm, mascara, somenteDigitos, telefone, iniciais, SENHA_REGRAS, dadosForm, DIAS, DIAS_LONGOS, MESES };
})();

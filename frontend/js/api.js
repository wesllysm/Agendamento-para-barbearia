/* Cliente HTTP da API. No modo demonstração, as chamadas vão para o Mock (js/mock.js). */
class ApiError extends Error {
  constructor(mensagem, status, campos) {
    super(mensagem);
    this.status = status;
    this.campos = campos;
  }
}

const Api = (() => {
  const cfg = window.APP_CONFIG;
  let area = "cliente"; // "cliente" ou "painel" — cada área guarda sua própria sessão

  const chave = () => `barbearia.sessao.${area}`;
  const sessao = () => { try { return JSON.parse(localStorage.getItem(chave())); } catch { return null; } };
  const salvarSessao = (s) => localStorage.setItem(chave(), JSON.stringify(s));
  const sair = () => localStorage.removeItem(chave());

  async function req(method, path, body) {
    const token = sessao()?.token;
    if (cfg.demo) return Mock.handle(method, path, body, token);

    let res;
    try {
      res = await fetch(cfg.apiUrl + path, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError("Não foi possível conectar ao servidor. Verifique se o back-end está rodando.", 0);
    }
    if (res.status === 401 && token) { sair(); }
    if (res.status === 204) return null;
    const dados = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = dados?.mensagem || (res.status === 401 ? "Faça login para continuar." : res.status === 403 ? "Acesso não permitido." : "Erro inesperado.");
      throw new ApiError(msg, res.status, dados?.campos);
    }
    return dados;
  }

  const q = (o) => {
    const p = new URLSearchParams();
    Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, Array.isArray(v) ? v.join(",") : v); });
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return {
    usarArea(a) { area = a; },
    sessao, salvarSessao, sair, q,
    get: (p) => req("GET", p),
    post: (p, b = {}) => req("POST", p, b),
    put: (p, b) => req("PUT", p, b),
    patch: (p, b = {}) => req("PATCH", p, b),
    del: (p) => req("DELETE", p),
  };
})();

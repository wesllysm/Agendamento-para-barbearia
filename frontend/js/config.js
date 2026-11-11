/*
 * Configuração do front-end.
 *  - demo: true  → roda 100% no navegador com dados simulados (não precisa do back-end).
 *  - demo: false → usa a API Spring Boot em apiUrl.
 * Também é possível forçar pela URL: ?demo=1 ou ?demo=0
 */
window.APP_CONFIG = {
  marca: "Corte & Navalha",
  cidade: "João Pessoa · PB",
  apiUrl: "http://localhost:8080/api",
  demo: true,
};

(function () {
  const p = new URLSearchParams(location.search).get("demo");
  if (p === "1") window.APP_CONFIG.demo = true;
  if (p === "0") window.APP_CONFIG.demo = false;
})();

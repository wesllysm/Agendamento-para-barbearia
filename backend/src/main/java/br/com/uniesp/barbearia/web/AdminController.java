package br.com.uniesp.barbearia.web;

import br.com.uniesp.barbearia.config.UsuarioLogado;
import br.com.uniesp.barbearia.domain.StatusAgendamento;
import br.com.uniesp.barbearia.dto.AgendamentoDtos.AgendamentoResponse;
import br.com.uniesp.barbearia.dto.AgendamentoDtos.AlterarStatusRequest;
import br.com.uniesp.barbearia.dto.CatalogoDtos.*;
import br.com.uniesp.barbearia.dto.GestaoDtos.*;
import br.com.uniesp.barbearia.service.AgendamentoService;
import br.com.uniesp.barbearia.service.CatalogoService;
import br.com.uniesp.barbearia.service.GestaoService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Painel de gestão. Rotas /api/admin/** → GESTOR e FUNCIONARIO.
 * Financeiro, relatórios e usuários → somente GESTOR (ver SecurityConfig).
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AgendamentoService agendamentos;
    private final CatalogoService catalogo;
    private final GestaoService gestao;

    public AdminController(AgendamentoService agendamentos, CatalogoService catalogo, GestaoService gestao) {
        this.agendamentos = agendamentos;
        this.catalogo = catalogo;
        this.gestao = gestao;
    }

    // ---------------- RF013 Agenda ----------------
    @GetMapping("/agenda")
    public List<AgendamentoResponse> agenda(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
                                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate,
                                            @RequestParam(required = false) Long barbeiroId,
                                            @RequestParam(required = false) StatusAgendamento status) {
        return agendamentos.agenda(de, ate, barbeiroId, status);
    }

    @PatchMapping("/agenda/{id}/status")
    public AgendamentoResponse alterarStatus(@PathVariable Long id, @Valid @RequestBody AlterarStatusRequest req) {
        return agendamentos.alterarStatus(id, req.status());
    }

    // ---------------- RF014 Serviços ----------------
    @GetMapping("/servicos")
    public List<ServicoResponse> servicos() {
        return catalogo.todosServicos();
    }

    @PostMapping("/servicos")
    @ResponseStatus(HttpStatus.CREATED)
    public ServicoResponse criarServico(@Valid @RequestBody ServicoRequest req) {
        return catalogo.criarServico(req);
    }

    @PutMapping("/servicos/{id}")
    public ServicoResponse atualizarServico(@PathVariable Long id, @Valid @RequestBody ServicoRequest req) {
        return catalogo.atualizarServico(id, req);
    }

    @DeleteMapping("/servicos/{id}")
    public Map<String, String> excluirServico(@PathVariable Long id) {
        return Map.of("mensagem", catalogo.excluirServico(id));
    }

    // ---------------- RF014 Barbeiros ----------------
    @GetMapping("/barbeiros")
    public List<BarbeiroResponse> barbeiros() {
        return catalogo.todosBarbeiros();
    }

    @PostMapping("/barbeiros")
    @ResponseStatus(HttpStatus.CREATED)
    public BarbeiroResponse criarBarbeiro(@Valid @RequestBody BarbeiroRequest req) {
        return catalogo.criarBarbeiro(req);
    }

    @PutMapping("/barbeiros/{id}")
    public BarbeiroResponse atualizarBarbeiro(@PathVariable Long id, @Valid @RequestBody BarbeiroRequest req) {
        return catalogo.atualizarBarbeiro(id, req);
    }

    @PatchMapping("/barbeiros/{id}/ativo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void ativarDesativar(@PathVariable Long id, @RequestParam boolean valor) {
        catalogo.alterarAtivoBarbeiro(id, valor);
    }

    @PostMapping("/barbeiros/{id}/bloqueios")
    @ResponseStatus(HttpStatus.CREATED)
    public void bloquear(@PathVariable Long id, @Valid @RequestBody BloqueioRequest req) {
        catalogo.bloquearAgenda(id, req);
    }

    // ---------------- RF016 Clientes e comunicações ----------------
    @GetMapping("/clientes")
    public List<ClienteResumo> clientes(@RequestParam(required = false) String busca) {
        return gestao.clientes(busca);
    }

    @PostMapping("/comunicacoes")
    public ComunicacaoResponse comunicar(@Valid @RequestBody ComunicacaoRequest req) {
        return gestao.comunicar(req);
    }

    // ---------------- RF015 Financeiro (GESTOR) ----------------
    @GetMapping("/financeiro")
    public FinanceiroResponse financeiro(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
                                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return gestao.financeiro(de, ate);
    }

    // ---------------- RF017 Relatório do mês (GESTOR) ----------------
    @GetMapping("/relatorios/mensal")
    public RelatorioMensalResponse relatorio(@RequestParam int ano, @RequestParam int mes) {
        return gestao.relatorioMensal(ano, mes);
    }

    // ---------------- RF012 Usuários internos (GESTOR) ----------------
    @GetMapping("/usuarios")
    public List<UsuarioInternoResponse> usuarios() {
        return gestao.usuarios();
    }

    @PostMapping("/usuarios")
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioInternoResponse criarUsuario(@Valid @RequestBody UsuarioInternoRequest req) {
        return gestao.criarUsuario(req);
    }

    @PatchMapping("/usuarios/{id}/ativo")
    public UsuarioInternoResponse ativarUsuario(@AuthenticationPrincipal UsuarioLogado eu,
                                                @PathVariable Long id, @RequestParam boolean valor) {
        return gestao.alterarAtivoUsuario(id, valor, eu.id());
    }

    /** Dados do usuário logado (o front usa para montar o menu conforme o perfil). */
    @GetMapping("/eu")
    public UsuarioLogado eu(@AuthenticationPrincipal UsuarioLogado eu) {
        return eu;
    }
}

package br.com.uniesp.barbearia.web;

import br.com.uniesp.barbearia.config.UsuarioLogado;
import br.com.uniesp.barbearia.dto.AgendamentoDtos.*;
import br.com.uniesp.barbearia.service.AgendamentoService;
import br.com.uniesp.barbearia.service.PagamentoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Área do cliente logado. */
@RestController
@RequestMapping("/api/cliente")
public class ClienteController {

    private final AgendamentoService agendamentos;
    private final PagamentoService pagamentos;

    public ClienteController(AgendamentoService agendamentos, PagamentoService pagamentos) {
        this.agendamentos = agendamentos;
        this.pagamentos = pagamentos;
    }

    /** RF002/RF003/RF004/RF007 → cria a pré-reserva e devolve o resumo (RF008) */
    @PostMapping("/agendamentos")
    @ResponseStatus(HttpStatus.CREATED)
    public AgendamentoResponse agendar(@AuthenticationPrincipal UsuarioLogado eu,
                                       @Valid @RequestBody NovoAgendamentoRequest req) {
        return agendamentos.criar(eu.id(), req);
    }

    @GetMapping("/agendamentos")
    public List<AgendamentoResponse> meus(@AuthenticationPrincipal UsuarioLogado eu) {
        return agendamentos.doCliente(eu.id());
    }

    @GetMapping("/agendamentos/{id}")
    public AgendamentoResponse detalhe(@AuthenticationPrincipal UsuarioLogado eu, @PathVariable Long id) {
        return agendamentos.detalheDoCliente(eu.id(), id);
    }

    @PostMapping("/agendamentos/{id}/cancelar")
    public AgendamentoResponse cancelar(@AuthenticationPrincipal UsuarioLogado eu, @PathVariable Long id) {
        return agendamentos.cancelarPeloCliente(eu.id(), id);
    }

    /** RF009 */
    @PostMapping("/agendamentos/{id}/pagamento")
    public PagamentoResponse pagar(@AuthenticationPrincipal UsuarioLogado eu, @PathVariable Long id,
                                   @Valid @RequestBody PagamentoRequest req) {
        return pagamentos.pagar(eu.id(), id, req);
    }

    /** RF010 — simula o webhook do PIX em desenvolvimento */
    @PostMapping("/pagamentos/{id}/confirmar-pix")
    public PagamentoResponse confirmarPix(@AuthenticationPrincipal UsuarioLogado eu, @PathVariable Long id) {
        return pagamentos.confirmarPix(eu.id(), id);
    }
}

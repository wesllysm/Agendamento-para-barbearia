package br.com.uniesp.barbearia.service;

import br.com.uniesp.barbearia.domain.*;
import br.com.uniesp.barbearia.dto.AgendamentoDtos.PagamentoRequest;
import br.com.uniesp.barbearia.dto.AgendamentoDtos.PagamentoResponse;
import br.com.uniesp.barbearia.exception.RegraNegocioException;
import br.com.uniesp.barbearia.integracao.GatewayPagamento;
import br.com.uniesp.barbearia.repository.PagamentoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

/** RF009 pagamento da taxa (PIX, crédito ou débito) · RF010 confirmação do agendamento. */
@Service
public class PagamentoService {

    private final PagamentoRepository pagamentos;
    private final AgendamentoService agendamentoService;
    private final GatewayPagamento gateway;
    private final NotificacaoService notificacoes;
    private final Clock clock;

    public PagamentoService(PagamentoRepository pagamentos, AgendamentoService agendamentoService,
                            GatewayPagamento gateway, NotificacaoService notificacoes, Clock clock) {
        this.pagamentos = pagamentos;
        this.agendamentoService = agendamentoService;
        this.gateway = gateway;
        this.notificacoes = notificacoes;
        this.clock = clock;
    }

    /** noRollbackFor: um cartão recusado continua registrado no histórico de pagamentos. */
    @Transactional(noRollbackFor = RegraNegocioException.class)
    public PagamentoResponse pagar(Long clienteId, Long agendamentoId, PagamentoRequest req) {
        Agendamento a = agendamentoService.doClienteOuErro(clienteId, agendamentoId);
        if (a.getStatus() == StatusAgendamento.CONFIRMADO)
            throw RegraNegocioException.conflito("Este agendamento já está pago e confirmado.");
        if (a.getStatus() != StatusAgendamento.PENDENTE_PAGAMENTO || expirado(a))
            throw new RegraNegocioException("O tempo para pagamento expirou. Faça um novo agendamento.");
        if (req.metodo() != MetodoPagamento.PIX && (req.tokenCartao() == null || req.tokenCartao().isBlank()))
            throw new RegraNegocioException("Informe os dados do cartão.");

        var r = gateway.cobrar(req.metodo(), a.getTaxaAgendamento(), "AG" + a.getId(), req.tokenCartao());

        Pagamento p = new Pagamento();
        p.setAgendamento(a);
        p.setMetodo(req.metodo());
        p.setValor(a.getTaxaAgendamento());
        p.setCodigoTransacao(r.codigoTransacao());
        p.setPixCopiaCola(r.pixCopiaCola());
        if (r.aprovado()) {
            aprovar(p);
        } else if (!r.aguardandoConfirmacao()) {
            p.setStatus(StatusPagamento.RECUSADO);
        }
        pagamentos.save(p);
        if (p.getStatus() == StatusPagamento.RECUSADO) {
            throw new RegraNegocioException("Pagamento recusado pela operadora. Tente outro cartão ou PIX.");
        }
        return PagamentoResponse.de(p);
    }

    /**
     * Confirmação do PIX. Em produção quem chama é o webhook do provedor (validando a assinatura);
     * aqui o front-end chama em modo de desenvolvimento para simular o "pago".
     */
    @Transactional
    public PagamentoResponse confirmarPix(Long clienteId, Long pagamentoId) {
        Pagamento p = pagamentos.findById(pagamentoId).orElseThrow(() -> RegraNegocioException.naoEncontrado("Pagamento"));
        Agendamento a = agendamentoService.doClienteOuErro(clienteId, p.getAgendamento().getId());
        if (p.getStatus() == StatusPagamento.APROVADO) return PagamentoResponse.de(p);
        if (p.getStatus() != StatusPagamento.PENDENTE || a.getStatus() != StatusAgendamento.PENDENTE_PAGAMENTO || expirado(a))
            throw new RegraNegocioException("Este PIX não pode mais ser confirmado.");
        aprovar(p);
        return PagamentoResponse.de(p);
    }

    private void aprovar(Pagamento p) {
        Agendamento a = p.getAgendamento();
        p.setStatus(StatusPagamento.APROVADO);
        p.setPagoEm(LocalDateTime.now(clock));
        a.setStatus(StatusAgendamento.CONFIRMADO);
        a.setExpiraEm(null);
        notificacoes.confirmacao(a);
    }

    private boolean expirado(Agendamento a) {
        return a.getExpiraEm() != null && a.getExpiraEm().isBefore(LocalDateTime.now(clock));
    }
}

package br.com.uniesp.barbearia.dto;

import br.com.uniesp.barbearia.domain.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public final class AgendamentoDtos {

    private AgendamentoDtos() {}

    /** Horários livres de um barbeiro em um dia — RF004. */
    public record DisponibilidadeResponse(LocalDate data, Long barbeiroId, int duracaoMin,
                                          LocalDate disponivelAte, List<LocalTime> horarios) {}

    /** Itens do carrinho + profissional + horário escolhido. */
    public record NovoAgendamentoRequest(
            @NotEmpty List<Long> servicosIds,
            @NotNull Long barbeiroId,
            @NotNull @Future LocalDateTime inicio,
            @Size(max = 255) String observacao) {}

    public record ItemResponse(Long servicoId, String nome, BigDecimal preco, Integer duracaoMin) {
        static ItemResponse de(AgendamentoItem i) {
            return new ItemResponse(i.getServico().getId(), i.getNomeServico(), i.getPreco(), i.getDuracaoMin());
        }
    }

    /** Resumo do agendamento — RF008 (e linha da agenda, RF013). */
    public record AgendamentoResponse(
            Long id, StatusAgendamento status,
            LocalDateTime inicio, LocalDateTime fim, int duracaoMin,
            Long barbeiroId, String barbeiroNome,
            Long clienteId, String clienteNome, String clienteTelefone,
            List<ItemResponse> itens,
            BigDecimal valorServicos, BigDecimal desconto, BigDecimal valorTotal,
            BigDecimal taxaAgendamento, BigDecimal restanteNoLocal,
            LocalDateTime expiraEm, String observacao) {

        public static AgendamentoResponse de(Agendamento a) {
            return new AgendamentoResponse(
                    a.getId(), a.getStatus(), a.getInicio(), a.getFim(), a.getDuracaoMin(),
                    a.getBarbeiro().getId(), a.getBarbeiro().getNome(),
                    a.getCliente().getId(), a.getCliente().getNome(), a.getCliente().getTelefone(),
                    a.getItens().stream().map(ItemResponse::de).toList(),
                    a.getValorServicos(), a.getDesconto(), a.getValorTotal(),
                    a.getTaxaAgendamento(), a.getValorTotal().subtract(a.getTaxaAgendamento()).max(BigDecimal.ZERO),
                    a.getExpiraEm(), a.getObservacao());
        }
    }

    public record AlterarStatusRequest(@NotNull StatusAgendamento status) {}

    // ---------- Pagamento da taxa — RF009 / RF010 ----------
    public record PagamentoRequest(
            @NotNull MetodoPagamento metodo,
            /** Para cartão: token gerado pelo SDK do gateway no navegador (nunca o número do cartão). */
            String tokenCartao) {}

    public record PagamentoResponse(Long id, Long agendamentoId, MetodoPagamento metodo, BigDecimal valor,
                                    StatusPagamento status, String pixCopiaCola, LocalDateTime pagoEm,
                                    StatusAgendamento statusAgendamento) {
        public static PagamentoResponse de(Pagamento p) {
            return new PagamentoResponse(p.getId(), p.getAgendamento().getId(), p.getMetodo(), p.getValor(),
                    p.getStatus(), p.getPixCopiaCola(), p.getPagoEm(), p.getAgendamento().getStatus());
        }
    }
}

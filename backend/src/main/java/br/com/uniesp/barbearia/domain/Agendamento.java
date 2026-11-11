package br.com.uniesp.barbearia.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "agendamento")
@Getter @Setter
public class Agendamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "barbeiro_id")
    private Barbeiro barbeiro;

    private LocalDateTime inicio;
    private LocalDateTime fim;

    @Column(name = "valor_servicos")
    private BigDecimal valorServicos;

    private BigDecimal desconto = BigDecimal.ZERO;

    @Column(name = "valor_total")
    private BigDecimal valorTotal;

    @Column(name = "taxa_agendamento")
    private BigDecimal taxaAgendamento;

    @Enumerated(EnumType.STRING)
    private StatusAgendamento status = StatusAgendamento.PENDENTE_PAGAMENTO;

    @Column(name = "expira_em")
    private LocalDateTime expiraEm;

    private String observacao;

    @Column(name = "lembrete_enviado_em")
    private LocalDateTime lembreteEnviadoEm;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm = LocalDateTime.now();

    @OneToMany(mappedBy = "agendamento", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<AgendamentoItem> itens = new ArrayList<>();

    @PreUpdate
    void aoAtualizar() {
        atualizadoEm = LocalDateTime.now();
    }

    public void adicionarItem(Servico servico) {
        AgendamentoItem item = new AgendamentoItem();
        item.setAgendamento(this);
        item.setServico(servico);
        item.setNomeServico(servico.getNome());
        item.setPreco(servico.getPreco());
        item.setDuracaoMin(servico.getDuracaoMin());
        itens.add(item);
    }

    public int getDuracaoMin() {
        return (int) java.time.Duration.between(inicio, fim).toMinutes();
    }
}

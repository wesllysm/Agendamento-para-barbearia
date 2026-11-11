package br.com.uniesp.barbearia.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "agendamento_item")
@Getter @Setter
public class AgendamentoItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agendamento_id")
    private Agendamento agendamento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "servico_id")
    private Servico servico;

    @Column(name = "nome_servico")
    private String nomeServico;

    private BigDecimal preco;

    @Column(name = "duracao_min")
    private Integer duracaoMin;
}

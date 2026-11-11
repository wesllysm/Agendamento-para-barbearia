package br.com.uniesp.barbearia.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Representa a classe FormaPagamento do diagrama: pagamento da taxa de agendamento. */
@Entity
@Table(name = "pagamento")
@Getter @Setter
public class Pagamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agendamento_id")
    private Agendamento agendamento;

    @Enumerated(EnumType.STRING)
    private MetodoPagamento metodo;

    private BigDecimal valor;

    @Enumerated(EnumType.STRING)
    private StatusPagamento status = StatusPagamento.PENDENTE;

    @Column(name = "codigo_transacao")
    private String codigoTransacao;

    @Column(name = "pix_copia_cola", columnDefinition = "text")
    private String pixCopiaCola;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column(name = "pago_em")
    private LocalDateTime pagoEm;
}

package br.com.uniesp.barbearia.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "notificacao")
@Getter @Setter
public class Notificacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id")
    private Agendamento agendamento;

    @Enumerated(EnumType.STRING)
    private CanalNotificacao canal;

    @Enumerated(EnumType.STRING)
    private TipoNotificacao tipo;

    @Column(columnDefinition = "text")
    private String mensagem;

    @Enumerated(EnumType.STRING)
    private StatusNotificacao status = StatusNotificacao.PENDENTE;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column(name = "enviada_em")
    private LocalDateTime enviadaEm;
}

package br.com.uniesp.barbearia.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "token_recuperacao_senha")
@Getter @Setter
public class TokenRecuperacaoSenha {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @Column(name = "token_hash")
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    private CanalNotificacao canal;

    @Column(name = "expira_em")
    private LocalDateTime expiraEm;

    @Column(name = "usado_em")
    private LocalDateTime usadoEm;
}

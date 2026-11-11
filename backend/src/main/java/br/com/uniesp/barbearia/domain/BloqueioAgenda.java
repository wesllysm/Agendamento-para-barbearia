package br.com.uniesp.barbearia.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "bloqueio_agenda")
@Getter @Setter
public class BloqueioAgenda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "barbeiro_id")
    private Barbeiro barbeiro;

    private LocalDateTime inicio;
    private LocalDateTime fim;
    private String motivo;
}

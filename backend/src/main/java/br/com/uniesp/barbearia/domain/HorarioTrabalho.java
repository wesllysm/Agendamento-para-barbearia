package br.com.uniesp.barbearia.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalTime;

@Entity
@Table(name = "horario_trabalho")
@Getter @Setter
public class HorarioTrabalho {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "barbeiro_id")
    private Barbeiro barbeiro;

    /** ISO-8601: 1 = segunda ... 7 = domingo (igual a DayOfWeek.getValue()). */
    @Column(name = "dia_semana")
    private Short diaSemana;

    @Column(name = "hora_inicio")
    private LocalTime horaInicio;

    @Column(name = "hora_fim")
    private LocalTime horaFim;
}

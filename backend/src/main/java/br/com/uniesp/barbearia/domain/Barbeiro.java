package br.com.uniesp.barbearia.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "barbeiro")
@Getter @Setter
public class Barbeiro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    private String telefone;
    private String especialidade;
    private boolean ativo = true;

    /** Serviços que o barbeiro realiza (tabela barbeiro_servico). */
    @ManyToMany
    @JoinTable(name = "barbeiro_servico",
            joinColumns = @JoinColumn(name = "barbeiro_id"),
            inverseJoinColumns = @JoinColumn(name = "servico_id"))
    private Set<Servico> servicos = new HashSet<>();

    @OneToMany(mappedBy = "barbeiro", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("diaSemana ASC, horaInicio ASC")
    private List<HorarioTrabalho> horarios = new ArrayList<>();

    public boolean realiza(Servico servico) {
        return servicos.stream().anyMatch(s -> s.getId().equals(servico.getId()));
    }
}

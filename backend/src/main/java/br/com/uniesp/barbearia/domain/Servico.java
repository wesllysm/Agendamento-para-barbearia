package br.com.uniesp.barbearia.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "servico")
@Getter @Setter
public class Servico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    private String descricao;
    private BigDecimal preco;

    @Column(name = "duracao_min")
    private Integer duracaoMin;

    @Enumerated(EnumType.STRING)
    private TipoServico tipo = TipoServico.SERVICO;

    private boolean ativo = true;

    /** Para combos: serviços que compõem o pacote (tabela combo_item). */
    @ManyToMany
    @JoinTable(name = "combo_item",
            joinColumns = @JoinColumn(name = "combo_id"),
            inverseJoinColumns = @JoinColumn(name = "servico_id"))
    private Set<Servico> itens = new HashSet<>();
}

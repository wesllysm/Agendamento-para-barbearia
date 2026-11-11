package br.com.uniesp.barbearia.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cliente")
@Getter @Setter
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    private String cpf;

    @Column(name = "data_nascimento")
    private LocalDate dataNascimento;

    private String email;
    private String telefone;

    @Column(name = "senha_hash")
    private String senhaHash;

    @Column(name = "aceita_promocoes")
    private boolean aceitaPromocoes = true;

    private boolean ativo = true;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;

    public boolean fazAniversarioNoMes(int mes) {
        return dataNascimento != null && dataNascimento.getMonthValue() == mes;
    }
}

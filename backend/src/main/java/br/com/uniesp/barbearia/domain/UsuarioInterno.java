package br.com.uniesp.barbearia.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "usuario_interno")
@Getter @Setter
public class UsuarioInterno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    private String email;
    private String telefone;

    @Column(name = "senha_hash")
    private String senhaHash;

    @Enumerated(EnumType.STRING)
    private Perfil perfil;

    private boolean ativo = true;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;
}

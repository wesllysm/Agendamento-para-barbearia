package br.com.uniesp.barbearia.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "configuracao")
@Getter @Setter
public class Configuracao {

    @Id
    private String chave;
    private String valor;
    private String descricao;
}

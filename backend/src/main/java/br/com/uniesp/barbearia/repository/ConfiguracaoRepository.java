package br.com.uniesp.barbearia.repository;

import br.com.uniesp.barbearia.domain.Configuracao;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfiguracaoRepository extends JpaRepository<Configuracao, String> {
}

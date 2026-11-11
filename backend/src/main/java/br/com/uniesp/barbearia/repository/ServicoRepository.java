package br.com.uniesp.barbearia.repository;

import br.com.uniesp.barbearia.domain.Servico;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServicoRepository extends JpaRepository<Servico, Long> {
    List<Servico> findByAtivoTrueOrderByTipoAscNomeAsc();
    List<Servico> findAllByOrderByTipoAscNomeAsc();
    boolean existsByNomeIgnoreCase(String nome);
    boolean existsByNomeIgnoreCaseAndIdNot(String nome, Long id);
}

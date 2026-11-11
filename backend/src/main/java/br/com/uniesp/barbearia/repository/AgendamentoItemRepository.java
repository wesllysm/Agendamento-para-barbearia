package br.com.uniesp.barbearia.repository;

import br.com.uniesp.barbearia.domain.AgendamentoItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgendamentoItemRepository extends JpaRepository<AgendamentoItem, Long> {
    boolean existsByServicoId(Long servicoId);
}

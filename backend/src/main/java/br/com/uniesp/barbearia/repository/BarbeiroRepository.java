package br.com.uniesp.barbearia.repository;

import br.com.uniesp.barbearia.domain.Barbeiro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface BarbeiroRepository extends JpaRepository<Barbeiro, Long> {

    List<Barbeiro> findByAtivoTrueOrderByNome();

    List<Barbeiro> findAllByOrderByAtivoDescNomeAsc();

    /** Barbeiros ativos que realizam TODOS os serviços informados. */
    @Query("""
           select b from Barbeiro b
            where b.ativo = true
              and (select count(distinct s.id) from Barbeiro b2 join b2.servicos s
                    where b2.id = b.id and s.id in :servicoIds) = :quantidade
            order by b.nome
           """)
    List<Barbeiro> findAptos(@Param("servicoIds") Collection<Long> servicoIds,
                             @Param("quantidade") long quantidade);
}

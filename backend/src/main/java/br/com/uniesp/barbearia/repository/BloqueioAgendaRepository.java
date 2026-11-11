package br.com.uniesp.barbearia.repository;

import br.com.uniesp.barbearia.domain.BloqueioAgenda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface BloqueioAgendaRepository extends JpaRepository<BloqueioAgenda, Long> {

    @Query("""
           select b from BloqueioAgenda b
            where b.barbeiro.id = :barbeiroId and b.inicio < :ate and b.fim > :de
           """)
    List<BloqueioAgenda> noPeriodo(@Param("barbeiroId") Long barbeiroId,
                                   @Param("de") LocalDateTime de,
                                   @Param("ate") LocalDateTime ate);
}

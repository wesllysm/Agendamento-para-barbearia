package br.com.uniesp.barbearia.repository;

import br.com.uniesp.barbearia.domain.Pagamento;
import br.com.uniesp.barbearia.domain.StatusPagamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface PagamentoRepository extends JpaRepository<Pagamento, Long> {

    List<Pagamento> findByAgendamentoIdOrderByIdDesc(Long agendamentoId);

    boolean existsByAgendamentoIdAndStatus(Long agendamentoId, StatusPagamento status);

    @Query("""
           select coalesce(sum(p.valor), 0) from Pagamento p
            where p.status = br.com.uniesp.barbearia.domain.StatusPagamento.APROVADO
              and p.pagoEm >= :de and p.pagoEm < :ate
           """)
    BigDecimal totalTaxasRecebidas(@Param("de") LocalDateTime de, @Param("ate") LocalDateTime ate);

    /** [metodo, quantidade, total] dos pagamentos aprovados no período. */
    @Query("""
           select p.metodo, count(p), sum(p.valor) from Pagamento p
            where p.status = br.com.uniesp.barbearia.domain.StatusPagamento.APROVADO
              and p.pagoEm >= :de and p.pagoEm < :ate
            group by p.metodo
           """)
    List<Object[]> porMetodo(@Param("de") LocalDateTime de, @Param("ate") LocalDateTime ate);
}

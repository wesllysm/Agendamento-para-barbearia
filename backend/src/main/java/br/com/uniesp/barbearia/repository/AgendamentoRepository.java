package br.com.uniesp.barbearia.repository;

import br.com.uniesp.barbearia.domain.Agendamento;
import br.com.uniesp.barbearia.domain.StatusAgendamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {

    /** Agendamentos que ocupam o horário do barbeiro no intervalo [de, ate). */
    @Query("""
           select a from Agendamento a
            where a.barbeiro.id = :barbeiroId
              and a.status in :status
              and a.inicio < :ate and a.fim > :de
           """)
    List<Agendamento> ocupandoHorario(@Param("barbeiroId") Long barbeiroId,
                                      @Param("de") LocalDateTime de,
                                      @Param("ate") LocalDateTime ate,
                                      @Param("status") Collection<StatusAgendamento> status);

    @Query("""
           select distinct a from Agendamento a
             join fetch a.cliente join fetch a.barbeiro left join fetch a.itens
            where a.cliente.id = :clienteId
            order by a.inicio desc
           """)
    List<Agendamento> doCliente(@Param("clienteId") Long clienteId);

    /** Agenda geral ou filtrada por barbeiro/status — RF013. */
    @Query("""
           select distinct a from Agendamento a
             join fetch a.cliente join fetch a.barbeiro left join fetch a.itens
            where a.inicio >= :de and a.inicio < :ate
              and (:barbeiroId is null or a.barbeiro.id = :barbeiroId)
              and (:status is null or a.status = :status)
            order by a.inicio
           """)
    List<Agendamento> agenda(@Param("de") LocalDateTime de,
                             @Param("ate") LocalDateTime ate,
                             @Param("barbeiroId") Long barbeiroId,
                             @Param("status") StatusAgendamento status);

    List<Agendamento> findByStatusAndExpiraEmBefore(StatusAgendamento status, LocalDateTime limite);

    /** Candidatos ao lembrete do WhatsApp — RF011. */
    @Query("""
           select a from Agendamento a join fetch a.cliente join fetch a.barbeiro
            where a.status = br.com.uniesp.barbearia.domain.StatusAgendamento.CONFIRMADO
              and a.lembreteEnviadoEm is null
              and a.inicio > :agora and a.inicio <= :limite
           """)
    List<Agendamento> paraLembrete(@Param("agora") LocalDateTime agora,
                                   @Param("limite") LocalDateTime limite);

    /** Concluídos no período, para financeiro e relatórios. */
    @Query("""
           select distinct a from Agendamento a
             join fetch a.barbeiro left join fetch a.itens
            where a.inicio >= :de and a.inicio < :ate
           """)
    List<Agendamento> noPeriodo(@Param("de") LocalDateTime de, @Param("ate") LocalDateTime ate);

    /** Estatísticas de assiduidade por cliente: [clienteId, concluidos, faltas, ultimoAtendimento]. */
    @Query("""
           select a.cliente.id,
                  sum(case when a.status = br.com.uniesp.barbearia.domain.StatusAgendamento.CONCLUIDO then 1 else 0 end),
                  sum(case when a.status = br.com.uniesp.barbearia.domain.StatusAgendamento.NAO_COMPARECEU then 1 else 0 end),
                  max(case when a.status = br.com.uniesp.barbearia.domain.StatusAgendamento.CONCLUIDO then a.inicio else null end)
             from Agendamento a
            group by a.cliente.id
           """)
    List<Object[]> assiduidadePorCliente();
}

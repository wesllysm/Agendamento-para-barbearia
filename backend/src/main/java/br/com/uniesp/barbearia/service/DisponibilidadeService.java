package br.com.uniesp.barbearia.service;

import br.com.uniesp.barbearia.domain.*;
import br.com.uniesp.barbearia.exception.RegraNegocioException;
import br.com.uniesp.barbearia.repository.AgendamentoRepository;
import br.com.uniesp.barbearia.repository.BloqueioAgendaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

/**
 * RF004 — calcula os horários livres.
 * Um horário é livre quando [inicio, inicio + duração) cabe dentro de uma faixa de expediente,
 * está no futuro, dentro da janela mensal e não cruza agendamentos ativos nem bloqueios.
 */
@Service
public class DisponibilidadeService {

    private final AgendamentoRepository agendamentos;
    private final BloqueioAgendaRepository bloqueios;
    private final ConfiguracaoService config;
    private final Clock clock;

    public DisponibilidadeService(AgendamentoRepository agendamentos, BloqueioAgendaRepository bloqueios,
                                  ConfiguracaoService config, Clock clock) {
        this.agendamentos = agendamentos;
        this.bloqueios = bloqueios;
        this.config = config;
        this.clock = clock;
    }

    /**
     * Agenda mensal: o cliente pode marcar até o fim do mês corrente.
     * No último dia do mês, as datas do mês seguinte são liberadas.
     */
    public LocalDate disponivelAte() {
        LocalDate hoje = LocalDate.now(clock);
        LocalDate fimDoMes = hoje.with(TemporalAdjusters.lastDayOfMonth());
        return hoje.equals(fimDoMes) ? hoje.plusMonths(1).with(TemporalAdjusters.lastDayOfMonth()) : fimDoMes;
    }

    @Transactional(readOnly = true)
    public List<LocalTime> horariosLivres(Barbeiro barbeiro, LocalDate data, int duracaoMin) {
        LocalDate hoje = LocalDate.now(clock);
        if (data.isBefore(hoje) || data.isAfter(disponivelAte()) || !barbeiro.isAtivo()) return List.of();

        int passo = config.inteiro(ConfiguracaoService.INTERVALO_SLOT_MIN, 30);
        LocalDateTime agora = LocalDateTime.now(clock);
        LocalDateTime iniDia = data.atStartOfDay();
        LocalDateTime fimDia = iniDia.plusDays(1);

        List<Agendamento> ocupados = agendamentos.ocupandoHorario(barbeiro.getId(), iniDia, fimDia,
                StatusAgendamento.OCUPAM_HORARIO);
        List<BloqueioAgenda> bloqs = bloqueios.noPeriodo(barbeiro.getId(), iniDia, fimDia);
        short dia = (short) data.getDayOfWeek().getValue();

        List<LocalTime> livres = new ArrayList<>();
        for (HorarioTrabalho faixa : barbeiro.getHorarios()) {
            if (faixa.getDiaSemana() != dia) continue;
            LocalDateTime cursor = data.atTime(faixa.getHoraInicio());
            LocalDateTime limite = data.atTime(faixa.getHoraFim());
            while (!cursor.plusMinutes(duracaoMin).isAfter(limite)) {
                LocalDateTime fim = cursor.plusMinutes(duracaoMin);
                if (cursor.isAfter(agora) && livre(cursor, fim, ocupados, bloqs, agora)) {
                    livres.add(cursor.toLocalTime());
                }
                cursor = cursor.plusMinutes(passo);
            }
        }
        livres.sort(null);
        return livres;
    }

    /** Validação usada no momento de gravar o agendamento. */
    public void validarHorario(Barbeiro barbeiro, LocalDateTime inicio, int duracaoMin) {
        if (!horariosLivres(barbeiro, inicio.toLocalDate(), duracaoMin).contains(inicio.toLocalTime())) {
            throw RegraNegocioException.conflito("Horário indisponível para este profissional. Escolha outro horário.");
        }
    }

    private static boolean livre(LocalDateTime ini, LocalDateTime fim, List<Agendamento> ocupados,
                                 List<BloqueioAgenda> bloqs, LocalDateTime agora) {
        for (Agendamento a : ocupados) {
            // pré-reserva vencida não segura mais o horário (o job a marcará como EXPIRADO)
            boolean expirada = a.getStatus() == StatusAgendamento.PENDENTE_PAGAMENTO
                    && a.getExpiraEm() != null && a.getExpiraEm().isBefore(agora);
            if (!expirada && a.getInicio().isBefore(fim) && a.getFim().isAfter(ini)) return false;
        }
        for (BloqueioAgenda b : bloqs) {
            if (b.getInicio().isBefore(fim) && b.getFim().isAfter(ini)) return false;
        }
        return true;
    }
}

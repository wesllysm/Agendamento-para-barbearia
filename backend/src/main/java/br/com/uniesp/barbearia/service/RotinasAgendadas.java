package br.com.uniesp.barbearia.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Jobs automáticos: libera pré-reservas não pagas e dispara lembretes de WhatsApp (RF011). */
@Component
public class RotinasAgendadas {

    private static final Logger log = LoggerFactory.getLogger(RotinasAgendadas.class);

    private final AgendamentoService agendamentos;

    public RotinasAgendadas(AgendamentoService agendamentos) {
        this.agendamentos = agendamentos;
    }

    @Scheduled(fixedDelayString = "PT1M", initialDelayString = "PT20S")
    public void executar() {
        try {
            agendamentos.liberarPreReservasVencidas();
            int n = agendamentos.enviarLembretes();
            if (n > 0) log.info("{} lembrete(s) enviado(s).", n);
        } catch (RuntimeException e) {
            log.error("Falha nas rotinas agendadas", e);
        }
    }
}

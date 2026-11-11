package br.com.uniesp.barbearia.service;

import br.com.uniesp.barbearia.domain.*;
import br.com.uniesp.barbearia.integracao.GatewayMensagens;
import br.com.uniesp.barbearia.repository.NotificacaoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Registra e envia mensagens — confirmação (RF010), lembrete (RF011) e comunicações (RF016). */
@Service
public class NotificacaoService {

    private static final Logger log = LoggerFactory.getLogger(NotificacaoService.class);
    public static final DateTimeFormatter DATA_HORA =
            DateTimeFormatter.ofPattern("EEEE, dd/MM 'às' HH:mm", Locale.forLanguageTag("pt-BR"));

    private final NotificacaoRepository repo;
    private final GatewayMensagens gateway;
    private final Clock clock;

    public NotificacaoService(NotificacaoRepository repo, GatewayMensagens gateway, Clock clock) {
        this.repo = repo;
        this.gateway = gateway;
        this.clock = clock;
    }

    @Transactional
    public boolean enviar(Cliente cliente, Agendamento agendamento, CanalNotificacao canal,
                          TipoNotificacao tipo, String mensagem) {
        Notificacao n = new Notificacao();
        n.setCliente(cliente);
        n.setAgendamento(agendamento);
        n.setCanal(canal);
        n.setTipo(tipo);
        n.setMensagem(mensagem);
        String destino = canal == CanalNotificacao.WHATSAPP ? cliente.getTelefone() : cliente.getEmail();
        boolean ok;
        try {
            ok = gateway.enviar(canal, destino, mensagem);
        } catch (RuntimeException e) {
            log.warn("Falha ao enviar {} para cliente {}: {}", canal, cliente.getId(), e.getMessage());
            ok = false;
        }
        n.setStatus(ok ? StatusNotificacao.ENVIADA : StatusNotificacao.FALHA);
        n.setEnviadaEm(ok ? LocalDateTime.now(clock) : null);
        repo.save(n);
        return ok;
    }

    public void confirmacao(Agendamento a) {
        enviar(a.getCliente(), a, CanalNotificacao.WHATSAPP, TipoNotificacao.CONFIRMACAO,
                "Olá, %s! Seu horário com %s está confirmado para %s. Até lá! ✂️"
                        .formatted(primeiroNome(a.getCliente()), a.getBarbeiro().getNome(), a.getInicio().format(DATA_HORA)));
    }

    public boolean lembrete(Agendamento a) {
        return enviar(a.getCliente(), a, CanalNotificacao.WHATSAPP, TipoNotificacao.LEMBRETE,
                "Lembrete: %s, você tem horário hoje às %s com %s. Se não puder vir, avise por aqui."
                        .formatted(primeiroNome(a.getCliente()),
                                a.getInicio().format(DateTimeFormatter.ofPattern("HH:mm")), a.getBarbeiro().getNome()));
    }

    private static String primeiroNome(Cliente c) {
        return c.getNome().trim().split("\\s+")[0];
    }
}

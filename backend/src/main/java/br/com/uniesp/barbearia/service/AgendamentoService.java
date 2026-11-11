package br.com.uniesp.barbearia.service;

import br.com.uniesp.barbearia.domain.*;
import br.com.uniesp.barbearia.dto.AgendamentoDtos.*;
import br.com.uniesp.barbearia.exception.RegraNegocioException;
import br.com.uniesp.barbearia.repository.AgendamentoRepository;
import br.com.uniesp.barbearia.repository.ClienteRepository;
import br.com.uniesp.barbearia.repository.ServicoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AgendamentoService {

    private static final Logger log = LoggerFactory.getLogger(AgendamentoService.class);

    private final AgendamentoRepository agendamentos;
    private final ClienteRepository clientes;
    private final ServicoRepository servicos;
    private final CatalogoService catalogo;
    private final DisponibilidadeService disponibilidade;
    private final ConfiguracaoService config;
    private final NotificacaoService notificacoes;
    private final Clock clock;

    public AgendamentoService(AgendamentoRepository agendamentos, ClienteRepository clientes,
                              ServicoRepository servicos, CatalogoService catalogo,
                              DisponibilidadeService disponibilidade, ConfiguracaoService config,
                              NotificacaoService notificacoes, Clock clock) {
        this.agendamentos = agendamentos;
        this.clientes = clientes;
        this.servicos = servicos;
        this.catalogo = catalogo;
        this.disponibilidade = disponibilidade;
        this.config = config;
        this.notificacoes = notificacoes;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ RF004
    @Transactional(readOnly = true)
    public DisponibilidadeResponse disponibilidade(Long barbeiroId, LocalDate data, List<Long> servicosIds) {
        Barbeiro b = catalogo.barbeiro(barbeiroId);
        int duracao = carregarServicos(servicosIds, b).stream().mapToInt(Servico::getDuracaoMin).sum();
        return new DisponibilidadeResponse(data, barbeiroId, duracao, disponibilidade.disponivelAte(),
                disponibilidade.horariosLivres(b, data, duracao));
    }

    // ------------------------------------------------------- RF002/3/4/7/8
    /**
     * Cria a pré-reserva com status PENDENTE_PAGAMENTO. O horário fica segurado por alguns minutos
     * até o pagamento da taxa (RF009). A constraint EXCLUDE do banco garante o RNF002 mesmo com
     * dois clientes clicando ao mesmo tempo.
     */
    @Transactional
    public AgendamentoResponse criar(Long clienteId, NovoAgendamentoRequest req) {
        Cliente cliente = clientes.findById(clienteId).orElseThrow(() -> RegraNegocioException.naoEncontrado("Cliente"));
        Barbeiro barbeiro = catalogo.barbeiro(req.barbeiroId());
        List<Servico> lista = carregarServicos(req.servicosIds(), barbeiro);
        int duracao = lista.stream().mapToInt(Servico::getDuracaoMin).sum();
        LocalDateTime inicio = req.inicio().withSecond(0).withNano(0);

        liberarPreReservasVencidas();
        disponibilidade.validarHorario(barbeiro, inicio, duracao);

        BigDecimal valorServicos = lista.stream().map(Servico::getPreco).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal desconto = BigDecimal.ZERO;
        if (cliente.fazAniversarioNoMes(inicio.getMonthValue())) {
            BigDecimal pct = config.decimal(ConfiguracaoService.DESCONTO_ANIVERSARIO_PCT, "0");
            desconto = valorServicos.multiply(pct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }

        Agendamento a = new Agendamento();
        a.setCliente(cliente);
        a.setBarbeiro(barbeiro);
        a.setInicio(inicio);
        a.setFim(inicio.plusMinutes(duracao));
        a.setValorServicos(valorServicos);
        a.setDesconto(desconto);
        a.setValorTotal(valorServicos.subtract(desconto));
        a.setTaxaAgendamento(config.decimal(ConfiguracaoService.TAXA_AGENDAMENTO, "10.00").min(a.getValorTotal()));
        a.setStatus(StatusAgendamento.PENDENTE_PAGAMENTO);
        a.setExpiraEm(LocalDateTime.now(clock).plusMinutes(config.inteiro(ConfiguracaoService.PAGAMENTO_EXPIRA_MIN, 15)));
        a.setObservacao(req.observacao());
        lista.forEach(a::adicionarItem);

        agendamentos.saveAndFlush(a); // flush aqui para a constraint do banco disparar dentro do try do handler
        return AgendamentoResponse.de(a);
    }

    @Transactional(readOnly = true)
    public List<AgendamentoResponse> doCliente(Long clienteId) {
        return agendamentos.doCliente(clienteId).stream().map(AgendamentoResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public AgendamentoResponse detalheDoCliente(Long clienteId, Long agendamentoId) {
        return AgendamentoResponse.de(doClienteOuErro(clienteId, agendamentoId));
    }

    @Transactional
    public AgendamentoResponse cancelarPeloCliente(Long clienteId, Long agendamentoId) {
        Agendamento a = doClienteOuErro(clienteId, agendamentoId);
        if (a.getStatus() != StatusAgendamento.PENDENTE_PAGAMENTO && a.getStatus() != StatusAgendamento.CONFIRMADO)
            throw new RegraNegocioException("Este agendamento não pode mais ser cancelado.");
        if (!a.getInicio().isAfter(LocalDateTime.now(clock)))
            throw new RegraNegocioException("O horário já passou.");
        a.setStatus(StatusAgendamento.CANCELADO);
        return AgendamentoResponse.de(a);
    }

    public Agendamento doClienteOuErro(Long clienteId, Long agendamentoId) {
        Agendamento a = agendamentos.findById(agendamentoId)
                .orElseThrow(() -> RegraNegocioException.naoEncontrado("Agendamento"));
        if (!a.getCliente().getId().equals(clienteId)) throw RegraNegocioException.naoEncontrado("Agendamento");
        return a;
    }

    // ------------------------------------------------------------- RF013
    @Transactional(readOnly = true)
    public List<AgendamentoResponse> agenda(LocalDate de, LocalDate ate, Long barbeiroId, StatusAgendamento status) {
        if (ate.isBefore(de)) throw new RegraNegocioException("Período inválido.");
        return agendamentos.agenda(de.atStartOfDay(), ate.plusDays(1).atStartOfDay(), barbeiroId, status)
                .stream().map(AgendamentoResponse::de).toList();
    }

    private static final Map<StatusAgendamento, Set<StatusAgendamento>> TRANSICOES = Map.of(
            StatusAgendamento.PENDENTE_PAGAMENTO, Set.of(StatusAgendamento.CANCELADO, StatusAgendamento.CONFIRMADO),
            StatusAgendamento.CONFIRMADO, Set.of(StatusAgendamento.CONCLUIDO, StatusAgendamento.NAO_COMPARECEU, StatusAgendamento.CANCELADO),
            StatusAgendamento.NAO_COMPARECEU, Set.of(StatusAgendamento.CONCLUIDO),
            StatusAgendamento.CONCLUIDO, Set.of(StatusAgendamento.CONFIRMADO));

    /** Funcionário/gestor conclui, marca falta ou cancela um atendimento. */
    @Transactional
    public AgendamentoResponse alterarStatus(Long id, StatusAgendamento novo) {
        Agendamento a = agendamentos.findById(id).orElseThrow(() -> RegraNegocioException.naoEncontrado("Agendamento"));
        if (!TRANSICOES.getOrDefault(a.getStatus(), Set.of()).contains(novo))
            throw new RegraNegocioException("Não é possível mudar de %s para %s.".formatted(a.getStatus(), novo));
        a.setStatus(novo);
        if (novo != StatusAgendamento.PENDENTE_PAGAMENTO) a.setExpiraEm(null);
        agendamentos.flush();
        return AgendamentoResponse.de(a);
    }

    // ------------------------------------------------------- Rotinas (jobs)
    @Transactional
    public int liberarPreReservasVencidas() {
        List<Agendamento> vencidos = agendamentos.findByStatusAndExpiraEmBefore(
                StatusAgendamento.PENDENTE_PAGAMENTO, LocalDateTime.now(clock));
        vencidos.forEach(a -> a.setStatus(StatusAgendamento.EXPIRADO));
        if (!vencidos.isEmpty()) {
            agendamentos.flush();
            log.info("{} pré-reserva(s) expirada(s) por falta de pagamento.", vencidos.size());
        }
        return vencidos.size();
    }

    /** RF011 — lembrete por WhatsApp N horas antes (padrão 4h). */
    @Transactional
    public int enviarLembretes() {
        LocalDateTime agora = LocalDateTime.now(clock);
        int horas = config.inteiro(ConfiguracaoService.LEMBRETE_HORAS_ANTES, 4);
        int enviados = 0;
        for (Agendamento a : agendamentos.paraLembrete(agora, agora.plusHours(horas))) {
            if (notificacoes.lembrete(a)) {
                a.setLembreteEnviadoEm(agora);
                enviados++;
            }
        }
        return enviados;
    }

    // ------------------------------------------------------------ apoio
    /** Valida o carrinho: serviços existentes, ativos, sem duplicidade e realizados pelo barbeiro. */
    private List<Servico> carregarServicos(List<Long> ids, Barbeiro barbeiro) {
        if (ids == null || ids.isEmpty()) throw new RegraNegocioException("Selecione ao menos um serviço.");
        Set<Long> unicos = new LinkedHashSet<>(ids);
        List<Servico> lista = servicos.findAllById(unicos);
        if (lista.size() != unicos.size()) throw RegraNegocioException.naoEncontrado("Serviço");
        for (Servico s : lista) {
            if (!s.isAtivo()) throw new RegraNegocioException("O serviço " + s.getNome() + " não está disponível.");
            if (!barbeiro.realiza(s))
                throw new RegraNegocioException(barbeiro.getNome() + " não realiza o serviço " + s.getNome() + ".");
        }
        // evita pagar duas vezes pelo mesmo serviço (ex.: "Combo 1" + "Barba")
        Set<Long> dentroDeCombos = new HashSet<>();
        lista.stream().filter(s -> s.getTipo() == TipoServico.COMBO)
                .forEach(c -> c.getItens().forEach(i -> dentroDeCombos.add(i.getId())));
        for (Servico s : lista) {
            if (dentroDeCombos.contains(s.getId()))
                throw new RegraNegocioException("O serviço " + s.getNome() + " já está incluído em um combo do carrinho.");
        }
        return lista;
    }
}

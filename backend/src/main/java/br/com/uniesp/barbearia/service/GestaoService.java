package br.com.uniesp.barbearia.service;

import br.com.uniesp.barbearia.domain.*;
import br.com.uniesp.barbearia.dto.GestaoDtos.*;
import br.com.uniesp.barbearia.exception.RegraNegocioException;
import br.com.uniesp.barbearia.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.TextStyle;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** RF012 usuários internos · RF015 financeiro · RF016 clientes e comunicações · RF017 relatório do mês. */
@Service
public class GestaoService {

    private final ClienteRepository clientes;
    private final AgendamentoRepository agendamentos;
    private final PagamentoRepository pagamentos;
    private final UsuarioInternoRepository internos;
    private final NotificacaoService notificacoes;
    private final PasswordEncoder encoder;
    private final Clock clock;

    public GestaoService(ClienteRepository clientes, AgendamentoRepository agendamentos,
                         PagamentoRepository pagamentos, UsuarioInternoRepository internos,
                         NotificacaoService notificacoes, PasswordEncoder encoder, Clock clock) {
        this.clientes = clientes;
        this.agendamentos = agendamentos;
        this.pagamentos = pagamentos;
        this.internos = internos;
        this.notificacoes = notificacoes;
        this.encoder = encoder;
        this.clock = clock;
    }

    // ============================== RF016 ==============================
    @Transactional(readOnly = true)
    public List<ClienteResumo> clientes(String busca) {
        Map<Long, Object[]> stats = agendamentos.assiduidadePorCliente().stream()
                .collect(Collectors.toMap(r -> (Long) r[0], Function.identity()));
        int mesAtual = LocalDate.now(clock).getMonthValue();
        List<Cliente> lista = (busca == null || busca.isBlank())
                ? clientes.findAllByOrderByNomeAsc()
                : clientes.pesquisar(busca.trim());
        return lista.stream().map(c -> {
            Object[] s = stats.get(c.getId());
            long atend = s == null ? 0 : ((Number) s[1]).longValue();
            long faltas = s == null ? 0 : ((Number) s[2]).longValue();
            LocalDateTime ultimo = s == null ? null : (LocalDateTime) s[3];
            return new ClienteResumo(c.getId(), c.getNome(), c.getEmail(), c.getTelefone(), c.getDataNascimento(),
                    c.isAceitaPromocoes(), atend, faltas, ultimo, c.fazAniversarioNoMes(mesAtual));
        }).toList();
    }

    /** Envio individual ou em massa. Promoções/campanhas respeitam quem não aceita promoções. */
    @Transactional
    public ComunicacaoResponse comunicar(ComunicacaoRequest req) {
        List<Cliente> destino;
        if (req.todos()) {
            destino = clientes.findAll().stream().filter(Cliente::isAtivo).toList();
        } else {
            if (req.clientesIds() == null || req.clientesIds().isEmpty())
                throw new RegraNegocioException("Selecione ao menos um cliente ou marque 'todos'.");
            destino = clientes.findAllById(req.clientesIds());
        }
        boolean marketing = req.tipo() == TipoNotificacao.PROMOCAO || req.tipo() == TipoNotificacao.CAMPANHA;
        if (marketing) destino = destino.stream().filter(Cliente::isAceitaPromocoes).toList();

        int ok = 0;
        for (Cliente c : destino) {
            String msg = req.mensagem().replace("{nome}", c.getNome().split("\\s+")[0]);
            if (notificacoes.enviar(c, null, req.canal(), req.tipo(), msg)) ok++;
        }
        return new ComunicacaoResponse(destino.size(), ok, destino.size() - ok);
    }

    // ============================== RF015 ==============================
    @Transactional(readOnly = true)
    public FinanceiroResponse financeiro(LocalDate de, LocalDate ate) {
        if (ate.isBefore(de)) throw new RegraNegocioException("Período inválido.");
        LocalDateTime ini = de.atStartOfDay(), fim = ate.plusDays(1).atStartOfDay();
        List<Agendamento> concluidos = agendamentos.noPeriodo(ini, fim).stream()
                .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO).toList();

        BigDecimal faturamento = soma(concluidos);
        return new FinanceiroResponse(de, ate, faturamento, pagamentos.totalTaxasRecebidas(ini, fim),
                media(faturamento, concluidos.size()), concluidos.size(),
                agrupar(concluidos, a -> a.getInicio().toLocalDate().toString(), false),
                porServico(concluidos),
                agrupar(concluidos, a -> a.getBarbeiro().getNome(), true),
                pagamentos.porMetodo(ini, fim).stream()
                        .map(r -> new LinhaValor(String.valueOf(r[0]), ((Number) r[1]).longValue(), (BigDecimal) r[2]))
                        .toList());
    }

    // ============================== RF017 ==============================
    @Transactional(readOnly = true)
    public RelatorioMensalResponse relatorioMensal(int ano, int mes) {
        YearMonth ym = YearMonth.of(ano, mes);
        LocalDateTime ini = ym.atDay(1).atStartOfDay(), fim = ym.plusMonths(1).atDay(1).atStartOfDay();
        List<Agendamento> todos = agendamentos.noPeriodo(ini, fim);
        List<Agendamento> concluidos = todos.stream().filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO).toList();

        Map<String, Long> porStatus = new LinkedHashMap<>();
        for (StatusAgendamento s : StatusAgendamento.values()) {
            porStatus.put(s.name(), todos.stream().filter(a -> a.getStatus() == s).count());
        }
        long faltas = porStatus.get(StatusAgendamento.NAO_COMPARECEU.name());
        double taxaFalta = (concluidos.size() + faltas) == 0 ? 0
                : Math.round(faltas * 1000.0 / (concluidos.size() + faltas)) / 10.0;

        BigDecimal faturamento = soma(concluidos);
        Locale br = Locale.forLanguageTag("pt-BR");
        List<LinhaValor> porDiaSemana = new ArrayList<>();
        for (DayOfWeek d : DayOfWeek.values()) {
            List<Agendamento> doDia = concluidos.stream().filter(a -> a.getInicio().getDayOfWeek() == d).toList();
            porDiaSemana.add(new LinhaValor(d.getDisplayName(TextStyle.SHORT, br), doDia.size(), soma(doDia)));
        }

        return new RelatorioMensalResponse(ano, mes, todos.size(), porStatus, concluidos.size(), faturamento,
                pagamentos.totalTaxasRecebidas(ini, fim),
                faturamento.subtract(concluidos.stream().map(Agendamento::getTaxaAgendamento).reduce(BigDecimal.ZERO, BigDecimal::add)),
                media(faturamento, concluidos.size()), taxaFalta,
                clientes.countByCriadoEmBetween(ini, fim),
                porServico(concluidos).stream().limit(10).toList(),
                agrupar(concluidos, a -> a.getBarbeiro().getNome(), true),
                porDiaSemana,
                agrupar(concluidos, a -> a.getInicio().toLocalDate().toString(), false));
    }

    // ============================== RF012 ==============================
    @Transactional(readOnly = true)
    public List<UsuarioInternoResponse> usuarios() {
        return internos.findAll().stream()
                .sorted(Comparator.comparing(UsuarioInterno::getNome))
                .map(this::resposta).toList();
    }

    @Transactional
    public UsuarioInternoResponse criarUsuario(UsuarioInternoRequest req) {
        if (req.senha() == null) throw new RegraNegocioException("Informe uma senha inicial.");
        if (internos.existsByEmailIgnoreCase(req.email())) throw RegraNegocioException.conflito("E-mail já cadastrado.");
        if (req.perfil() == Perfil.CLIENTE) throw new RegraNegocioException("Perfil inválido para usuário interno.");
        UsuarioInterno u = new UsuarioInterno();
        u.setNome(req.nome().trim());
        u.setEmail(req.email().trim().toLowerCase());
        u.setTelefone(req.telefone());
        u.setPerfil(req.perfil());
        u.setSenhaHash(encoder.encode(req.senha()));
        return resposta(internos.save(u));
    }

    @Transactional
    public UsuarioInternoResponse alterarAtivoUsuario(Long id, boolean ativo, Long idQuemAltera) {
        if (id.equals(idQuemAltera) && !ativo) throw new RegraNegocioException("Você não pode desativar o próprio acesso.");
        UsuarioInterno u = internos.findById(id).orElseThrow(() -> RegraNegocioException.naoEncontrado("Usuário"));
        u.setAtivo(ativo);
        return resposta(u);
    }

    // ============================== apoio ==============================
    private UsuarioInternoResponse resposta(UsuarioInterno u) {
        return new UsuarioInternoResponse(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(), u.getPerfil(), u.isAtivo());
    }

    private static BigDecimal soma(List<Agendamento> lista) {
        return lista.stream().map(Agendamento::getValorTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal media(BigDecimal total, int qtd) {
        return qtd == 0 ? BigDecimal.ZERO : total.divide(BigDecimal.valueOf(qtd), 2, RoundingMode.HALF_UP);
    }

    private static List<LinhaValor> agrupar(List<Agendamento> lista, Function<Agendamento, String> chave, boolean ordenarPorValor) {
        Map<String, List<Agendamento>> grupos = lista.stream()
                .collect(Collectors.groupingBy(chave, TreeMap::new, Collectors.toList()));
        List<LinhaValor> linhas = new ArrayList<>(grupos.entrySet().stream()
                .map(e -> new LinhaValor(e.getKey(), e.getValue().size(), soma(e.getValue()))).toList());
        if (ordenarPorValor) linhas.sort(Comparator.comparing(LinhaValor::valor).reversed());
        return linhas;
    }

    /** Receita por serviço usa o preço congelado em agendamento_item (rateando o desconto). */
    private static List<LinhaValor> porServico(List<Agendamento> lista) {
        Map<String, long[]> qtd = new TreeMap<>();
        Map<String, BigDecimal> valor = new TreeMap<>();
        for (Agendamento a : lista) {
            BigDecimal fator = a.getValorServicos().signum() == 0 ? BigDecimal.ONE
                    : a.getValorTotal().divide(a.getValorServicos(), 6, RoundingMode.HALF_UP);
            for (AgendamentoItem i : a.getItens()) {
                qtd.computeIfAbsent(i.getNomeServico(), k -> new long[1])[0]++;
                valor.merge(i.getNomeServico(), i.getPreco().multiply(fator).setScale(2, RoundingMode.HALF_UP), BigDecimal::add);
            }
        }
        return qtd.keySet().stream()
                .map(n -> new LinhaValor(n, qtd.get(n)[0], valor.get(n)))
                .sorted(Comparator.comparingLong(LinhaValor::quantidade).reversed())
                .toList();
    }
}

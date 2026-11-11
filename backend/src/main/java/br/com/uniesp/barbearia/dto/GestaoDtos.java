package br.com.uniesp.barbearia.dto;

import br.com.uniesp.barbearia.domain.CanalNotificacao;
import br.com.uniesp.barbearia.domain.Perfil;
import br.com.uniesp.barbearia.domain.TipoNotificacao;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class GestaoDtos {

    private GestaoDtos() {}

    // ---------- Clientes — RF016 ----------
    public record ClienteResumo(Long id, String nome, String email, String telefone, LocalDate dataNascimento,
                                boolean aceitaPromocoes, long atendimentos, long faltas,
                                LocalDateTime ultimoAtendimento, boolean aniversarianteDoMes) {}

    public record ComunicacaoRequest(
            /** Vazio ou nulo + todos=true → disparo em massa. */
            List<Long> clientesIds,
            boolean todos,
            @NotNull CanalNotificacao canal,
            @NotNull TipoNotificacao tipo,
            @NotBlank @Size(max = 1000) String mensagem) {}

    public record ComunicacaoResponse(int destinatarios, int enviadas, int falhas) {}

    // ---------- Financeiro — RF015 ----------
    public record LinhaValor(String rotulo, long quantidade, BigDecimal valor) {}

    public record FinanceiroResponse(LocalDate de, LocalDate ate,
                                     BigDecimal faturamento, BigDecimal taxasRecebidas, BigDecimal ticketMedio,
                                     long atendimentos,
                                     List<LinhaValor> porDia, List<LinhaValor> porServico,
                                     List<LinhaValor> porBarbeiro, List<LinhaValor> porMetodoPagamento) {}

    // ---------- Relatório mensal — RF017 ----------
    public record RelatorioMensalResponse(int ano, int mes,
                                          long totalAgendamentos, Map<String, Long> porStatus,
                                          long atendimentosRealizados, BigDecimal faturamento,
                                          BigDecimal taxasRecebidas, BigDecimal recebidoNoBalcao,
                                          BigDecimal ticketMedio, double taxaNaoComparecimentoPct, long novosClientes,
                                          List<LinhaValor> servicosMaisRealizados,
                                          List<LinhaValor> desempenhoPorBarbeiro,
                                          List<LinhaValor> movimentoPorDiaSemana,
                                          List<LinhaValor> porDia) {}

    // ---------- Usuários internos — RF012 ----------
    public record UsuarioInternoRequest(@NotBlank @Size(max = 120) String nome,
                                        @NotBlank @Email String email,
                                        @Size(max = 20) String telefone,
                                        @NotNull Perfil perfil,
                                        @Pattern(regexp = AuthDtos.REGEX_SENHA, message = AuthDtos.MSG_SENHA) String senha) {}

    public record UsuarioInternoResponse(Long id, String nome, String email, String telefone, Perfil perfil, boolean ativo) {}
}

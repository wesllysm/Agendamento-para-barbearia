package br.com.uniesp.barbearia.dto;

import br.com.uniesp.barbearia.domain.Barbeiro;
import br.com.uniesp.barbearia.domain.HorarioTrabalho;
import br.com.uniesp.barbearia.domain.Servico;
import br.com.uniesp.barbearia.domain.TipoServico;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

public final class CatalogoDtos {

    private CatalogoDtos() {}

    // ---------- Serviços ----------
    public record ServicoResponse(Long id, String nome, String descricao, BigDecimal preco,
                                  Integer duracaoMin, TipoServico tipo, boolean ativo,
                                  List<String> itens, BigDecimal economia) {
        public static ServicoResponse de(Servico s) {
            List<String> itens = s.getItens().stream().map(Servico::getNome).sorted().toList();
            BigDecimal economia = null;
            if (s.getTipo() == TipoServico.COMBO && !s.getItens().isEmpty()) {
                BigDecimal avulso = s.getItens().stream().map(Servico::getPreco).reduce(BigDecimal.ZERO, BigDecimal::add);
                economia = avulso.subtract(s.getPreco()).max(BigDecimal.ZERO);
            }
            return new ServicoResponse(s.getId(), s.getNome(), s.getDescricao(), s.getPreco(),
                    s.getDuracaoMin(), s.getTipo(), s.isAtivo(), itens, economia);
        }
    }

    public record ServicoRequest(
            @NotBlank @Size(max = 80) String nome,
            @Size(max = 255) String descricao,
            @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal preco,
            @NotNull @Min(5) @Max(480) Integer duracaoMin,
            @NotNull TipoServico tipo,
            Set<Long> itensIds,
            Boolean ativo) {}

    // ---------- Barbeiros ----------
    public record HorarioDto(@NotNull @Min(1) @Max(7) Short diaSemana,
                             @NotNull LocalTime horaInicio,
                             @NotNull LocalTime horaFim) {
        public static HorarioDto de(HorarioTrabalho h) {
            return new HorarioDto(h.getDiaSemana(), h.getHoraInicio(), h.getHoraFim());
        }
    }

    public record BarbeiroResponse(Long id, String nome, String telefone, String especialidade, boolean ativo,
                                   List<Long> servicosIds, List<HorarioDto> horarios) {
        public static BarbeiroResponse de(Barbeiro b) {
            return new BarbeiroResponse(b.getId(), b.getNome(), b.getTelefone(), b.getEspecialidade(), b.isAtivo(),
                    b.getServicos().stream().map(Servico::getId).sorted().toList(),
                    b.getHorarios().stream()
                            .sorted(Comparator.comparing(HorarioTrabalho::getDiaSemana).thenComparing(HorarioTrabalho::getHoraInicio))
                            .map(HorarioDto::de).toList());
        }
    }

    /** Versão pública (cliente), sem telefone. */
    public record BarbeiroPublico(Long id, String nome, String especialidade) {
        public static BarbeiroPublico de(Barbeiro b) {
            return new BarbeiroPublico(b.getId(), b.getNome(), b.getEspecialidade());
        }
    }

    public record BarbeiroRequest(
            @NotBlank @Size(max = 120) String nome,
            @Size(max = 20) String telefone,
            @Size(max = 120) String especialidade,
            Set<Long> servicosIds,
            List<@Valid HorarioDto> horarios,
            Boolean ativo) {}

    public record BloqueioRequest(@NotNull java.time.LocalDateTime inicio,
                                  @NotNull java.time.LocalDateTime fim,
                                  @Size(max = 120) String motivo) {}
}

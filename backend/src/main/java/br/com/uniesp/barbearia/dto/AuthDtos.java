package br.com.uniesp.barbearia.dto;

import br.com.uniesp.barbearia.domain.CanalNotificacao;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public final class AuthDtos {

    private AuthDtos() {}

    /** Regra do RF005: senha com no mínimo 8 caracteres, letra, número e caractere especial. */
    public static final String REGEX_SENHA = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,64}$";
    public static final String MSG_SENHA = "A senha precisa ter 8+ caracteres, com letra, número e caractere especial.";

    public record CadastroClienteRequest(
            @NotBlank @Size(max = 120) String nome,
            @NotBlank String cpf,
            @NotNull @Past LocalDate dataNascimento,
            @NotBlank @Email @Size(max = 160) String email,
            @NotBlank @Size(min = 10, max = 20) String telefone,
            @NotBlank @Pattern(regexp = REGEX_SENHA, message = MSG_SENHA) String senha,
            boolean aceitaPromocoes) {}

    /** "identificador" aceita e-mail ou telefone (RF006). */
    public record LoginRequest(@NotBlank String identificador, @NotBlank String senha) {}

    public record LoginResponse(String token, Long id, String nome, String perfil) {}

    public record EsqueciSenhaRequest(@NotBlank String identificador, @NotNull CanalNotificacao canal) {}

    public record RedefinirSenhaRequest(
            @NotBlank String identificador,
            @NotBlank @Pattern(regexp = "\\d{6}", message = "O código tem 6 dígitos.") String codigo,
            @NotBlank @Pattern(regexp = REGEX_SENHA, message = MSG_SENHA) String novaSenha) {}
}

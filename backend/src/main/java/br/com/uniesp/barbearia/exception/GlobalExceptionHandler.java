package br.com.uniesp.barbearia.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    public record Erro(LocalDateTime momento, int status, String mensagem, Map<String, String> campos) {}

    @ExceptionHandler(RegraNegocioException.class)
    ResponseEntity<Erro> regra(RegraNegocioException e) {
        return resposta(e.getStatus(), e.getMessage(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Erro> validacao(MethodArgumentNotValidException e) {
        Map<String, String> campos = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(f -> campos.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return resposta(HttpStatus.BAD_REQUEST, "Verifique os campos informados.", campos);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<Erro> formato(Exception e) {
        return resposta(HttpStatus.BAD_REQUEST, "Requisição em formato inválido.", null);
    }

    @ExceptionHandler(BadCredentialsException.class)
    ResponseEntity<Erro> credenciais(BadCredentialsException e) {
        return resposta(HttpStatus.UNAUTHORIZED, "Login ou senha inválidos.", null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<Erro> acesso(AccessDeniedException e) {
        return resposta(HttpStatus.FORBIDDEN, "Você não tem permissão para esta operação.", null);
    }

    /** Ex.: a constraint EXCLUDE do banco barrou um horário que acabou de ser ocupado (RNF002). */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Erro> integridade(DataIntegrityViolationException e) {
        String msg = String.valueOf(e.getMostSpecificCause().getMessage());
        if (msg.contains("ex_agendamento_sem_conflito")) {
            return resposta(HttpStatus.CONFLICT, "Este horário acabou de ser reservado. Escolha outro horário.", null);
        }
        log.warn("Violação de integridade: {}", msg);
        return resposta(HttpStatus.CONFLICT, "Os dados conflitam com um registro existente.", null);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Erro> generico(Exception e) {
        log.error("Erro inesperado", e);
        return resposta(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno. Tente novamente.", null);
    }

    private ResponseEntity<Erro> resposta(HttpStatus status, String mensagem, Map<String, String> campos) {
        return ResponseEntity.status(status).body(new Erro(LocalDateTime.now(), status.value(), mensagem, campos));
    }
}

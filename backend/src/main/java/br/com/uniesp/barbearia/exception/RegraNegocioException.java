package br.com.uniesp.barbearia.exception;

import org.springframework.http.HttpStatus;

/** Violação de regra de negócio. Por padrão vira HTTP 422. */
public class RegraNegocioException extends RuntimeException {

    private final HttpStatus status;

    public RegraNegocioException(String mensagem) {
        this(mensagem, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    public RegraNegocioException(String mensagem, HttpStatus status) {
        super(mensagem);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static RegraNegocioException naoEncontrado(String oque) {
        return new RegraNegocioException(oque + " não encontrado(a).", HttpStatus.NOT_FOUND);
    }

    public static RegraNegocioException conflito(String mensagem) {
        return new RegraNegocioException(mensagem, HttpStatus.CONFLICT);
    }

    public static RegraNegocioException proibido(String mensagem) {
        return new RegraNegocioException(mensagem, HttpStatus.FORBIDDEN);
    }
}

package br.com.uniesp.barbearia.repository;

import br.com.uniesp.barbearia.domain.TokenRecuperacaoSenha;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TokenRecuperacaoSenhaRepository extends JpaRepository<TokenRecuperacaoSenha, Long> {
    Optional<TokenRecuperacaoSenha> findByTokenHashAndUsadoEmIsNull(String tokenHash);
}

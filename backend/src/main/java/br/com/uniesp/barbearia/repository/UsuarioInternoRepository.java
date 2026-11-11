package br.com.uniesp.barbearia.repository;

import br.com.uniesp.barbearia.domain.Perfil;
import br.com.uniesp.barbearia.domain.UsuarioInterno;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioInternoRepository extends JpaRepository<UsuarioInterno, Long> {
    Optional<UsuarioInterno> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByPerfil(Perfil perfil);
}

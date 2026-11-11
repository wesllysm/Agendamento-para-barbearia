package br.com.uniesp.barbearia.repository;

import br.com.uniesp.barbearia.domain.Notificacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificacaoRepository extends JpaRepository<Notificacao, Long> {
    List<Notificacao> findTop50ByOrderByIdDesc();
}

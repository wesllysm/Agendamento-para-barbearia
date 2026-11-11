package br.com.uniesp.barbearia.repository;

import br.com.uniesp.barbearia.domain.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    boolean existsByCpf(String cpf);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByTelefone(String telefone);

    @Query("select c from Cliente c where lower(c.email) = lower(:id) or c.telefone = :id")
    Optional<Cliente> buscarPorEmailOuTelefone(@Param("id") String identificador);

    @Query("""
           select c from Cliente c
            where lower(c.nome) like lower(concat('%', :busca, '%'))
               or c.telefone like concat('%', :busca, '%')
               or c.cpf like concat('%', :busca, '%')
            order by c.nome
           """)
    List<Cliente> pesquisar(@Param("busca") String busca);

    List<Cliente> findAllByOrderByNomeAsc();

    long countByCriadoEmBetween(LocalDateTime de, LocalDateTime ate);

    List<Cliente> findByAtivoTrueAndAceitaPromocoesTrue();
}

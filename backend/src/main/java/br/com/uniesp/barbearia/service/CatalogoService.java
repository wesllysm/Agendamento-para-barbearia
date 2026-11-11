package br.com.uniesp.barbearia.service;

import br.com.uniesp.barbearia.domain.*;
import br.com.uniesp.barbearia.dto.CatalogoDtos.*;
import br.com.uniesp.barbearia.exception.RegraNegocioException;
import br.com.uniesp.barbearia.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/** RF001 visualizar serviços · RF003 escolher profissional · RF014 cadastrar serviços e barbeiros. */
@Service
public class CatalogoService {

    private final ServicoRepository servicos;
    private final BarbeiroRepository barbeiros;
    private final AgendamentoItemRepository itens;
    private final BloqueioAgendaRepository bloqueios;

    public CatalogoService(ServicoRepository servicos, BarbeiroRepository barbeiros,
                           AgendamentoItemRepository itens, BloqueioAgendaRepository bloqueios) {
        this.servicos = servicos;
        this.barbeiros = barbeiros;
        this.itens = itens;
        this.bloqueios = bloqueios;
    }

    // ===================== Serviços =====================

    @Transactional(readOnly = true)
    public List<ServicoResponse> servicosAtivos() {
        return servicos.findByAtivoTrueOrderByTipoAscNomeAsc().stream().map(ServicoResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public List<ServicoResponse> todosServicos() {
        return servicos.findAllByOrderByTipoAscNomeAsc().stream().map(ServicoResponse::de).toList();
    }

    @Transactional
    public ServicoResponse criarServico(ServicoRequest req) {
        if (servicos.existsByNomeIgnoreCase(req.nome().trim()))
            throw RegraNegocioException.conflito("Já existe um serviço com este nome.");
        Servico s = new Servico();
        preencher(s, req);
        return ServicoResponse.de(servicos.save(s));
    }

    @Transactional
    public ServicoResponse atualizarServico(Long id, ServicoRequest req) {
        Servico s = servico(id);
        if (servicos.existsByNomeIgnoreCaseAndIdNot(req.nome().trim(), id))
            throw RegraNegocioException.conflito("Já existe um serviço com este nome.");
        preencher(s, req);
        return ServicoResponse.de(s);
    }

    /** Exclui se nunca foi usado; senão apenas desativa, preservando o histórico financeiro. */
    @Transactional
    public String excluirServico(Long id) {
        Servico s = servico(id);
        if (itens.existsByServicoId(id)) {
            s.setAtivo(false);
            return "Serviço já possui histórico de atendimentos e foi desativado.";
        }
        barbeiros.findAll().forEach(b -> b.getServicos().remove(s));
        servicos.findAll().forEach(c -> c.getItens().remove(s));
        servicos.delete(s);
        return "Serviço excluído.";
    }

    private void preencher(Servico s, ServicoRequest req) {
        s.setNome(req.nome().trim());
        s.setDescricao(req.descricao());
        s.setPreco(req.preco());
        s.setDuracaoMin(req.duracaoMin());
        s.setTipo(req.tipo());
        if (req.ativo() != null) s.setAtivo(req.ativo());
        s.getItens().clear();
        if (req.tipo() == TipoServico.COMBO) {
            if (req.itensIds() == null || req.itensIds().size() < 2)
                throw new RegraNegocioException("Um combo precisa ter pelo menos dois serviços.");
            List<Servico> lista = servicos.findAllById(req.itensIds());
            if (lista.size() != req.itensIds().size()) throw RegraNegocioException.naoEncontrado("Serviço do combo");
            if (lista.stream().anyMatch(x -> x.getTipo() == TipoServico.COMBO || Objects.equals(x.getId(), s.getId())))
                throw new RegraNegocioException("Um combo só pode conter serviços simples.");
            s.getItens().addAll(lista);
        }
    }

    public Servico servico(Long id) {
        return servicos.findById(id).orElseThrow(() -> RegraNegocioException.naoEncontrado("Serviço"));
    }

    // ===================== Barbeiros =====================

    /** Profissionais que realizam todos os serviços do carrinho (RF003). */
    @Transactional(readOnly = true)
    public List<BarbeiroPublico> barbeirosAptos(List<Long> servicosIds) {
        List<Barbeiro> lista = (servicosIds == null || servicosIds.isEmpty())
                ? barbeiros.findByAtivoTrueOrderByNome()
                : barbeiros.findAptos(new HashSet<>(servicosIds), new HashSet<>(servicosIds).size());
        return lista.stream().map(BarbeiroPublico::de).toList();
    }

    @Transactional(readOnly = true)
    public List<BarbeiroResponse> todosBarbeiros() {
        return barbeiros.findAllByOrderByAtivoDescNomeAsc().stream().map(BarbeiroResponse::de).toList();
    }

    @Transactional
    public BarbeiroResponse criarBarbeiro(BarbeiroRequest req) {
        Barbeiro b = new Barbeiro();
        preencher(b, req);
        return BarbeiroResponse.de(barbeiros.save(b));
    }

    @Transactional
    public BarbeiroResponse atualizarBarbeiro(Long id, BarbeiroRequest req) {
        Barbeiro b = barbeiro(id);
        preencher(b, req);
        barbeiros.flush();
        return BarbeiroResponse.de(b);
    }

    /** RF014 pede "desativar" barbeiros: o histórico de agendamentos é mantido. */
    @Transactional
    public void alterarAtivoBarbeiro(Long id, boolean ativo) {
        barbeiro(id).setAtivo(ativo);
    }

    @Transactional
    public void bloquearAgenda(Long barbeiroId, BloqueioRequest req) {
        if (!req.fim().isAfter(req.inicio())) throw new RegraNegocioException("O fim do bloqueio deve ser após o início.");
        BloqueioAgenda bl = new BloqueioAgenda();
        bl.setBarbeiro(barbeiro(barbeiroId));
        bl.setInicio(req.inicio());
        bl.setFim(req.fim());
        bl.setMotivo(req.motivo());
        bloqueios.save(bl);
    }

    private void preencher(Barbeiro b, BarbeiroRequest req) {
        b.setNome(req.nome().trim());
        b.setTelefone(req.telefone() == null ? null : Validadores.somenteDigitos(req.telefone()));
        b.setEspecialidade(req.especialidade());
        if (req.ativo() != null) b.setAtivo(req.ativo());
        if (req.servicosIds() != null) {
            List<Servico> lista = servicos.findAllById(req.servicosIds());
            if (lista.size() != req.servicosIds().size()) throw RegraNegocioException.naoEncontrado("Serviço");
            b.getServicos().clear();
            b.getServicos().addAll(lista);
        }
        if (req.horarios() != null) {
            req.horarios().forEach(h -> {
                if (!h.horaFim().isAfter(h.horaInicio()))
                    throw new RegraNegocioException("Em cada faixa de expediente o fim deve ser após o início.");
            });
            b.getHorarios().clear();
            barbeiros.flush(); // remove as faixas antigas antes de inserir (evita violar uk_horario)
            req.horarios().forEach(h -> {
                HorarioTrabalho ht = new HorarioTrabalho();
                ht.setBarbeiro(b);
                ht.setDiaSemana(h.diaSemana());
                ht.setHoraInicio(h.horaInicio());
                ht.setHoraFim(h.horaFim());
                b.getHorarios().add(ht);
            });
        }
    }

    public Barbeiro barbeiro(Long id) {
        return barbeiros.findById(id).orElseThrow(() -> RegraNegocioException.naoEncontrado("Barbeiro"));
    }
}

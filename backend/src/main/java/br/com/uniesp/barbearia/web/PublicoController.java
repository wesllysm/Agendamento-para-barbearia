package br.com.uniesp.barbearia.web;

import br.com.uniesp.barbearia.dto.AgendamentoDtos.DisponibilidadeResponse;
import br.com.uniesp.barbearia.dto.CatalogoDtos.BarbeiroPublico;
import br.com.uniesp.barbearia.dto.CatalogoDtos.ServicoResponse;
import br.com.uniesp.barbearia.service.AgendamentoService;
import br.com.uniesp.barbearia.service.CatalogoService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Endpoints abertos: o cliente navega pelo catálogo antes de fazer login. */
@RestController
@RequestMapping("/api")
public class PublicoController {

    private final CatalogoService catalogo;
    private final AgendamentoService agendamentos;

    public PublicoController(CatalogoService catalogo, AgendamentoService agendamentos) {
        this.catalogo = catalogo;
        this.agendamentos = agendamentos;
    }

    /** RF001 */
    @GetMapping("/servicos")
    public List<ServicoResponse> servicos() {
        return catalogo.servicosAtivos();
    }

    /** RF003 — ?servicos=1,2 retorna só quem realiza todos os itens do carrinho */
    @GetMapping("/barbeiros")
    public List<BarbeiroPublico> barbeiros(@RequestParam(name = "servicos", required = false) List<Long> servicos) {
        return catalogo.barbeirosAptos(servicos);
    }

    /** RF004 */
    @GetMapping("/disponibilidade")
    public DisponibilidadeResponse disponibilidade(@RequestParam Long barbeiroId,
                                                   @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data,
                                                   @RequestParam(name = "servicos") List<Long> servicos) {
        return agendamentos.disponibilidade(barbeiroId, data, servicos);
    }
}

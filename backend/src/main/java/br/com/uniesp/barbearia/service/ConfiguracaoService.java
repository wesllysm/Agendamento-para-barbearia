package br.com.uniesp.barbearia.service;

import br.com.uniesp.barbearia.domain.Configuracao;
import br.com.uniesp.barbearia.repository.ConfiguracaoRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class ConfiguracaoService {

    public static final String TAXA_AGENDAMENTO = "TAXA_AGENDAMENTO";
    public static final String DESCONTO_ANIVERSARIO_PCT = "DESCONTO_ANIVERSARIO_PCT";
    public static final String LEMBRETE_HORAS_ANTES = "LEMBRETE_HORAS_ANTES";
    public static final String PAGAMENTO_EXPIRA_MIN = "PAGAMENTO_EXPIRA_MIN";
    public static final String INTERVALO_SLOT_MIN = "INTERVALO_SLOT_MIN";

    private final ConfiguracaoRepository repo;

    public ConfiguracaoService(ConfiguracaoRepository repo) {
        this.repo = repo;
    }

    public BigDecimal decimal(String chave, String padrao) {
        return new BigDecimal(valor(chave, padrao));
    }

    public int inteiro(String chave, int padrao) {
        return Integer.parseInt(valor(chave, String.valueOf(padrao)));
    }

    private String valor(String chave, String padrao) {
        return repo.findById(chave).map(Configuracao::getValor).orElse(padrao);
    }
}

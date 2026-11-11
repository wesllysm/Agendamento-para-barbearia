package br.com.uniesp.barbearia.integracao;

import br.com.uniesp.barbearia.domain.MetodoPagamento;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Implementação de desenvolvimento:
 *  - Cartão: aprova na hora (recusa se o token terminar em "0000", para testar o fluxo de erro).
 *  - PIX: gera um copia-e-cola fictício e fica aguardando confirmação (webhook simulado).
 */
@Component
public class GatewayPagamentoSimulado implements GatewayPagamento {

    private static final Logger log = LoggerFactory.getLogger(GatewayPagamentoSimulado.class);

    @Override
    public Resultado cobrar(MetodoPagamento metodo, BigDecimal valor, String referencia, String tokenCartao) {
        String codigo = "SIM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("[PAGAMENTO SIMULADO] {} de R$ {} ref {} → {}", metodo, valor, referencia, codigo);
        if (metodo == MetodoPagamento.PIX) {
            String copiaCola = "00020126580014BR.GOV.BCB.PIX0136" + UUID.randomUUID()
                    + "5204000053039865405" + valor.toPlainString() + "5802BR5909BARBEARIA6009JOAOPESSOA62070503"
                    + referencia + "6304ABCD";
            return new Resultado(false, true, codigo, copiaCola);
        }
        boolean recusado = tokenCartao != null && tokenCartao.endsWith("0000");
        return new Resultado(!recusado, false, codigo, null);
    }
}

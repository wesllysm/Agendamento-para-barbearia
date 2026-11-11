package br.com.uniesp.barbearia.integracao;

import br.com.uniesp.barbearia.domain.MetodoPagamento;

import java.math.BigDecimal;

/**
 * Porta para o provedor de pagamento (Mercado Pago, PagSeguro, Asaas, Stripe...).
 * Troque a implementação simulada por uma real sem mexer no restante do sistema.
 */
public interface GatewayPagamento {

    Resultado cobrar(MetodoPagamento metodo, BigDecimal valor, String referencia, String tokenCartao);

    record Resultado(boolean aprovado, boolean aguardandoConfirmacao, String codigoTransacao, String pixCopiaCola) {}
}

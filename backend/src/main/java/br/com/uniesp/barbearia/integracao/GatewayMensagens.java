package br.com.uniesp.barbearia.integracao;

import br.com.uniesp.barbearia.domain.CanalNotificacao;

/**
 * Porta para envio de mensagens (WhatsApp Business API / Z-API / Twilio e um provedor de e-mail).
 * @return true se o provedor aceitou a mensagem.
 */
public interface GatewayMensagens {
    boolean enviar(CanalNotificacao canal, String destino, String mensagem);
}

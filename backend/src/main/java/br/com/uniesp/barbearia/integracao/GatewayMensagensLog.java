package br.com.uniesp.barbearia.integracao;

import br.com.uniesp.barbearia.domain.CanalNotificacao;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Implementação de desenvolvimento: apenas escreve a mensagem no log. */
@Component
public class GatewayMensagensLog implements GatewayMensagens {

    private static final Logger log = LoggerFactory.getLogger(GatewayMensagensLog.class);

    @Override
    public boolean enviar(CanalNotificacao canal, String destino, String mensagem) {
        log.info("[{} → {}] {}", canal, destino, mensagem);
        return true;
    }
}

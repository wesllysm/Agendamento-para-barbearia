package br.com.uniesp.barbearia.domain;

import java.util.List;

public enum StatusAgendamento {
    PENDENTE_PAGAMENTO, CONFIRMADO, CONCLUIDO, CANCELADO, NAO_COMPARECEU, EXPIRADO;

    /** Status que ocupam o horário do barbeiro (mesma regra da constraint EXCLUDE do banco). */
    public static final List<StatusAgendamento> OCUPAM_HORARIO = List.of(PENDENTE_PAGAMENTO, CONFIRMADO, CONCLUIDO);
}

-- =====================================================================
--  Sistema de Agendamento para Barbearia — Modelo Físico (PostgreSQL 14+)
--  Projeto II · PE2 · UNIESP
--
--  Este arquivo também é a migração Flyway V1 do back-end
--  (backend/src/main/resources/db/migration/V1__modelo_fisico.sql).
-- =====================================================================

-- Necessária para a restrição EXCLUDE que impede horários sobrepostos (RNF002)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------
-- 1. USUÁRIOS INTERNOS (Gestor e Funcionário)  — RF012 / RNF005
-- ---------------------------------------------------------------------
CREATE TABLE usuario_interno (
    id            BIGSERIAL     PRIMARY KEY,
    nome          VARCHAR(120)  NOT NULL,
    email         VARCHAR(160)  NOT NULL,
    telefone      VARCHAR(20),
    senha_hash    VARCHAR(100)  NOT NULL,
    perfil        VARCHAR(20)   NOT NULL,
    ativo         BOOLEAN       NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_usuario_interno_email UNIQUE (email),
    CONSTRAINT ck_usuario_interno_perfil CHECK (perfil IN ('GESTOR', 'FUNCIONARIO'))
);

-- ---------------------------------------------------------------------
-- 2. CLIENTE  — RF005 / RF006 / RF016
-- ---------------------------------------------------------------------
CREATE TABLE cliente (
    id               BIGSERIAL     PRIMARY KEY,
    nome             VARCHAR(120)  NOT NULL,
    cpf              VARCHAR(11)   NOT NULL,          -- só dígitos; evita cadastro duplicado
    data_nascimento  DATE          NOT NULL,          -- desconto no mês do aniversário
    email            VARCHAR(160)  NOT NULL,          -- login + promoções
    telefone         VARCHAR(20)   NOT NULL,          -- login + WhatsApp
    senha_hash       VARCHAR(100)  NOT NULL,
    aceita_promocoes BOOLEAN       NOT NULL DEFAULT TRUE,
    ativo            BOOLEAN       NOT NULL DEFAULT TRUE,
    criado_em        TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_cliente_cpf      UNIQUE (cpf),
    CONSTRAINT uk_cliente_email    UNIQUE (email),
    CONSTRAINT uk_cliente_telefone UNIQUE (telefone),
    CONSTRAINT ck_cliente_cpf      CHECK (cpf ~ '^[0-9]{11}$'),
    CONSTRAINT ck_cliente_nasc     CHECK (data_nascimento > DATE '1900-01-01')
);

-- Recuperação de senha ("Esqueci minha senha") — RF006
CREATE TABLE token_recuperacao_senha (
    id          BIGSERIAL    PRIMARY KEY,
    cliente_id  BIGINT       NOT NULL REFERENCES cliente (id) ON DELETE CASCADE,
    token_hash  VARCHAR(100) NOT NULL,
    canal       VARCHAR(10)  NOT NULL,
    expira_em   TIMESTAMP    NOT NULL,
    usado_em    TIMESTAMP,
    criado_em   TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_token_canal CHECK (canal IN ('EMAIL', 'WHATSAPP'))
);
CREATE INDEX ix_token_cliente ON token_recuperacao_senha (cliente_id);

-- ---------------------------------------------------------------------
-- 3. BARBEIRO / PROFISSIONAL  — RF003 / RF014
-- ---------------------------------------------------------------------
CREATE TABLE barbeiro (
    id             BIGSERIAL    PRIMARY KEY,
    nome           VARCHAR(120) NOT NULL,
    telefone       VARCHAR(20),
    especialidade  VARCHAR(120),
    ativo          BOOLEAN      NOT NULL DEFAULT TRUE,   -- "desativar" em vez de excluir
    criado_em      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 4. SERVIÇO e COMBO  — RF001 / RF014
--    Combos são serviços do tipo COMBO compostos por outros serviços.
-- ---------------------------------------------------------------------
CREATE TABLE servico (
    id           BIGSERIAL     PRIMARY KEY,
    nome         VARCHAR(80)   NOT NULL,
    descricao    VARCHAR(255),
    preco        NUMERIC(10,2) NOT NULL,
    duracao_min  INTEGER       NOT NULL,
    tipo         VARCHAR(10)   NOT NULL DEFAULT 'SERVICO',
    ativo        BOOLEAN       NOT NULL DEFAULT TRUE,
    criado_em    TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_servico_nome     UNIQUE (nome),
    CONSTRAINT ck_servico_preco    CHECK (preco >= 0),
    CONSTRAINT ck_servico_duracao  CHECK (duracao_min > 0 AND duracao_min <= 480),
    CONSTRAINT ck_servico_tipo     CHECK (tipo IN ('SERVICO', 'COMBO'))
);

CREATE TABLE combo_item (
    combo_id    BIGINT NOT NULL REFERENCES servico (id) ON DELETE CASCADE,
    servico_id  BIGINT NOT NULL REFERENCES servico (id),
    PRIMARY KEY (combo_id, servico_id),
    CONSTRAINT ck_combo_item_diferente CHECK (combo_id <> servico_id)
);

-- Quais serviços cada barbeiro realiza (associação "realiza" do diagrama de classes)
CREATE TABLE barbeiro_servico (
    barbeiro_id BIGINT NOT NULL REFERENCES barbeiro (id) ON DELETE CASCADE,
    servico_id  BIGINT NOT NULL REFERENCES servico (id)  ON DELETE CASCADE,
    PRIMARY KEY (barbeiro_id, servico_id)
);

-- ---------------------------------------------------------------------
-- 5. DISPONIBILIDADE DO BARBEIRO  — RF004
-- ---------------------------------------------------------------------
-- Expediente semanal. dia_semana segue a ISO-8601: 1 = segunda ... 7 = domingo
CREATE TABLE horario_trabalho (
    id           BIGSERIAL PRIMARY KEY,
    barbeiro_id  BIGINT    NOT NULL REFERENCES barbeiro (id) ON DELETE CASCADE,
    dia_semana   SMALLINT  NOT NULL,
    hora_inicio  TIME      NOT NULL,
    hora_fim     TIME      NOT NULL,
    CONSTRAINT ck_horario_dia   CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT ck_horario_faixa CHECK (hora_fim > hora_inicio),
    CONSTRAINT uk_horario       UNIQUE (barbeiro_id, dia_semana, hora_inicio)
);

-- Folgas, férias, almoço etc.
CREATE TABLE bloqueio_agenda (
    id           BIGSERIAL    PRIMARY KEY,
    barbeiro_id  BIGINT       NOT NULL REFERENCES barbeiro (id) ON DELETE CASCADE,
    inicio       TIMESTAMP    NOT NULL,
    fim          TIMESTAMP    NOT NULL,
    motivo       VARCHAR(120),
    CONSTRAINT ck_bloqueio_faixa CHECK (fim > inicio)
);
CREATE INDEX ix_bloqueio_barbeiro ON bloqueio_agenda (barbeiro_id, inicio);

-- ---------------------------------------------------------------------
-- 6. AGENDAMENTO  — RF004 / RF008 / RF010 / RF013 / RNF002
-- ---------------------------------------------------------------------
CREATE TABLE agendamento (
    id                   BIGSERIAL     PRIMARY KEY,
    cliente_id           BIGINT        NOT NULL REFERENCES cliente (id),
    barbeiro_id          BIGINT        NOT NULL REFERENCES barbeiro (id),
    inicio               TIMESTAMP     NOT NULL,
    fim                  TIMESTAMP     NOT NULL,
    valor_servicos       NUMERIC(10,2) NOT NULL,
    desconto             NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_total          NUMERIC(10,2) NOT NULL,
    taxa_agendamento     NUMERIC(10,2) NOT NULL,
    status               VARCHAR(25)   NOT NULL DEFAULT 'PENDENTE_PAGAMENTO',
    expira_em            TIMESTAMP,                 -- reserva temporária até pagar a taxa
    observacao           VARCHAR(255),
    lembrete_enviado_em  TIMESTAMP,                 -- RF011
    criado_em            TIMESTAMP     NOT NULL DEFAULT NOW(),
    atualizado_em        TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_agendamento_faixa  CHECK (fim > inicio),
    CONSTRAINT ck_agendamento_valor  CHECK (valor_total >= 0 AND desconto >= 0 AND taxa_agendamento >= 0),
    CONSTRAINT ck_agendamento_status CHECK (status IN
        ('PENDENTE_PAGAMENTO', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO', 'NAO_COMPARECEU', 'EXPIRADO')),
    -- RNF002: o banco recusa dois agendamentos ativos do mesmo barbeiro com horários que se cruzam
    CONSTRAINT ex_agendamento_sem_conflito EXCLUDE USING gist (
        barbeiro_id WITH =,
        tsrange(inicio, fim, '[)') WITH &&
    ) WHERE (status IN ('PENDENTE_PAGAMENTO', 'CONFIRMADO', 'CONCLUIDO'))
);
CREATE INDEX ix_agendamento_barbeiro_inicio ON agendamento (barbeiro_id, inicio);
CREATE INDEX ix_agendamento_cliente         ON agendamento (cliente_id, inicio DESC);
CREATE INDEX ix_agendamento_status_inicio   ON agendamento (status, inicio);

-- Itens do "carrinho" que viraram agendamento (preço/duração congelados no momento da compra)
CREATE TABLE agendamento_item (
    id              BIGSERIAL     PRIMARY KEY,
    agendamento_id  BIGINT        NOT NULL REFERENCES agendamento (id) ON DELETE CASCADE,
    servico_id      BIGINT        NOT NULL REFERENCES servico (id),
    nome_servico    VARCHAR(80)   NOT NULL,
    preco           NUMERIC(10,2) NOT NULL,
    duracao_min     INTEGER       NOT NULL,
    CONSTRAINT uk_agendamento_item UNIQUE (agendamento_id, servico_id)
);

-- ---------------------------------------------------------------------
-- 7. PAGAMENTO DA TAXA  (FormaPagamento) — RF009 / RF010 / RF015
-- ---------------------------------------------------------------------
CREATE TABLE pagamento (
    id                BIGSERIAL     PRIMARY KEY,
    agendamento_id    BIGINT        NOT NULL REFERENCES agendamento (id),
    metodo            VARCHAR(10)   NOT NULL,
    valor             NUMERIC(10,2) NOT NULL,
    status            VARCHAR(12)   NOT NULL DEFAULT 'PENDENTE',
    codigo_transacao  VARCHAR(80),
    pix_copia_cola    TEXT,
    criado_em         TIMESTAMP     NOT NULL DEFAULT NOW(),
    pago_em           TIMESTAMP,
    CONSTRAINT ck_pagamento_metodo CHECK (metodo IN ('PIX', 'CREDITO', 'DEBITO')),
    CONSTRAINT ck_pagamento_status CHECK (status IN ('PENDENTE', 'APROVADO', 'RECUSADO', 'ESTORNADO')),
    CONSTRAINT ck_pagamento_valor  CHECK (valor > 0)
);
CREATE INDEX ix_pagamento_agendamento ON pagamento (agendamento_id);
CREATE INDEX ix_pagamento_pago_em     ON pagamento (pago_em) WHERE status = 'APROVADO';
-- No máximo um pagamento aprovado por agendamento
CREATE UNIQUE INDEX uk_pagamento_aprovado ON pagamento (agendamento_id) WHERE status = 'APROVADO';

-- ---------------------------------------------------------------------
-- 8. NOTIFICAÇÕES (lembrete, confirmação, campanhas em massa) — RF011 / RF016
-- ---------------------------------------------------------------------
CREATE TABLE notificacao (
    id              BIGSERIAL    PRIMARY KEY,
    cliente_id      BIGINT       NOT NULL REFERENCES cliente (id) ON DELETE CASCADE,
    agendamento_id  BIGINT       REFERENCES agendamento (id) ON DELETE SET NULL,
    canal           VARCHAR(10)  NOT NULL,
    tipo            VARCHAR(20)  NOT NULL,
    mensagem        TEXT         NOT NULL,
    status          VARCHAR(10)  NOT NULL DEFAULT 'PENDENTE',
    criado_em       TIMESTAMP    NOT NULL DEFAULT NOW(),
    enviada_em      TIMESTAMP,
    CONSTRAINT ck_notificacao_canal  CHECK (canal IN ('WHATSAPP', 'EMAIL')),
    CONSTRAINT ck_notificacao_tipo   CHECK (tipo IN
        ('LEMBRETE', 'CONFIRMACAO', 'PROMOCAO', 'CAMPANHA', 'AVISO', 'RECUPERACAO_SENHA')),
    CONSTRAINT ck_notificacao_status CHECK (status IN ('PENDENTE', 'ENVIADA', 'FALHA'))
);
CREATE INDEX ix_notificacao_cliente ON notificacao (cliente_id, criado_em DESC);

-- ---------------------------------------------------------------------
-- 9. CONFIGURAÇÕES DO NEGÓCIO
-- ---------------------------------------------------------------------
CREATE TABLE configuracao (
    chave      VARCHAR(60)  PRIMARY KEY,
    valor      VARCHAR(255) NOT NULL,
    descricao  VARCHAR(255)
);

-- ---------------------------------------------------------------------
-- 10. VISÕES PARA AGENDA E RELATÓRIOS — RF013 / RF015 / RF017
-- ---------------------------------------------------------------------
CREATE VIEW vw_agenda AS
SELECT a.id,
       a.inicio,
       a.fim,
       EXTRACT(EPOCH FROM (a.fim - a.inicio))::INT / 60       AS duracao_min,
       a.status,
       a.valor_total,
       c.id   AS cliente_id,  c.nome  AS cliente_nome, c.telefone AS cliente_telefone,
       b.id   AS barbeiro_id, b.nome  AS barbeiro_nome,
       (SELECT string_agg(i.nome_servico, ', ' ORDER BY i.id)
          FROM agendamento_item i WHERE i.agendamento_id = a.id) AS servicos
  FROM agendamento a
  JOIN cliente  c ON c.id = a.cliente_id
  JOIN barbeiro b ON b.id = a.barbeiro_id;

CREATE VIEW vw_faturamento_diario AS
SELECT a.inicio::DATE                                   AS dia,
       COUNT(*)                                         AS atendimentos,
       SUM(a.valor_total)                               AS faturamento,
       SUM(a.taxa_agendamento)                          AS taxas_recebidas
  FROM agendamento a
 WHERE a.status = 'CONCLUIDO'
 GROUP BY a.inicio::DATE;

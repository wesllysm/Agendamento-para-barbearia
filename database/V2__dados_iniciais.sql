-- =====================================================================
--  Dados iniciais (catálogo do PDF + configurações).
--  Preços e durações são valores de EXEMPLO — ajuste com a barbearia.
--  Usuários internos (gestor/funcionário) são criados pelo back-end na
--  primeira execução, para que a senha seja gravada com BCrypt.
-- =====================================================================

INSERT INTO configuracao (chave, valor, descricao) VALUES
 ('TAXA_AGENDAMENTO',            '10.00', 'Taxa (sinal) cobrada online para confirmar o agendamento, abatida no atendimento'),
 ('DESCONTO_ANIVERSARIO_PCT',    '10',    'Desconto (%) para clientes no mês do aniversário'),
 ('LEMBRETE_HORAS_ANTES',        '4',     'Horas antes do atendimento para enviar o lembrete por WhatsApp'),
 ('PAGAMENTO_EXPIRA_MIN',        '15',    'Minutos que o horário fica reservado aguardando o pagamento da taxa'),
 ('INTERVALO_SLOT_MIN',          '30',    'Intervalo entre horários exibidos ao cliente');

-- Serviços (RF001)
INSERT INTO servico (nome, descricao, preco, duracao_min, tipo) VALUES
 ('Cabelo',      'Corte na tesoura ou máquina, lavagem e finalização',  40.00, 40, 'SERVICO'),
 ('Barba',       'Barba com toalha quente, navalha e balm',            30.00, 30, 'SERVICO'),
 ('Sobrancelha', 'Design e limpeza na navalha ou pinça',                15.00, 15, 'SERVICO'),
 ('Selagem',     'Alinhamento e redução de volume dos fios',            90.00, 90, 'SERVICO');

INSERT INTO servico (nome, descricao, preco, duracao_min, tipo) VALUES
 ('Combo 1', 'Barba + Cabelo',               60.00, 70, 'COMBO'),
 ('Combo 2', 'Barba + Cabelo + Sobrancelha', 72.00, 85, 'COMBO');

INSERT INTO combo_item (combo_id, servico_id)
SELECT c.id, s.id FROM servico c JOIN servico s ON
     (c.nome = 'Combo 1' AND s.nome IN ('Barba', 'Cabelo'))
  OR (c.nome = 'Combo 2' AND s.nome IN ('Barba', 'Cabelo', 'Sobrancelha'));

-- Profissionais de exemplo
INSERT INTO barbeiro (nome, telefone, especialidade) VALUES
 ('Rafael Andrade', '83999990001', 'Cortes clássicos e navalha'),
 ('Diego Martins',  '83999990002', 'Degradê e barba'),
 ('Thiago Nunes',   '83999990003', 'Barba e acabamento na navalha');

INSERT INTO barbeiro_servico (barbeiro_id, servico_id)
SELECT b.id, s.id FROM barbeiro b JOIN servico s ON
     (b.nome IN ('Rafael Andrade', 'Diego Martins')
         AND s.nome IN ('Cabelo', 'Barba', 'Sobrancelha', 'Selagem', 'Combo 1', 'Combo 2'))
  OR (b.nome = 'Thiago Nunes' AND s.nome IN ('Cabelo', 'Barba', 'Sobrancelha', 'Combo 1', 'Combo 2'));

-- Expediente: terça a sábado, 09h–12h e 13h–19h (segunda e domingo fechado)
INSERT INTO horario_trabalho (barbeiro_id, dia_semana, hora_inicio, hora_fim)
SELECT b.id, d.dia, f.ini, f.fim
  FROM barbeiro b
 CROSS JOIN generate_series(2, 6) AS d(dia)
 CROSS JOIN (VALUES (TIME '09:00', TIME '12:00'), (TIME '13:00', TIME '19:00')) AS f(ini, fim);

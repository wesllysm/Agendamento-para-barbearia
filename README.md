# Sistema de Agendamento para Barbearia — Projeto II (PE2 · UNIESP)

Implementação dos três entregáveis a partir do documento do projeto (RF001–RF017, RNF001–RNF005, casos de uso e diagrama de classes).

```
barbearia/
├── database/                 → 1. MODELO FÍSICO
│   ├── V1__modelo_fisico.sql     tabelas, constraints, índices e views
│   ├── V2__dados_iniciais.sql    serviços/combos do PDF, profissionais, expediente, configurações
│   └── modelo_fisico.png         diagrama gerado a partir do banco
├── backend/                  → 2. CÓDIGO BACK-END (Java 21 + Spring Boot 3.3)
└── frontend/                 → 3. CÓDIGO FRONT-END (HTML + CSS + JavaScript puro)
    ├── index.html                área do cliente
    └── painel.html               painel do gestor e do funcionário
```

---

## 1. Modelo físico (PostgreSQL 14+)

14 tabelas: `cliente`, `usuario_interno`, `barbeiro`, `servico`, `combo_item`, `barbeiro_servico`, `horario_trabalho`, `bloqueio_agenda`, `agendamento`, `agendamento_item`, `pagamento`, `notificacao`, `token_recuperacao_senha`, `configuracao` + as views `vw_agenda` e `vw_faturamento_diario`.

Decisões que vale citar na apresentação:

| Requisito | Como o banco garante |
|---|---|
| **RNF002** – dois agendamentos no mesmo horário/profissional | `EXCLUDE USING gist (barbeiro_id WITH =, tsrange(inicio, fim) WITH &&)` — o **próprio banco** recusa horários sobrepostos, mesmo com dois clientes clicando ao mesmo tempo. Cancelados/expirados não ocupam a vaga. |
| RF005 – CPF evita duplicidade | `UNIQUE (cpf)`, `UNIQUE (email)`, `UNIQUE (telefone)` + `CHECK` de 11 dígitos |
| RF001 – combos | combo é um `servico` do tipo `COMBO`, composto por linhas em `combo_item` |
| RF008/RF015 – histórico de preços | `agendamento_item` congela nome, preço e duração do serviço no momento da compra |
| RF009 – um pagamento aprovado por agendamento | índice único parcial `WHERE status = 'APROVADO'` |
| RF011 – lembrete 4h antes | `agendamento.lembrete_enviado_em` evita mensagem duplicada |

Teste rápido: `psql -d barbearia -f database/V1__modelo_fisico.sql -f database/V2__dados_iniciais.sql`

## 2. Back-end (Spring Boot)

**Stack:** Spring Web, Data JPA, Validation, Security (JWT stateless), Flyway, PostgreSQL, Lombok.

```bash
createdb barbearia                       # o Flyway cria as tabelas na 1ª execução
cd backend
DB_USER=postgres DB_PASSWORD=postgres mvn spring-boot:run   # ou rode BarbeariaApplication pelo IntelliJ/VS Code
```

Na primeira execução são criados os usuários internos (senhas com BCrypt):
`gestor@barbearia.com / Admin@123` e `recepcao@barbearia.com / Func@123`.

Pacotes: `domain` (entidades = diagrama de classes) · `repository` · `service` (regras) · `web` (controllers) · `config` (segurança/JWT) · `integracao` (portas de pagamento e mensagens).

### Endpoints × requisitos

| Método e rota | Perfil | Requisito |
|---|---|---|
| `GET /api/servicos` | público | RF001 |
| `GET /api/barbeiros?servicos=1,2` (só quem faz todos os itens do carrinho) | público | RF003 |
| `GET /api/disponibilidade?barbeiroId&data&servicos` | público | RF004 |
| `POST /api/auth/clientes/cadastro` · `/clientes/login` · `/esqueci-senha` · `/redefinir-senha` | público | RF005, RF006 |
| `POST /api/auth/interno/login` | público | RF012 |
| `POST /api/cliente/agendamentos` (pré-reserva por 15 min + resumo) | CLIENTE | RF002, RF007, RF008 |
| `POST /api/cliente/agendamentos/{id}/pagamento` (PIX, crédito, débito) | CLIENTE | RF009 |
| `POST /api/cliente/pagamentos/{id}/confirmar-pix` (simula o webhook) | CLIENTE | RF010 |
| `GET /api/cliente/agendamentos` · `POST …/{id}/cancelar` | CLIENTE | — |
| `GET /api/admin/agenda?de&ate&barbeiroId&status` · `PATCH …/{id}/status` | GESTOR, FUNCIONÁRIO | RF013 |
| `GET/POST/PUT/DELETE /api/admin/servicos` · `/api/admin/barbeiros` (+ desativar, bloqueios) | GESTOR, FUNCIONÁRIO | RF014 |
| `GET /api/admin/clientes` · `POST /api/admin/comunicacoes` (individual ou em massa) | GESTOR, FUNCIONÁRIO | RF016 |
| `GET /api/admin/financeiro?de&ate` | GESTOR | RF015 |
| `GET /api/admin/relatorios/mensal?ano&mes` | GESTOR | RF017 |
| `GET/POST /api/admin/usuarios` · `PATCH …/{id}/ativo` | GESTOR | RF012 |

**Rotina automática (`RotinasAgendadas`, a cada minuto):** expira pré-reservas não pagas e envia o lembrete por WhatsApp para quem tem horário nas próximas 4 h (RF011).

**RNF005:** as rotas são protegidas por perfil no `SecurityConfig`; o funcionário recebe 403 em financeiro, relatórios e usuários.

## 3. Front-end

HTML, CSS e JS puros, sem build — basta abrir `frontend/index.html` no navegador (ou usar o Live Server do VS Code).

- **Modo demonstração (padrão):** `frontend/js/config.js` → `demo: true`. Tudo funciona no navegador com dados simulados (≈2 meses de histórico), sem o back-end. Bom para apresentar.
- **Com o back-end:** troque para `demo: false` (ou abra com `?demo=0`). A API deve estar em `http://localhost:8080/api`; as origens liberadas no CORS estão em `application.yml` (`app.cors.origens`).

Contas do modo demo: cliente `joao@email.com / Cliente@123` · gestor `gestor@barbearia.com / Admin@123` · funcionário `recepcao@barbearia.com / Func@123`.

## Premissas adotadas (confirmar com o grupo/professor)

1. **Taxa de agendamento** = R$ 10,00, funciona como sinal e é **abatida** do valor no dia. Configurável na tabela `configuracao`.
2. **Desconto de aniversário** = 10% quando o atendimento cai no mês de nascimento do cliente.
3. **Agenda mensal (RF004):** o cliente marca até o fim do mês corrente; no último dia do mês, o mês seguinte é liberado.
4. **Expediente de exemplo:** terça a sábado, 9h–12h e 13h–19h. Preços e durações também são exemplos.
5. **Pagamento e WhatsApp** são interfaces (`GatewayPagamento`, `GatewayMensagens`) com implementações simuladas. Para produção, basta trocar por Mercado Pago/Asaas e WhatsApp Business API/Z-API sem mexer no resto.
6. Nome da barbearia ("Corte & Navalha") é provisório: altere em `frontend/js/config.js`.

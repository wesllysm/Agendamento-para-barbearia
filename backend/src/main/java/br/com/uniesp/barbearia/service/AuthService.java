package br.com.uniesp.barbearia.service;

import br.com.uniesp.barbearia.config.JwtService;
import br.com.uniesp.barbearia.config.UsuarioLogado;
import br.com.uniesp.barbearia.domain.*;
import br.com.uniesp.barbearia.dto.AuthDtos.*;
import br.com.uniesp.barbearia.exception.RegraNegocioException;
import br.com.uniesp.barbearia.repository.ClienteRepository;
import br.com.uniesp.barbearia.repository.TokenRecuperacaoSenhaRepository;
import br.com.uniesp.barbearia.repository.UsuarioInternoRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.HexFormat;

/** RF005 cadastro · RF006 login e "esqueci minha senha" · RF012 login interno. */
@Service
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final ClienteRepository clientes;
    private final UsuarioInternoRepository internos;
    private final TokenRecuperacaoSenhaRepository tokens;
    private final NotificacaoService notificacoes;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final Clock clock;

    public AuthService(ClienteRepository clientes, UsuarioInternoRepository internos,
                       TokenRecuperacaoSenhaRepository tokens, NotificacaoService notificacoes,
                       PasswordEncoder encoder, JwtService jwt, Clock clock) {
        this.clientes = clientes;
        this.internos = internos;
        this.tokens = tokens;
        this.notificacoes = notificacoes;
        this.encoder = encoder;
        this.jwt = jwt;
        this.clock = clock;
    }

    @Transactional
    public LoginResponse cadastrar(CadastroClienteRequest req) {
        String cpf = Validadores.somenteDigitos(req.cpf());
        String telefone = Validadores.somenteDigitos(req.telefone());
        String email = req.email().trim().toLowerCase();

        if (!Validadores.cpfValido(cpf)) throw new RegraNegocioException("CPF inválido.");
        if (telefone.length() < 10 || telefone.length() > 13) throw new RegraNegocioException("Telefone inválido.");
        if (clientes.existsByCpf(cpf)) throw RegraNegocioException.conflito("Já existe uma conta com este CPF.");
        if (clientes.existsByEmailIgnoreCase(email)) throw RegraNegocioException.conflito("Este e-mail já está cadastrado.");
        if (clientes.existsByTelefone(telefone)) throw RegraNegocioException.conflito("Este telefone já está cadastrado.");

        Cliente c = new Cliente();
        c.setNome(req.nome().trim());
        c.setCpf(cpf);
        c.setDataNascimento(req.dataNascimento());
        c.setEmail(email);
        c.setTelefone(telefone);
        c.setSenhaHash(encoder.encode(req.senha()));
        c.setAceitaPromocoes(req.aceitaPromocoes());
        clientes.save(c);
        return emitir(new UsuarioLogado(c.getId(), c.getNome(), Perfil.CLIENTE));
    }

    @Transactional(readOnly = true)
    public LoginResponse loginCliente(LoginRequest req) {
        String id = req.identificador().trim();
        String busca = id.contains("@") ? id.toLowerCase() : Validadores.somenteDigitos(id);
        Cliente c = clientes.buscarPorEmailOuTelefone(busca)
                .filter(Cliente::isAtivo)
                .filter(x -> encoder.matches(req.senha(), x.getSenhaHash()))
                .orElseThrow(() -> new BadCredentialsException("credenciais"));
        return emitir(new UsuarioLogado(c.getId(), c.getNome(), Perfil.CLIENTE));
    }

    @Transactional(readOnly = true)
    public LoginResponse loginInterno(LoginRequest req) {
        UsuarioInterno u = internos.findByEmailIgnoreCase(req.identificador().trim())
                .filter(UsuarioInterno::isAtivo)
                .filter(x -> encoder.matches(req.senha(), x.getSenhaHash()))
                .orElseThrow(() -> new BadCredentialsException("credenciais"));
        return emitir(new UsuarioLogado(u.getId(), u.getNome(), u.getPerfil()));
    }

    /** Sempre responde OK para não revelar se a conta existe. O código vale 30 minutos. */
    @Transactional
    public void esqueciSenha(EsqueciSenhaRequest req) {
        String id = req.identificador().trim();
        String busca = id.contains("@") ? id.toLowerCase() : Validadores.somenteDigitos(id);
        clientes.buscarPorEmailOuTelefone(busca).filter(Cliente::isAtivo).ifPresent(c -> {
            String codigo = String.format("%06d", RANDOM.nextInt(1_000_000));
            TokenRecuperacaoSenha t = new TokenRecuperacaoSenha();
            t.setCliente(c);
            t.setTokenHash(sha256(c.getId() + ":" + codigo));
            t.setCanal(req.canal());
            t.setExpiraEm(LocalDateTime.now(clock).plusMinutes(30));
            tokens.save(t);
            notificacoes.enviar(c, null, req.canal(), TipoNotificacao.RECUPERACAO_SENHA,
                    "Seu código para redefinir a senha é " + codigo + ". Ele expira em 30 minutos.");
        });
    }

    @Transactional
    public void redefinirSenha(RedefinirSenhaRequest req) {
        String id = req.identificador().trim();
        String busca = id.contains("@") ? id.toLowerCase() : Validadores.somenteDigitos(id);
        Cliente c = clientes.buscarPorEmailOuTelefone(busca)
                .orElseThrow(() -> new RegraNegocioException("Código inválido ou expirado."));
        TokenRecuperacaoSenha t = tokens.findByTokenHashAndUsadoEmIsNull(sha256(c.getId() + ":" + req.codigo()))
                .filter(x -> x.getExpiraEm().isAfter(LocalDateTime.now(clock)))
                .orElseThrow(() -> new RegraNegocioException("Código inválido ou expirado."));
        t.setUsadoEm(LocalDateTime.now(clock));
        c.setSenhaHash(encoder.encode(req.novaSenha()));
    }

    private LoginResponse emitir(UsuarioLogado u) {
        return new LoginResponse(jwt.gerar(u), u.id(), u.nome(), u.perfil().name());
    }

    private static String sha256(String valor) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(h);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}

package br.com.uniesp.barbearia.config;

import br.com.uniesp.barbearia.domain.Perfil;
import br.com.uniesp.barbearia.domain.UsuarioInterno;
import br.com.uniesp.barbearia.repository.UsuarioInternoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Cria o primeiro gestor e um funcionário de recepção, caso ainda não exista nenhum gestor. */
@Component
public class DataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UsuarioInternoRepository repo;
    private final PasswordEncoder encoder;
    private final String gestorEmail, gestorSenha, funcEmail, funcSenha;

    public DataInitializer(UsuarioInternoRepository repo, PasswordEncoder encoder,
                           @Value("${app.seed.gestor-email}") String gestorEmail,
                           @Value("${app.seed.gestor-senha}") String gestorSenha,
                           @Value("${app.seed.funcionario-email}") String funcEmail,
                           @Value("${app.seed.funcionario-senha}") String funcSenha) {
        this.repo = repo;
        this.encoder = encoder;
        this.gestorEmail = gestorEmail;
        this.gestorSenha = gestorSenha;
        this.funcEmail = funcEmail;
        this.funcSenha = funcSenha;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (repo.existsByPerfil(Perfil.GESTOR)) return;
        repo.save(novo("Gestor", gestorEmail, gestorSenha, Perfil.GESTOR));
        if (!repo.existsByEmailIgnoreCase(funcEmail)) {
            repo.save(novo("Recepção", funcEmail, funcSenha, Perfil.FUNCIONARIO));
        }
        log.warn("Usuários iniciais criados ({} / {}). Troque as senhas em produção.", gestorEmail, funcEmail);
    }

    private UsuarioInterno novo(String nome, String email, String senha, Perfil perfil) {
        UsuarioInterno u = new UsuarioInterno();
        u.setNome(nome);
        u.setEmail(email);
        u.setSenhaHash(encoder.encode(senha));
        u.setPerfil(perfil);
        return u;
    }
}

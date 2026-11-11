package br.com.uniesp.barbearia.web;

import br.com.uniesp.barbearia.dto.AuthDtos.*;
import br.com.uniesp.barbearia.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    /** RF005 */
    @PostMapping("/clientes/cadastro")
    @ResponseStatus(HttpStatus.CREATED)
    public LoginResponse cadastrar(@Valid @RequestBody CadastroClienteRequest req) {
        return auth.cadastrar(req);
    }

    /** RF006 — e-mail ou telefone + senha */
    @PostMapping("/clientes/login")
    public LoginResponse loginCliente(@Valid @RequestBody LoginRequest req) {
        return auth.loginCliente(req);
    }

    /** RF012 — gestor e funcionário */
    @PostMapping("/interno/login")
    public LoginResponse loginInterno(@Valid @RequestBody LoginRequest req) {
        return auth.loginInterno(req);
    }

    @PostMapping("/esqueci-senha")
    public Map<String, String> esqueciSenha(@Valid @RequestBody EsqueciSenhaRequest req) {
        auth.esqueciSenha(req);
        return Map.of("mensagem", "Se a conta existir, enviaremos um código de 6 dígitos.");
    }

    @PostMapping("/redefinir-senha")
    public Map<String, String> redefinir(@Valid @RequestBody RedefinirSenhaRequest req) {
        auth.redefinirSenha(req);
        return Map.of("mensagem", "Senha alterada. Faça login com a nova senha.");
    }
}

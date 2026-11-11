package br.com.uniesp.barbearia.config;

import br.com.uniesp.barbearia.domain.Perfil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private final SecretKey chave;
    private final long expiracaoHoras;

    public JwtService(@Value("${app.jwt.secret}") String segredo,
                      @Value("${app.jwt.expiracao-horas}") long expiracaoHoras) {
        this.chave = Keys.hmacShaKeyFor(segredo.getBytes(StandardCharsets.UTF_8));
        this.expiracaoHoras = expiracaoHoras;
    }

    public String gerar(UsuarioLogado usuario) {
        Instant agora = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(usuario.id()))
                .claim("nome", usuario.nome())
                .claim("perfil", usuario.perfil().name())
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plus(expiracaoHoras, ChronoUnit.HOURS)))
                .signWith(chave)
                .compact();
    }

    public Optional<UsuarioLogado> validar(String token) {
        try {
            Claims c = Jwts.parser().verifyWith(chave).build().parseSignedClaims(token).getPayload();
            return Optional.of(new UsuarioLogado(
                    Long.valueOf(c.getSubject()),
                    c.get("nome", String.class),
                    Perfil.valueOf(c.get("perfil", String.class))));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}

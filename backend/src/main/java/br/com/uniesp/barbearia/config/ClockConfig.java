package br.com.uniesp.barbearia.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/** Relógio injetável: facilita testar regras de data (janela mensal, lembrete de 4h, aniversário). */
@Configuration
public class ClockConfig {
    @Bean
    Clock clock(@Value("${app.timezone}") String zona) {
        return Clock.system(ZoneId.of(zona));
    }
}

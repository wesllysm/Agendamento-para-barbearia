package br.com.uniesp.barbearia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class BarbeariaApplication {

    public static void main(String[] args) {
        // A barbearia trabalha no horário local; o banco guarda TIMESTAMP sem fuso.
        TimeZone.setDefault(TimeZone.getTimeZone("America/Sao_Paulo"));
        SpringApplication.run(BarbeariaApplication.class, args);
    }
}

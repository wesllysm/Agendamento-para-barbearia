package br.com.uniesp.barbearia.service;

import br.com.uniesp.barbearia.dto.AuthDtos;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ValidadoresTest {

    @Test
    void cpfValidoComESemMascara() {
        assertTrue(Validadores.cpfValido("529.982.247-25"));
        assertTrue(Validadores.cpfValido("52998224725"));
    }

    @Test
    void cpfInvalido() {
        assertFalse(Validadores.cpfValido("52998224724"));
        assertFalse(Validadores.cpfValido("11111111111"));
        assertFalse(Validadores.cpfValido("123"));
    }

    @Test
    void senhaExigeCaractereEspecial() {
        assertTrue("Abc@1234".matches(AuthDtos.REGEX_SENHA));
        assertFalse("Abc12345".matches(AuthDtos.REGEX_SENHA));
        assertFalse("A@1".matches(AuthDtos.REGEX_SENHA));
    }
}

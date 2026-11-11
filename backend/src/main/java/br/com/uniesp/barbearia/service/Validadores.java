package br.com.uniesp.barbearia.service;

public final class Validadores {

    private Validadores() {}

    public static String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    /** Validação dos dígitos verificadores do CPF. */
    public static boolean cpfValido(String cpf) {
        String c = somenteDigitos(cpf);
        if (c.length() != 11 || c.chars().distinct().count() == 1) return false;
        for (int pos = 9; pos <= 10; pos++) {
            int soma = 0;
            for (int i = 0; i < pos; i++) soma += (c.charAt(i) - '0') * (pos + 1 - i);
            int dv = (soma * 10) % 11 % 10;
            if (dv != c.charAt(pos) - '0') return false;
        }
        return true;
    }
}

package br.com.uniesp.barbearia.config;

import br.com.uniesp.barbearia.domain.Perfil;

/** Principal colocado no SecurityContext a partir do JWT. */
public record UsuarioLogado(Long id, String nome, Perfil perfil) {}

import { describe, expect, it } from 'vitest';
import { MAX_ALIAS_LENGTH, MIN_ALIAS_LENGTH, validateAlias } from '../../../src/domain/alias.js';
import { InvalidAliasError } from '../../../src/domain/errors.js';

describe('validateAlias', () => {
  describe('aliases válidos', () => {
    it('deve aceitar alias com letras, números, hífen e sublinhado', () => {
      expect(validateAlias('Meu_link-2026')).toBe('Meu_link-2026');
    });

    it('deve aceitar alias com o tamanho mínimo de 3 caracteres', () => {
      expect(validateAlias('abc')).toBe('abc');
    });

    it('deve aceitar alias com o tamanho máximo de 30 caracteres', () => {
      const alias = 'a'.repeat(MAX_ALIAS_LENGTH);
      expect(validateAlias(alias)).toBe(alias);
    });

    it('deve remover espaços nas pontas do alias', () => {
      expect(validateAlias('  promo  ')).toBe('promo');
    });

    it('deve aceitar alias que apenas contém uma palavra reservada', () => {
      expect(validateAlias('minha-api')).toBe('minha-api');
    });
  });

  describe('aliases inválidos', () => {
    it('deve rejeitar alias com 2 caracteres', () => {
      expect(() => validateAlias('ab')).toThrow(
        `O alias deve ter entre ${MIN_ALIAS_LENGTH} e ${MAX_ALIAS_LENGTH} caracteres.`,
      );
    });

    it('deve rejeitar alias com 31 caracteres', () => {
      expect(() => validateAlias('a'.repeat(MAX_ALIAS_LENGTH + 1))).toThrow(InvalidAliasError);
    });

    it('deve rejeitar alias vazio', () => {
      expect(() => validateAlias('')).toThrow(InvalidAliasError);
    });

    it('deve rejeitar alias que só tem tamanho suficiente por causa dos espaços', () => {
      expect(() => validateAlias(' ab ')).toThrow(InvalidAliasError);
    });

    it('deve rejeitar alias com espaço interno', () => {
      expect(() => validateAlias('meu link')).toThrow(
        'O alias só pode conter letras, números, hífen e sublinhado.',
      );
    });

    it('deve rejeitar alias com barra', () => {
      expect(() => validateAlias('a/b/c')).toThrow(InvalidAliasError);
    });

    it('deve rejeitar alias com letra acentuada', () => {
      expect(() => validateAlias('promoção')).toThrow(InvalidAliasError);
    });

    it('deve rejeitar alias com ponto', () => {
      expect(() => validateAlias('meu.link')).toThrow(InvalidAliasError);
    });

    it.each(['api', 'health', 'stats', 'admin', 'static', 'meus-links'])(
      'deve rejeitar a palavra reservada "%s"',
      (alias) => {
        expect(() => validateAlias(alias)).toThrow(`O alias "${alias}" é reservado pelo sistema.`);
      },
    );

    it('deve rejeitar palavra reservada escrita em maiúsculas', () => {
      expect(() => validateAlias('ADMIN')).toThrow(InvalidAliasError);
    });
  });
});

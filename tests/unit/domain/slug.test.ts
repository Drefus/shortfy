import { describe, expect, it } from 'vitest';
import { InvalidSlugError } from '../../../src/domain/errors.js';
import {
  DEFAULT_SLUG_LENGTH,
  MAX_SLUG_LENGTH,
  MIN_SLUG_LENGTH,
  SLUG_ALPHABET,
  generateSlug,
  validateCustomSlug,
} from '../../../src/domain/slug.js';

describe('generateSlug', () => {
  it('gera slug com o tamanho padrão quando nenhum tamanho é informado', () => {
    expect(generateSlug()).toHaveLength(DEFAULT_SLUG_LENGTH);
  });

  it('gera slug com o tamanho solicitado', () => {
    expect(generateSlug(12)).toHaveLength(12);
  });

  it('usa apenas caracteres do alfabeto base62', () => {
    const slug = generateSlug(200);
    for (const char of slug) {
      expect(SLUG_ALPHABET).toContain(char);
    }
  });

  it('é determinístico quando recebe uma fonte de aleatoriedade fixa', () => {
    const sempreZero = () => 0;
    expect(generateSlug(4, sempreZero)).toBe('0000');
  });

  it('mapeia cada valor aleatório para o caractere correspondente do alfabeto', () => {
    const valores = [10, 36, 61];
    const sequencia = () => valores.shift() ?? 0;
    expect(generateSlug(3, sequencia)).toBe('aAZ');
  });

  it('produz slugs diferentes em chamadas sucessivas com aleatoriedade real', () => {
    const slugs = new Set(Array.from({ length: 50 }, () => generateSlug()));
    expect(slugs.size).toBe(50);
  });

  it.each([0, -1, 2.5])('rejeita tamanho inválido %s', (tamanho) => {
    expect(() => generateSlug(tamanho)).toThrow(RangeError);
  });
});

describe('validateCustomSlug', () => {
  it('aceita alias com letras, números, hífen e sublinhado', () => {
    expect(validateCustomSlug('Meu_link-2024')).toBe('Meu_link-2024');
  });

  it('remove espaços nas extremidades do alias', () => {
    expect(validateCustomSlug('  promo  ')).toBe('promo');
  });

  it('aceita alias com o tamanho mínimo', () => {
    const alias = 'a'.repeat(MIN_SLUG_LENGTH);
    expect(validateCustomSlug(alias)).toBe(alias);
  });

  it('aceita alias com o tamanho máximo', () => {
    const alias = 'a'.repeat(MAX_SLUG_LENGTH);
    expect(validateCustomSlug(alias)).toBe(alias);
  });

  it('rejeita alias mais curto que o mínimo', () => {
    expect(() => validateCustomSlug('ab')).toThrow(InvalidSlugError);
  });

  it('rejeita alias mais longo que o máximo', () => {
    expect(() => validateCustomSlug('a'.repeat(MAX_SLUG_LENGTH + 1))).toThrow(
      `entre ${MIN_SLUG_LENGTH} e ${MAX_SLUG_LENGTH} caracteres`,
    );
  });

  it.each(['com espaço', 'barra/no/meio', 'acentuação', 'ponto.final', 'emoji😀'])(
    'rejeita alias com caracteres não permitidos: %s',
    (alias) => {
      expect(() => validateCustomSlug(alias)).toThrow(
        'O alias só pode conter letras, números, hífen e sublinhado.',
      );
    },
  );

  it.each(['api', 'stats', 'health'])('rejeita o alias reservado "%s"', (alias) => {
    expect(() => validateCustomSlug(alias)).toThrow('é reservado pelo sistema');
  });

  it('rejeita alias reservado independentemente de maiúsculas e minúsculas', () => {
    expect(() => validateCustomSlug('ADMIN')).toThrow(InvalidSlugError);
  });
});

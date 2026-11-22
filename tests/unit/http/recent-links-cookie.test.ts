import { describe, expect, it } from 'vitest';
import {
  addRecentCode,
  readRecentCodes,
  MAX_SAVED_CODES,
  serializeRecentCodes,
} from '../../../src/http/recent-links-cookie.js';

describe('readRecentCodes', () => {
  it('deve devolver lista vazia quando não há cookies', () => {
    expect(readRecentCodes(undefined)).toEqual([]);
  });

  it('deve ler os códigos na ordem em que foram salvos', () => {
    expect(readRecentCodes('shortfy_recentes=abc1234.promo')).toEqual(['abc1234', 'promo']);
  });

  it('deve encontrar o cookie entre outros cookies', () => {
    expect(readRecentCodes('tema=escuro; shortfy_recentes=promo; idioma=pt')).toEqual(['promo']);
  });

  it('deve descartar valores que não são códigos válidos', () => {
    expect(readRecentCodes('shortfy_recentes=promo.<script>..%20')).toEqual(['promo']);
  });

  it('deve ignorar códigos repetidos e respeitar o limite', () => {
    const muitos = Array.from({ length: MAX_SAVED_CODES + 5 }, (_, i) => `cod${i}`);
    const lidos = readRecentCodes(`shortfy_recentes=cod0.${muitos.join('.')}`);

    expect(lidos).toHaveLength(MAX_SAVED_CODES);
    expect(lidos[0]).toBe('cod0');
    expect(new Set(lidos).size).toBe(MAX_SAVED_CODES);
  });
});

describe('addRecentCode', () => {
  it('deve colocar o novo código no início', () => {
    expect(addRecentCode(['antigo'], 'novo')).toEqual(['novo', 'antigo']);
  });

  it('deve mover para o início um código que já estava na lista', () => {
    expect(addRecentCode(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('deve descartar o mais antigo ao passar do limite', () => {
    const cheia = Array.from({ length: MAX_SAVED_CODES }, (_, i) => `cod${i}`);

    const nova = addRecentCode(cheia, 'novo');

    expect(nova).toHaveLength(MAX_SAVED_CODES);
    expect(nova[0]).toBe('novo');
    expect(nova).not.toContain(`cod${MAX_SAVED_CODES - 1}`);
  });
});

describe('serializeRecentCodes', () => {
  it('deve gerar um valor que readRecentCodes lê de volta', () => {
    const codes = ['abc1234', 'meu-link', 'x_y'];

    expect(readRecentCodes(`shortfy_recentes=${serializeRecentCodes(codes)}`)).toEqual(codes);
  });
});

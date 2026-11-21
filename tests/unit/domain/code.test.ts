import { describe, expect, it } from 'vitest';
import { BASE62_ALPHABET, CODE_LENGTH, generateCode } from '../../../src/domain/code.js';

describe('generateCode', () => {
  it('deve gerar código com 7 caracteres', () => {
    expect(generateCode()).toHaveLength(7);
  });

  it('deve usar apenas caracteres base62', () => {
    expect(generateCode()).toMatch(/^[0-9a-zA-Z]{7}$/);
  });

  it('deve gerar sempre o mesmo código com aleatoriedade fixa', () => {
    expect(generateCode(() => 0)).toBe('0000000');
  });

  it('deve mapear cada valor sorteado para o caractere correspondente do alfabeto', () => {
    const sorteios = [0, 9, 10, 35, 36, 61, 1];
    expect(generateCode(() => sorteios.shift() ?? 0)).toBe('09azAZ1');
  });

  it('deve pedir à fonte de aleatoriedade números no intervalo do alfabeto', () => {
    const limites: number[] = [];
    generateCode((max) => {
      limites.push(max);
      return 0;
    });
    expect(limites).toEqual(Array(CODE_LENGTH).fill(BASE62_ALPHABET.length));
  });

  it('deve gerar códigos diferentes com a aleatoriedade padrão', () => {
    const codigos = new Set(Array.from({ length: 100 }, () => generateCode()));
    expect(codigos.size).toBe(100);
  });
});

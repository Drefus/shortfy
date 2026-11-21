import { randomInt } from 'node:crypto';

export const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const CODE_LENGTH = 7;

/** Função que devolve um inteiro aleatório em [0, max). */
export type RandomIntFn = (max: number) => number;

const cryptoRandomInt: RandomIntFn = (max) => randomInt(max);

/**
 * Gera um código curto de 7 caracteres base62. A fonte de aleatoriedade é
 * injetável para que os testes sejam determinísticos.
 */
export function generateCode(random: RandomIntFn = cryptoRandomInt): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += BASE62_ALPHABET.charAt(random(BASE62_ALPHABET.length));
  }
  return code;
}

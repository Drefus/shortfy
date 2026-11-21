import { randomInt } from 'node:crypto';
import { InvalidAliasError } from './errors.js';

export const SLUG_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const DEFAULT_SLUG_LENGTH = 7;
export const MIN_SLUG_LENGTH = 3;
export const MAX_SLUG_LENGTH = 30;

/** Caminhos usados pela própria aplicação e que não podem virar atalhos. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'api',
  'health',
  'links',
  'stats',
  'static',
  'public',
  'assets',
  'admin',
]);

const SLUG_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Função que devolve um inteiro aleatório em [0, max). */
export type RandomIntFn = (max: number) => number;

const cryptoRandomInt: RandomIntFn = (max) => randomInt(max);

export function generateSlug(
  length: number = DEFAULT_SLUG_LENGTH,
  random: RandomIntFn = cryptoRandomInt,
): string {
  if (!Number.isInteger(length) || length < 1) {
    throw new RangeError('O tamanho do slug deve ser um inteiro positivo.');
  }
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += SLUG_ALPHABET.charAt(random(SLUG_ALPHABET.length));
  }
  return slug;
}

/**
 * Valida um alias personalizado escolhido pelo usuário e devolve sua forma final.
 * Lança InvalidAliasError quando o alias não é aceitável.
 */
export function validateCustomSlug(input: string): string {
  const slug = input.trim();

  if (slug.length < MIN_SLUG_LENGTH || slug.length > MAX_SLUG_LENGTH) {
    throw new InvalidAliasError(
      `O alias deve ter entre ${MIN_SLUG_LENGTH} e ${MAX_SLUG_LENGTH} caracteres.`,
    );
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new InvalidAliasError('O alias só pode conter letras, números, hífen e sublinhado.');
  }
  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    throw new InvalidAliasError(`O alias "${slug}" é reservado pelo sistema.`);
  }
  return slug;
}

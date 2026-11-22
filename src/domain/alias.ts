import { InvalidAliasError } from './errors.js';

export const MIN_ALIAS_LENGTH = 3;
export const MAX_ALIAS_LENGTH = 30;

/** Caminhos usados pela própria aplicação e que não podem virar atalhos. */
export const RESERVED_ALIASES: ReadonlySet<string> = new Set([
  'api',
  'health',
  'stats',
  'admin',
  'static',
  'meus-links',
]);

const ALIAS_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Valida um alias personalizado escolhido pelo usuário e devolve sua forma final
 * (sem espaços nas pontas). Lança InvalidAliasError quando não é aceitável.
 */
export function validateAlias(input: string): string {
  const alias = input.trim();

  if (alias.length < MIN_ALIAS_LENGTH || alias.length > MAX_ALIAS_LENGTH) {
    throw new InvalidAliasError(
      `O alias deve ter entre ${MIN_ALIAS_LENGTH} e ${MAX_ALIAS_LENGTH} caracteres.`,
    );
  }
  if (!ALIAS_PATTERN.test(alias)) {
    throw new InvalidAliasError('O alias só pode conter letras, números, hífen e sublinhado.');
  }
  if (RESERVED_ALIASES.has(alias.toLowerCase())) {
    throw new InvalidAliasError(`O alias "${alias}" é reservado pelo sistema.`);
  }
  return alias;
}

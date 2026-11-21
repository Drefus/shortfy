import { validateUrl, type UrlValidationOptions } from './url.js';

export const DEFAULT_PROTOCOL = 'https://';

/**
 * Detecta um esquema explícito ("https:", "ftp:", "javascript:"...). Um ":"
 * seguido de dígito é tratado como porta ("example.com:8080"), não como esquema.
 */
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:(?!\d)/i;

/**
 * Remove espaços nas pontas e adiciona "https://" quando o usuário não informou
 * protocolo. Não valida: esquemas como "ftp:" são preservados para que a
 * validação os rejeite.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0 || SCHEME_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return DEFAULT_PROTOCOL + trimmed;
}

/** Normaliza e valida a URL digitada pelo usuário, devolvendo a forma canônica. */
export function parseTargetUrl(input: string, options: UrlValidationOptions = {}): string {
  return validateUrl(normalizeUrl(input), options);
}

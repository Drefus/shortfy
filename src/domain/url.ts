import { InvalidUrlError } from './errors.js';

export const MAX_URL_LENGTH = 2048;

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const HAS_HOST_PATTERN = /^https?:\/\/[^/?#]/i;

export interface UrlValidationOptions {
  /** Domínio do próprio encurtador; URLs para ele (ou subdomínios) são rejeitadas. */
  shortenerHost?: string;
}

function pointsToHost(hostname: string, host: string): boolean {
  const alvo = host.toLowerCase();
  return hostname === alvo || hostname.endsWith(`.${alvo}`);
}

/**
 * Valida uma URL de destino e devolve sua forma canônica.
 * Lança InvalidUrlError quando a URL não é aceitável.
 */
export function validateUrl(input: string, options: UrlValidationOptions = {}): string {
  if (input.length === 0) {
    throw new InvalidUrlError('A URL não pode ser vazia.');
  }
  if (input.length > MAX_URL_LENGTH) {
    throw new InvalidUrlError(`A URL deve ter no máximo ${MAX_URL_LENGTH} caracteres.`);
  }
  if (/\s/.test(input)) {
    throw new InvalidUrlError('A URL não pode conter espaços.');
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new InvalidUrlError('A URL informada é malformada.');
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new InvalidUrlError('A URL deve usar o protocolo http ou https.');
  }
  if (!HAS_HOST_PATTERN.test(input) || !parsed.hostname.includes('.')) {
    throw new InvalidUrlError('A URL deve conter um domínio válido.');
  }
  if (options.shortenerHost && pointsToHost(parsed.hostname, options.shortenerHost)) {
    throw new InvalidUrlError('A URL não pode apontar para o próprio encurtador.');
  }

  return parsed.href;
}

export function isValidUrl(input: string, options: UrlValidationOptions = {}): boolean {
  try {
    validateUrl(input, options);
    return true;
  } catch {
    return false;
  }
}

import { InvalidUrlError } from './errors.js';

export const MAX_URL_LENGTH = 2048;

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Valida uma URL de destino e devolve sua forma normalizada.
 * Aceita apenas http/https (o parser exige host para esses protocolos). Lança InvalidUrlError caso contrário.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    throw new InvalidUrlError('A URL não pode ser vazia.');
  }
  if (trimmed.length > MAX_URL_LENGTH) {
    throw new InvalidUrlError(`A URL deve ter no máximo ${MAX_URL_LENGTH} caracteres.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new InvalidUrlError('A URL informada não é válida.');
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new InvalidUrlError('A URL deve usar o protocolo http ou https.');
  }

  return parsed.toString();
}

export function isValidUrl(input: string): boolean {
  try {
    normalizeUrl(input);
    return true;
  } catch {
    return false;
  }
}

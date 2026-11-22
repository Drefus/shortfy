import { InvalidAliasError, InvalidExpirationError, InvalidUrlError } from '../domain/errors.js';
import type { CreateLinkInput } from '../services/link-service.js';

/** Data e hora sem fuso, como as enviadas por <input type="datetime-local">. */
const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Maior diferença de fuso existente (UTC-14 a UTC+14), em minutos. */
const MAX_TIMEZONE_OFFSET = 14 * 60;

function isBlank(value: unknown): boolean {
  return (
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
  );
}

function parseTimezoneOffset(value: unknown): number {
  const offset = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  return Number.isInteger(offset) && Math.abs(offset) <= MAX_TIMEZONE_OFFSET ? offset : 0;
}

/**
 * Converte a data de expiração recebida em Date. Datas sem fuso são
 * interpretadas no fuso do navegador, informado em minutos no formato de
 * Date#getTimezoneOffset (ex.: 180 para UTC-3); sem essa informação, em UTC.
 * Datas inválidas viram Invalid Date e são rejeitadas pelo serviço.
 */
export function parseExpiration(value: string, timezoneOffsetMinutes = 0): Date {
  const local = LOCAL_DATETIME.exec(value.trim());
  if (!local) {
    return new Date(value);
  }
  const [ano, mes, dia, hora, minuto, segundo] = local.slice(1).map((parte) => Number(parte ?? 0));
  const comoUtc = Date.UTC(ano!, mes! - 1, dia, hora, minuto, segundo);
  return new Date(comoUtc + timezoneOffsetMinutes * 60_000);
}

/**
 * Converte o corpo da requisição (JSON da API ou formulário da página) na
 * entrada do serviço. Campos opcionais vazios são ignorados.
 */
export function parseCreateLinkBody(body: unknown): CreateLinkInput {
  const { url, alias, expiresAt, timezoneOffset } = (body ?? {}) as Record<string, unknown>;

  if (typeof url !== 'string') {
    throw new InvalidUrlError('A URL é obrigatória.');
  }
  const input: CreateLinkInput = { url };

  if (!isBlank(alias)) {
    if (typeof alias !== 'string') {
      throw new InvalidAliasError('O alias deve ser um texto.');
    }
    input.alias = alias;
  }
  if (!isBlank(expiresAt)) {
    if (typeof expiresAt !== 'string') {
      throw new InvalidExpirationError('A data de expiração deve ser uma data ISO 8601.');
    }
    input.expiresAt = parseExpiration(expiresAt, parseTimezoneOffset(timezoneOffset));
  }
  return input;
}

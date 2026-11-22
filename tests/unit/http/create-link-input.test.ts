import { describe, expect, it } from 'vitest';
import {
  InvalidAliasError,
  InvalidExpirationError,
  InvalidUrlError,
} from '../../../src/domain/errors.js';
import { parseCreateLinkBody, parseExpiration } from '../../../src/http/create-link-input.js';

describe('parseExpiration', () => {
  it('deve interpretar data com fuso explícito sem ajustes', () => {
    expect(parseExpiration('2026-03-10T12:00:00-03:00')).toEqual(new Date('2026-03-10T15:00:00Z'));
  });

  it('deve interpretar data sem fuso como UTC quando o fuso não é informado', () => {
    expect(parseExpiration('2026-03-10T12:00')).toEqual(new Date('2026-03-10T12:00:00Z'));
  });

  it('deve aplicar o fuso do navegador a data sem fuso', () => {
    // getTimezoneOffset() de UTC-3 é 180.
    expect(parseExpiration('2026-03-10T12:00', 180)).toEqual(new Date('2026-03-10T15:00:00Z'));
  });

  it('deve considerar os segundos quando informados', () => {
    expect(parseExpiration('2026-03-10T12:00:30')).toEqual(new Date('2026-03-10T12:00:30Z'));
  });

  it('deve devolver data inválida para texto que não é data', () => {
    expect(Number.isNaN(parseExpiration('amanhã').getTime())).toBe(true);
  });
});

describe('parseCreateLinkBody', () => {
  it('deve extrair a URL quando é o único campo', () => {
    expect(parseCreateLinkBody({ url: 'example.com' })).toEqual({ url: 'example.com' });
  });

  it('deve rejeitar corpo sem URL', () => {
    expect(() => parseCreateLinkBody(undefined)).toThrow(InvalidUrlError);
  });

  it('deve ignorar alias e expiração em branco', () => {
    expect(parseCreateLinkBody({ url: 'example.com', alias: '  ', expiresAt: '' })).toEqual({
      url: 'example.com',
    });
  });

  it('deve rejeitar alias que não é texto', () => {
    expect(() => parseCreateLinkBody({ url: 'example.com', alias: ['a'] })).toThrow(
      InvalidAliasError,
    );
  });

  it('deve rejeitar expiração que não é texto', () => {
    expect(() => parseCreateLinkBody({ url: 'example.com', expiresAt: 123 })).toThrow(
      InvalidExpirationError,
    );
  });

  it('deve usar o fuso enviado pelo formulário na data de expiração', () => {
    const input = parseCreateLinkBody({
      url: 'example.com',
      expiresAt: '2026-03-10T12:00',
      timezoneOffset: '180',
    });

    expect(input.expiresAt).toEqual(new Date('2026-03-10T15:00:00Z'));
  });

  it('deve ignorar fuso fora do intervalo possível', () => {
    const input = parseCreateLinkBody({
      url: 'example.com',
      expiresAt: '2026-03-10T12:00',
      timezoneOffset: '5000',
    });

    expect(input.expiresAt).toEqual(new Date('2026-03-10T12:00:00Z'));
  });
});

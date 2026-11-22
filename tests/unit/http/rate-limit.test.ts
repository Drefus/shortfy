import { beforeEach, describe, expect, it } from 'vitest';
import { FixedWindowRateLimiter } from '../../../src/http/rate-limit.js';

describe('FixedWindowRateLimiter', () => {
  let agora: Date;
  let limiter: FixedWindowRateLimiter;

  function consumir(vezes: number, chave = '1.1.1.1'): boolean[] {
    return Array.from({ length: vezes }, () => limiter.tryConsume(chave));
  }

  beforeEach(() => {
    agora = new Date('2026-03-10T12:00:00Z');
    limiter = new FixedWindowRateLimiter({ limit: 3, windowMs: 60_000, clock: () => agora });
  });

  it('deve permitir requisições até o limite da janela', () => {
    expect(consumir(3)).toEqual([true, true, true]);
  });

  it('deve bloquear a requisição que excede o limite', () => {
    consumir(3);

    expect(limiter.tryConsume('1.1.1.1')).toBe(false);
  });

  it('deve contar cada chave separadamente', () => {
    consumir(3, '1.1.1.1');

    expect(limiter.tryConsume('2.2.2.2')).toBe(true);
  });

  it('deve liberar novas requisições quando a janela termina', () => {
    consumir(4);
    agora = new Date('2026-03-10T12:01:00Z');

    expect(limiter.tryConsume('1.1.1.1')).toBe(true);
  });

  it('deve manter o bloqueio até o último instante da janela', () => {
    consumir(3);
    agora = new Date('2026-03-10T12:00:59.999Z');

    expect(limiter.tryConsume('1.1.1.1')).toBe(false);
  });
});

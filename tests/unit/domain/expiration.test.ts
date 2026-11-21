import { describe, expect, it } from 'vitest';
import { LinkExpiredError } from '../../../src/domain/errors.js';
import { assertNotExpired, isExpired, systemClock } from '../../../src/domain/expiration.js';
import type { Link } from '../../../src/domain/link.types.js';

const agora = new Date('2026-06-15T12:00:00Z');

function link(expiresAt?: Date): Link {
  return {
    id: '1',
    code: 'abc1234',
    originalUrl: 'https://example.com/',
    createdAt: new Date('2026-06-01T00:00:00Z'),
    expiresAt,
  };
}

describe('isExpired', () => {
  it('deve considerar que link sem data de expiração nunca expira', () => {
    expect(isExpired(link(), new Date('2999-01-01T00:00:00Z'))).toBe(false);
  });

  it('deve considerar ativo um link cuja expiração está no futuro', () => {
    expect(isExpired(link(new Date('2026-06-16T00:00:00Z')), agora)).toBe(false);
  });

  it('deve considerar expirado um link cuja expiração já passou', () => {
    expect(isExpired(link(new Date('2026-06-14T00:00:00Z')), agora)).toBe(true);
  });

  it('deve considerar expirado um link no instante exato da expiração', () => {
    expect(isExpired(link(new Date(agora.getTime())), agora)).toBe(true);
  });

  it('deve considerar ativo um link um milissegundo antes da expiração', () => {
    expect(isExpired(link(new Date(agora.getTime() + 1)), agora)).toBe(false);
  });
});

describe('assertNotExpired', () => {
  it('deve permitir acesso a link ativo', () => {
    expect(() => assertNotExpired(link(new Date('2026-07-01T00:00:00Z')), agora)).not.toThrow();
  });

  it('deve lançar LinkExpiredError com o código do link expirado', () => {
    expect(() => assertNotExpired(link(new Date('2026-06-01T00:00:00Z')), agora)).toThrow(
      new LinkExpiredError('abc1234'),
    );
  });
});

describe('systemClock', () => {
  it('deve devolver o instante atual', () => {
    const antes = Date.now();
    const instante = systemClock().getTime();
    expect(instante).toBeGreaterThanOrEqual(antes);
    expect(instante).toBeLessThanOrEqual(Date.now());
  });
});

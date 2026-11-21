import { describe, expect, it } from 'vitest';
import type { Click } from '../../../src/domain/link.types.js';
import {
  DIRECT_REFERRER,
  clicksByReferrer,
  clicksPerDay,
  parseReferrer,
} from '../../../src/domain/stats.js';

function click(occurredAt: string, referrer: string | null = null): Click {
  return { code: 'abc1234', occurredAt: new Date(occurredAt), referrer };
}

describe('clicksPerDay', () => {
  const today = new Date('2026-03-10T15:00:00Z');

  it('deve retornar uma entrada por dia do período, mesmo sem cliques', () => {
    expect(clicksPerDay([], today, 3)).toEqual([
      { date: '2026-03-08', count: 0 },
      { date: '2026-03-09', count: 0 },
      { date: '2026-03-10', count: 0 },
    ]);
  });

  it('deve contar os cliques no dia em que ocorreram', () => {
    const clicks = [
      click('2026-03-09T01:00:00Z'),
      click('2026-03-09T23:59:59Z'),
      click('2026-03-10T00:00:00Z'),
    ];
    expect(clicksPerDay(clicks, today, 2)).toEqual([
      { date: '2026-03-09', count: 2 },
      { date: '2026-03-10', count: 1 },
    ]);
  });

  it('deve ignorar cliques fora do período', () => {
    const clicks = [click('2026-03-01T12:00:00Z'), click('2026-03-11T12:00:00Z')];
    const total = clicksPerDay(clicks, today, 7).reduce((soma, dia) => soma + dia.count, 0);
    expect(total).toBe(0);
  });

  it('deve atravessar corretamente a virada de mês', () => {
    const inicioDeMarco = new Date('2026-03-01T08:00:00Z');
    const dias = clicksPerDay([click('2026-02-28T10:00:00Z')], inicioDeMarco, 2);
    expect(dias).toEqual([
      { date: '2026-02-28', count: 1 },
      { date: '2026-03-01', count: 0 },
    ]);
  });

  it.each([0, -3, 1.5])('deve rejeitar quantidade de dias inválida %s', (dias) => {
    expect(() => clicksPerDay([], today, dias)).toThrow(RangeError);
  });
});

describe('clicksByReferrer', () => {
  it('deve retornar lista vazia quando não há cliques', () => {
    expect(clicksByReferrer([])).toEqual([]);
  });

  it('deve agrupar cliques pelo domínio de origem, do mais para o menos frequente', () => {
    const clicks = [
      click('2026-03-10T00:00:00Z', 'twitter.com'),
      click('2026-03-10T00:00:00Z', 'google.com'),
      click('2026-03-10T00:00:00Z', 'google.com'),
    ];
    expect(clicksByReferrer(clicks)).toEqual([
      { referrer: 'google.com', count: 2 },
      { referrer: 'twitter.com', count: 1 },
    ]);
  });

  it('deve agrupar acessos sem referer como acesso direto', () => {
    expect(clicksByReferrer([click('2026-03-10T00:00:00Z', null)])).toEqual([
      { referrer: DIRECT_REFERRER, count: 1 },
    ]);
  });

  it('deve ordenar alfabeticamente referers empatados', () => {
    const clicks = [
      click('2026-03-10T00:00:00Z', 'zeta.com'),
      click('2026-03-10T00:00:00Z', 'alfa.com'),
    ];
    expect(clicksByReferrer(clicks).map((r) => r.referrer)).toEqual(['alfa.com', 'zeta.com']);
  });
});

describe('parseReferrer', () => {
  it('deve extrair o domínio de um referer http(s)', () => {
    expect(parseReferrer('https://www.google.com/search?q=atalho')).toBe('www.google.com');
  });

  it.each([undefined, null, ''])(
    'deve retornar null quando o referer está ausente (%s)',
    (valor) => {
      expect(parseReferrer(valor)).toBeNull();
    },
  );

  it('deve retornar null para referer malformado', () => {
    expect(parseReferrer('não é url')).toBeNull();
  });

  it('deve retornar null para referer com protocolo não http(s)', () => {
    expect(parseReferrer('android-app://com.exemplo')).toBeNull();
  });
});

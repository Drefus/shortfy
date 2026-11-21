import { describe, expect, it } from 'vitest';
import type { Click } from '../../../../src/domain/link.types.js';
import { aggregateClicks } from '../../../../src/domain/stats/aggregate.js';

const agora = new Date('2026-03-10T15:00:00Z');

function click(overrides: Partial<Click> = {}): Click {
  return {
    linkId: 'link-1',
    timestamp: new Date('2026-03-10T10:00:00Z'),
    referrer: 'direto',
    device: 'desktop',
    browser: 'Chrome',
    ...overrides,
  };
}

function cliquesComReferers(...referers: string[]): Click[] {
  return referers.map((referrer) => click({ referrer }));
}

describe('aggregateClicks', () => {
  describe('sem cliques', () => {
    const stats = aggregateClicks([], agora);

    it('deve informar total zero', () => {
      expect(stats.total).toBe(0);
    });

    it('deve listar os 7 dias com contagem zero', () => {
      expect(stats.clicksPerDay).toEqual([
        { date: '2026-03-04', count: 0 },
        { date: '2026-03-05', count: 0 },
        { date: '2026-03-06', count: 0 },
        { date: '2026-03-07', count: 0 },
        { date: '2026-03-08', count: 0 },
        { date: '2026-03-09', count: 0 },
        { date: '2026-03-10', count: 0 },
      ]);
    });

    it('deve devolver rankings vazios', () => {
      expect([stats.topReferrers, stats.byBrowser]).toEqual([[], []]);
    });

    it('deve zerar todos os dispositivos', () => {
      expect(stats.byDevice).toEqual({ desktop: 0, mobile: 0, tablet: 0, bot: 0 });
    });

    it('deve informar que não há último clique', () => {
      expect(stats.lastClickAt).toBeNull();
    });
  });

  describe('total', () => {
    it('deve contar todos os cliques, inclusive os anteriores à janela de 7 dias', () => {
      const clicks = [click(), click({ timestamp: new Date('2025-01-01T00:00:00Z') })];
      expect(aggregateClicks(clicks, agora).total).toBe(2);
    });
  });

  describe('cliques por dia', () => {
    function contagemDo(dia: string, clicks: Click[]): number | undefined {
      return aggregateClicks(clicks, agora).clicksPerDay.find((d) => d.date === dia)?.count;
    }

    it('deve contar os cliques no dia em que ocorreram', () => {
      const clicks = [click(), click(), click({ timestamp: new Date('2026-03-08T12:00:00Z') })];
      expect(contagemDo('2026-03-10', clicks)).toBe(2);
    });

    it('deve atribuir clique às 23:59:59 ao próprio dia', () => {
      const clicks = [click({ timestamp: new Date('2026-03-09T23:59:59.999Z') })];
      expect(contagemDo('2026-03-09', clicks)).toBe(1);
    });

    it('deve atribuir clique à meia-noite ao novo dia', () => {
      const clicks = [click({ timestamp: new Date('2026-03-10T00:00:00Z') })];
      expect(contagemDo('2026-03-10', clicks)).toBe(1);
    });

    it('deve ignorar na série diária cliques de mais de 7 dias atrás', () => {
      const clicks = [click({ timestamp: new Date('2026-03-03T23:59:59Z') })];
      const soma = aggregateClicks(clicks, agora).clicksPerDay.reduce((s, d) => s + d.count, 0);
      expect(soma).toBe(0);
    });

    it('deve atravessar a virada de mês na janela de 7 dias', () => {
      const dias = aggregateClicks([], new Date('2026-03-02T08:00:00Z')).clicksPerDay;
      expect(dias.map((d) => d.date)).toEqual([
        '2026-02-24',
        '2026-02-25',
        '2026-02-26',
        '2026-02-27',
        '2026-02-28',
        '2026-03-01',
        '2026-03-02',
      ]);
    });
  });

  describe('top referers', () => {
    it('deve ordenar referers do mais para o menos frequente', () => {
      const clicks = cliquesComReferers('b.com', 'a.com', 'b.com', 'direto', 'b.com', 'direto');
      expect(aggregateClicks(clicks, agora).topReferrers).toEqual([
        { label: 'b.com', count: 3 },
        { label: 'direto', count: 2 },
        { label: 'a.com', count: 1 },
      ]);
    });

    it('deve desempatar referers com a mesma contagem em ordem alfabética', () => {
      const clicks = cliquesComReferers('zeta.com', 'alfa.com', 'meio.com');
      expect(aggregateClicks(clicks, agora).topReferrers.map((r) => r.label)).toEqual([
        'alfa.com',
        'meio.com',
        'zeta.com',
      ]);
    });

    it('deve limitar o ranking aos 5 referers mais frequentes', () => {
      const clicks = cliquesComReferers(
        'a.com',
        'a.com',
        'b.com',
        'c.com',
        'd.com',
        'e.com',
        'f.com',
      );
      const labels = aggregateClicks(clicks, agora).topReferrers.map((r) => r.label);
      expect(labels).toEqual(['a.com', 'b.com', 'c.com', 'd.com', 'e.com']);
    });
  });

  describe('dispositivos e navegadores', () => {
    it('deve contar cliques por dispositivo', () => {
      const clicks = [
        click({ device: 'mobile' }),
        click({ device: 'mobile' }),
        click({ device: 'tablet' }),
      ];
      expect(aggregateClicks(clicks, agora).byDevice).toEqual({
        desktop: 0,
        mobile: 2,
        tablet: 1,
        bot: 0,
      });
    });

    it('deve contar cliques por navegador do mais para o menos frequente', () => {
      const clicks = [
        click({ browser: 'Firefox' }),
        click({ browser: 'Safari' }),
        click({ browser: 'Firefox' }),
      ];
      expect(aggregateClicks(clicks, agora).byBrowser).toEqual([
        { label: 'Firefox', count: 2 },
        { label: 'Safari', count: 1 },
      ]);
    });
  });

  describe('último clique', () => {
    it('deve informar o clique mais recente mesmo com cliques fora de ordem', () => {
      const recente = new Date('2026-03-10T14:00:00Z');
      const clicks = [
        click({ timestamp: new Date('2026-03-09T10:00:00Z') }),
        click({ timestamp: recente }),
        click({ timestamp: new Date('2026-03-10T09:00:00Z') }),
      ];
      expect(aggregateClicks(clicks, agora).lastClickAt).toEqual(recente);
    });
  });
});

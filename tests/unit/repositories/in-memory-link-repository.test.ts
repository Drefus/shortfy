import { beforeEach, describe, expect, it } from 'vitest';
import { AliasTakenError, LinkNotFoundError } from '../../../src/domain/errors.js';
import type { Click, Link } from '../../../src/domain/link.types.js';
import { InMemoryLinkRepository } from '../../../src/repositories/in-memory-link-repository.js';

function link(overrides: Partial<Link> = {}): Link {
  return {
    id: 'id-1',
    code: 'abc1234',
    originalUrl: 'https://example.com/',
    createdAt: new Date('2026-03-01T10:00:00Z'),
    ...overrides,
  };
}

function click(overrides: Partial<Click> = {}): Click {
  return {
    linkId: 'id-1',
    timestamp: new Date('2026-03-02T10:00:00Z'),
    referrer: 'direto',
    device: 'desktop',
    browser: 'Chrome',
    ...overrides,
  };
}

describe('InMemoryLinkRepository', () => {
  let repo: InMemoryLinkRepository;

  beforeEach(() => {
    repo = new InMemoryLinkRepository();
  });

  describe('save e findByCode', () => {
    it('deve encontrar pelo código um link salvo', async () => {
      const salvo = link({ expiresAt: new Date('2026-04-01T00:00:00Z') });
      await repo.save(salvo);
      expect(await repo.findByCode('abc1234')).toEqual(salvo);
    });

    it('deve devolver null para código inexistente', async () => {
      expect(await repo.findByCode('naoexiste')).toBeNull();
    });

    it('deve diferenciar maiúsculas de minúsculas no código', async () => {
      await repo.save(link({ code: 'AbC1234' }));
      expect(await repo.findByCode('abc1234')).toBeNull();
    });

    it('deve lançar AliasTakenError ao salvar código já existente', async () => {
      await repo.save(link());
      await expect(repo.save(link({ id: 'id-2' }))).rejects.toThrow(AliasTakenError);
    });

    it('não deve ser afetado por alterações no objeto salvo', async () => {
      const original = link();
      await repo.save(original);
      original.originalUrl = 'https://alterado.com/';
      original.createdAt.setUTCFullYear(2000);
      expect(await repo.findByCode('abc1234')).toEqual(link());
    });

    it('não deve ser afetado por alterações no objeto devolvido', async () => {
      await repo.save(link());
      const encontrado = await repo.findByCode('abc1234');
      encontrado!.originalUrl = 'https://alterado.com/';
      expect((await repo.findByCode('abc1234'))?.originalUrl).toBe('https://example.com/');
    });
  });

  describe('existsCode', () => {
    it('deve informar que um código salvo existe', async () => {
      await repo.save(link());
      expect(await repo.existsCode('abc1234')).toBe(true);
    });

    it('deve informar que um código não salvo não existe', async () => {
      expect(await repo.existsCode('abc1234')).toBe(false);
    });
  });

  describe('registerClick e getClicks', () => {
    it('deve devolver os cliques registrados para o link', async () => {
      await repo.save(link());
      await repo.registerClick(click({ device: 'mobile' }));
      expect(await repo.getClicks('id-1')).toEqual([click({ device: 'mobile' })]);
    });

    it('deve devolver os cliques em ordem cronológica', async () => {
      await repo.save(link());
      await repo.registerClick(click({ timestamp: new Date('2026-03-05T00:00:00Z') }));
      await repo.registerClick(click({ timestamp: new Date('2026-03-03T00:00:00Z') }));
      const datas = (await repo.getClicks('id-1')).map((c) => c.timestamp.toISOString());
      expect(datas).toEqual(['2026-03-03T00:00:00.000Z', '2026-03-05T00:00:00.000Z']);
    });

    it('deve separar os cliques de links diferentes', async () => {
      await repo.save(link());
      await repo.save(link({ id: 'id-2', code: 'outro12' }));
      await repo.registerClick(click({ linkId: 'id-2' }));
      expect(await repo.getClicks('id-1')).toEqual([]);
    });

    it('deve devolver lista vazia para link sem cliques', async () => {
      await repo.save(link());
      expect(await repo.getClicks('id-1')).toEqual([]);
    });

    it('deve devolver lista vazia para link inexistente', async () => {
      expect(await repo.getClicks('nao-existe')).toEqual([]);
    });

    it('deve lançar LinkNotFoundError ao registrar clique para link inexistente', async () => {
      await expect(repo.registerClick(click({ linkId: 'nao-existe' }))).rejects.toThrow(
        LinkNotFoundError,
      );
    });
  });

  describe('countClicks', () => {
    it('deve contar apenas os cliques do link informado', async () => {
      await repo.save(link());
      await repo.save(link({ id: 'id-2', code: 'outro12' }));
      await repo.registerClick(click());
      await repo.registerClick(click());
      await repo.registerClick(click({ linkId: 'id-2' }));

      expect(await repo.countClicks('id-1')).toBe(2);
    });

    it('deve devolver zero para link inexistente', async () => {
      expect(await repo.countClicks('nao-existe')).toBe(0);
    });
  });

  describe('listRecent', () => {
    async function salvarTres() {
      await repo.save(link({ id: '1', code: 'antigo1', createdAt: new Date('2026-01-01') }));
      await repo.save(link({ id: '2', code: 'recente', createdAt: new Date('2026-03-01') }));
      await repo.save(link({ id: '3', code: 'meio123', createdAt: new Date('2026-02-01') }));
    }

    it('deve listar os links do mais recente para o mais antigo', async () => {
      await salvarTres();
      const codigos = (await repo.listRecent(10)).map((l) => l.code);
      expect(codigos).toEqual(['recente', 'meio123', 'antigo1']);
    });

    it('deve respeitar o limite informado', async () => {
      await salvarTres();
      expect(await repo.listRecent(2)).toHaveLength(2);
    });

    it('deve listar primeiro o último salvo quando as datas de criação empatam', async () => {
      const mesmaData = new Date('2026-03-01T00:00:00Z');
      await repo.save(link({ id: '1', code: 'primeiro', createdAt: mesmaData }));
      await repo.save(link({ id: '2', code: 'segundo', createdAt: mesmaData }));
      expect((await repo.listRecent(1))[0]?.code).toBe('segundo');
    });

    it('deve devolver lista vazia quando o limite é zero', async () => {
      await salvarTres();
      expect(await repo.listRecent(0)).toEqual([]);
    });

    it('deve devolver lista vazia quando não há links', async () => {
      expect(await repo.listRecent(5)).toEqual([]);
    });
  });
});

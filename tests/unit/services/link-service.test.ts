import { beforeEach, describe, expect, it } from 'vitest';
import {
  AliasTakenError,
  CodeGenerationError,
  InvalidAliasError,
  InvalidExpirationError,
  InvalidUrlError,
  LinkExpiredError,
  LinkNotFoundError,
} from '../../../src/domain/errors.js';
import { InMemoryLinkRepository } from '../../../src/repositories/in-memory-link-repository.js';
import { LinkService, MAX_CODE_ATTEMPTS } from '../../../src/services/link-service.js';

const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/** Gerador que devolve os códigos informados, na ordem. */
function sequenceOf(...codes: string[]): () => string {
  let i = 0;
  return () => codes[i++] ?? `fim${i}`;
}

describe('LinkService', () => {
  let repository: InMemoryLinkRepository;
  let agora: Date;
  let service: LinkService;

  function createService(generateCode = sequenceOf('abc1234', 'def5678')): LinkService {
    return new LinkService({
      repository,
      clock: () => agora,
      generateCode,
      generateId: () => `id-${Math.random()}`,
      shortenerHost: 'shortfy.app',
    });
  }

  beforeEach(() => {
    repository = new InMemoryLinkRepository();
    agora = new Date('2026-03-10T12:00:00Z');
    service = createService();
  });

  describe('createLink', () => {
    it('deve criar link com código gerado e URL normalizada', async () => {
      const link = await service.createLink({ url: '  example.com/pagina ' });

      expect(link.code).toBe('abc1234');
      expect(link.originalUrl).toBe('https://example.com/pagina');
      expect(link.createdAt).toEqual(agora);
    });

    it('deve persistir o link criado no repositório', async () => {
      const link = await service.createLink({ url: 'https://example.com' });

      expect(await repository.findByCode(link.code)).toEqual(link);
    });

    it('deve usar o alias personalizado como código', async () => {
      const link = await service.createLink({ url: 'https://example.com', alias: 'minha-loja' });

      expect(link.code).toBe('minha-loja');
    });

    it('deve rejeitar URL inválida sem salvar nada', async () => {
      await expect(service.createLink({ url: 'ftp://example.com' })).rejects.toThrow(
        InvalidUrlError,
      );
      expect(await repository.listRecent(10)).toEqual([]);
    });

    it('deve rejeitar URL que aponta para o próprio encurtador', async () => {
      await expect(service.createLink({ url: 'https://shortfy.app/abc1234' })).rejects.toThrow(
        InvalidUrlError,
      );
    });

    it('deve rejeitar alias inválido', async () => {
      await expect(service.createLink({ url: 'https://example.com', alias: 'ab' })).rejects.toThrow(
        InvalidAliasError,
      );
    });

    it('deve rejeitar alias já utilizado', async () => {
      await service.createLink({ url: 'https://example.com', alias: 'promo' });

      await expect(
        service.createLink({ url: 'https://outro.com', alias: 'promo' }),
      ).rejects.toThrow(AliasTakenError);
    });

    it('deve gerar outro código quando o primeiro já existe', async () => {
      await service.createLink({ url: 'https://example.com', alias: 'abc1234' });

      const link = await service.createLink({ url: 'https://outro.com' });

      expect(link.code).toBe('def5678');
    });

    it(`deve desistir após ${MAX_CODE_ATTEMPTS} colisões seguidas`, async () => {
      await service.createLink({ url: 'https://example.com', alias: 'repetido' });
      const sempreIgual = createService(() => 'repetido');

      await expect(sempreIgual.createLink({ url: 'https://outro.com' })).rejects.toThrow(
        CodeGenerationError,
      );
    });

    it('deve guardar a data de expiração futura', async () => {
      const expiresAt = new Date('2026-03-11T12:00:00Z');

      const link = await service.createLink({ url: 'https://example.com', expiresAt });

      expect(link.expiresAt).toEqual(expiresAt);
    });

    it('deve rejeitar data de expiração no passado', async () => {
      const expiresAt = new Date('2026-03-09T12:00:00Z');

      await expect(service.createLink({ url: 'https://example.com', expiresAt })).rejects.toThrow(
        InvalidExpirationError,
      );
    });

    it('deve rejeitar data de expiração igual ao instante atual', async () => {
      await expect(
        service.createLink({ url: 'https://example.com', expiresAt: new Date(agora) }),
      ).rejects.toThrow(InvalidExpirationError);
    });

    it('deve rejeitar data de expiração inválida', async () => {
      await expect(
        service.createLink({ url: 'https://example.com', expiresAt: new Date('não é data') }),
      ).rejects.toThrow(InvalidExpirationError);
    });
  });

  describe('resolve', () => {
    it('deve devolver a URL original do link', async () => {
      const link = await service.createLink({ url: 'https://example.com/destino' });

      expect(await service.resolve(link.code)).toBe('https://example.com/destino');
    });

    it('deve registrar o clique com referer, dispositivo e navegador', async () => {
      const link = await service.createLink({ url: 'https://example.com' });

      await service.resolve(link.code, {
        referrer: 'https://www.google.com/search?q=x',
        userAgent: CHROME_DESKTOP,
      });

      expect(await repository.getClicks(link.id)).toEqual([
        {
          linkId: link.id,
          timestamp: agora,
          referrer: 'www.google.com',
          device: 'desktop',
          browser: 'Chrome',
        },
      ]);
    });

    it('deve lançar LinkNotFoundError para código inexistente', async () => {
      await expect(service.resolve('naoexiste')).rejects.toThrow(LinkNotFoundError);
    });

    it('deve lançar LinkExpiredError para link expirado sem registrar clique', async () => {
      const link = await service.createLink({
        url: 'https://example.com',
        expiresAt: new Date('2026-03-10T13:00:00Z'),
      });
      agora = new Date('2026-03-10T13:00:00Z');

      await expect(service.resolve(link.code)).rejects.toThrow(LinkExpiredError);
      expect(await repository.getClicks(link.id)).toEqual([]);
    });
  });

  describe('getLink', () => {
    it('deve devolver o link pelo código', async () => {
      const link = await service.createLink({ url: 'https://example.com' });

      expect(await service.getLink(link.code)).toEqual(link);
    });

    it('deve lançar LinkNotFoundError para código inexistente', async () => {
      await expect(service.getLink('naoexiste')).rejects.toThrow(LinkNotFoundError);
    });
  });

  describe('findLinkSummaries', () => {
    it('deve devolver os links na ordem dos códigos informados', async () => {
      await service.createLink({ url: 'https://um.com', alias: 'primeiro' });
      await service.createLink({ url: 'https://dois.com', alias: 'segundo' });

      const resumos = await service.findLinkSummaries(['segundo', 'primeiro']);

      expect(resumos.map(({ link }) => link.code)).toEqual(['segundo', 'primeiro']);
    });

    it('deve ignorar códigos que não existem', async () => {
      await service.createLink({ url: 'https://um.com', alias: 'primeiro' });

      const resumos = await service.findLinkSummaries(['naoexiste', 'primeiro']);

      expect(resumos.map(({ link }) => link.code)).toEqual(['primeiro']);
    });

    it('deve informar o total de cliques de cada link', async () => {
      await service.createLink({ url: 'https://um.com', alias: 'primeiro' });
      await service.createLink({ url: 'https://dois.com', alias: 'segundo' });
      await service.resolve('primeiro');
      await service.resolve('primeiro');

      const resumos = await service.findLinkSummaries(['primeiro', 'segundo']);

      expect(resumos.map((r) => r.totalClicks)).toEqual([2, 0]);
    });
  });

  describe('getStats', () => {
    it('deve devolver o link e as estatísticas agregadas dos cliques', async () => {
      const link = await service.createLink({ url: 'https://example.com' });
      await service.resolve(link.code, { userAgent: CHROME_DESKTOP });
      await service.resolve(link.code, { userAgent: CHROME_DESKTOP });

      const { link: encontrado, stats } = await service.getStats(link.code);

      expect(encontrado).toEqual(link);
      expect(stats.total).toBe(2);
      expect(stats.lastClickAt).toEqual(agora);
    });

    it('deve agrupar os cliques por dia no fuso configurado', async () => {
      service = new LinkService({
        repository,
        clock: () => agora,
        statsTimeZone: 'America/Sao_Paulo',
      });
      const link = await service.createLink({ url: 'https://example.com', alias: 'noite' });
      agora = new Date('2026-03-11T01:00:00Z'); // 22:00 do dia 10 em São Paulo
      await service.resolve(link.code);

      const { stats } = await service.getStats(link.code);

      expect(stats.clicksPerDay.at(-1)).toEqual({ date: '2026-03-10', count: 1 });
    });

    it('deve informar total zero para link sem cliques', async () => {
      const link = await service.createLink({ url: 'https://example.com' });

      const { stats } = await service.getStats(link.code);

      expect(stats.total).toBe(0);
    });

    it('deve continuar exibindo estatísticas depois que o link expira', async () => {
      const link = await service.createLink({
        url: 'https://example.com',
        expiresAt: new Date('2026-03-10T13:00:00Z'),
      });
      agora = new Date('2026-03-12T00:00:00Z');

      await expect(service.getStats(link.code)).resolves.toMatchObject({ link });
    });

    it('deve lançar LinkNotFoundError para código inexistente', async () => {
      await expect(service.getStats('naoexiste')).rejects.toThrow(LinkNotFoundError);
    });
  });
});

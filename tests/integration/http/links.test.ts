import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, type AppDeps } from '../../../src/app.js';

const BASE_URL = 'https://shortfy.app';

describe('API de links', () => {
  let agora: Date;
  let app: ReturnType<typeof createApp>;

  function buildApp(overrides: Partial<AppDeps> = {}): ReturnType<typeof createApp> {
    let i = 0;
    return createApp({
      baseUrl: BASE_URL,
      clock: () => agora,
      generateCode: () => `cod${String(i++).padStart(4, '0')}`,
      ...overrides,
    });
  }

  beforeEach(() => {
    agora = new Date('2026-03-10T12:00:00Z');
    app = buildApp();
  });

  describe('POST /api/links', () => {
    it('deve responder 201 com código, link curto e URL original', async () => {
      const response = await request(app).post('/api/links').send({ url: 'example.com/a' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        code: 'cod0000',
        shortUrl: 'https://shortfy.app/cod0000',
        originalUrl: 'https://example.com/a',
        expiresAt: null,
      });
    });

    it('deve aceitar alias personalizado e data de expiração', async () => {
      const response = await request(app)
        .post('/api/links')
        .send({ url: 'https://example.com', alias: 'promo', expiresAt: '2026-04-01T00:00:00Z' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        code: 'promo',
        shortUrl: 'https://shortfy.app/promo',
        expiresAt: '2026-04-01T00:00:00.000Z',
      });
    });

    it('deve ignorar alias e expiração enviados vazios', async () => {
      const response = await request(app)
        .post('/api/links')
        .send({ url: 'https://example.com', alias: '', expiresAt: '' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ code: 'cod0000', expiresAt: null });
    });

    it('deve responder 400 quando a URL não é informada', async () => {
      const response = await request(app).post('/api/links').send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'A URL é obrigatória.' });
    });

    it('deve responder 400 para URL com protocolo não permitido', async () => {
      const response = await request(app).post('/api/links').send({ url: 'javascript:alert(1)' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/http ou https/);
    });

    it('deve responder 400 para alias inválido', async () => {
      const response = await request(app)
        .post('/api/links')
        .send({ url: 'https://example.com', alias: 'com espaço' });

      expect(response.status).toBe(400);
    });

    it('deve responder 400 para alias que não é texto', async () => {
      const response = await request(app)
        .post('/api/links')
        .send({ url: 'https://example.com', alias: 123 });

      expect(response.status).toBe(400);
    });

    it('deve responder 400 para data de expiração no passado', async () => {
      const response = await request(app)
        .post('/api/links')
        .send({ url: 'https://example.com', expiresAt: '2020-01-01T00:00:00Z' });

      expect(response.status).toBe(400);
    });

    it('deve responder 400 para data de expiração que não é texto', async () => {
      const response = await request(app)
        .post('/api/links')
        .send({ url: 'https://example.com', expiresAt: 1234 });

      expect(response.status).toBe(400);
    });

    it('deve responder 400 para corpo com JSON malformado', async () => {
      const response = await request(app)
        .post('/api/links')
        .set('Content-Type', 'application/json')
        .send('{"url":');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'O corpo da requisição não é um JSON válido.' });
    });

    it('deve responder 409 quando o alias já está em uso', async () => {
      await request(app).post('/api/links').send({ url: 'https://example.com', alias: 'promo' });

      const response = await request(app)
        .post('/api/links')
        .send({ url: 'https://outro.com', alias: 'promo' });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: 'O alias "promo" já está em uso.' });
    });

    it('deve responder 503 quando não consegue gerar código livre', async () => {
      app = buildApp({ generateCode: () => 'promo' });
      await request(app).post('/api/links').send({ url: 'https://example.com', alias: 'promo' });

      const response = await request(app).post('/api/links').send({ url: 'https://outro.com' });

      expect(response.status).toBe(503);
    });

    it('deve responder 429 quando o mesmo IP excede o limite de criação', async () => {
      app = buildApp({ rateLimit: { limit: 2, windowMs: 60_000 } });
      const criar = () => request(app).post('/api/links').send({ url: 'https://example.com' });
      await criar();
      await criar();

      const response = await criar();

      expect(response.status).toBe(429);
    });

    it('deve limitar por IP real do cliente quando há proxy confiável', async () => {
      app = buildApp({ rateLimit: { limit: 1, windowMs: 60_000 }, trustProxy: 1 });
      const criar = (ip: string) =>
        request(app)
          .post('/api/links')
          .set('X-Forwarded-For', ip)
          .send({ url: 'https://example.com' });
      await criar('203.0.113.1');

      expect((await criar('203.0.113.2')).status).toBe(201);
      expect((await criar('203.0.113.1')).status).toBe(429);
    });

    it('deve ignorar X-Forwarded-For quando não há proxy confiável', async () => {
      app = buildApp({ rateLimit: { limit: 1, windowMs: 60_000 } });
      const criar = (ip: string) =>
        request(app)
          .post('/api/links')
          .set('X-Forwarded-For', ip)
          .send({ url: 'https://example.com' });
      await criar('203.0.113.1');

      expect((await criar('203.0.113.2')).status).toBe(429);
    });
  });

  describe('GET /api/links/:code/stats', () => {
    it('deve responder 200 com os dados do link e as estatísticas', async () => {
      await request(app).post('/api/links').send({ url: 'https://example.com', alias: 'promo' });
      await request(app).get('/promo').set('Referer', 'https://news.ycombinator.com/item');

      const response = await request(app).get('/api/links/promo/stats');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        code: 'promo',
        shortUrl: 'https://shortfy.app/promo',
        originalUrl: 'https://example.com/',
        createdAt: '2026-03-10T12:00:00.000Z',
        expiresAt: null,
        stats: {
          total: 1,
          topReferrers: [{ label: 'news.ycombinator.com', count: 1 }],
          lastClickAt: '2026-03-10T12:00:00.000Z',
        },
      });
    });

    it('deve responder 404 para código inexistente', async () => {
      const response = await request(app).get('/api/links/naoexiste/stats');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Nenhum link encontrado para o código "naoexiste".' });
    });
  });

  describe('rotas inexistentes da API', () => {
    it('deve responder 404 em JSON', async () => {
      const response = await request(app).get('/api/nao-existe');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Página não encontrada.' });
    });
  });
});

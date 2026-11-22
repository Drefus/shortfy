import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../src/app.js';
import { InMemoryLinkRepository } from '../../../src/repositories/in-memory-link-repository.js';

describe('GET /:code', () => {
  let agora: Date;
  let app: ReturnType<typeof createApp>;

  async function criarLink(body: Record<string, string>): Promise<void> {
    await request(app).post('/api/links').send(body).expect(201);
  }

  beforeEach(() => {
    agora = new Date('2026-03-10T12:00:00Z');
    app = createApp({ baseUrl: 'https://shortfy.app', clock: () => agora });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve redirecionar com 302 para a URL original', async () => {
    await criarLink({ url: 'https://example.com/destino', alias: 'promo' });

    const response = await request(app).get('/promo');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://example.com/destino');
  });

  it('deve contabilizar cada acesso nas estatísticas', async () => {
    await criarLink({ url: 'https://example.com', alias: 'promo' });

    await request(app).get('/promo');
    await request(app).get('/promo');

    const stats = await request(app).get('/api/links/promo/stats');
    expect(stats.body.stats.total).toBe(2);
  });

  it('deve responder 404 com página HTML para código inexistente', async () => {
    const response = await request(app).get('/naoexiste');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('Nenhum link encontrado');
  });

  it('deve escapar o código informado na página de erro', async () => {
    const response = await request(app).get('/%3Cscript%3E');

    expect(response.status).toBe(404);
    expect(response.text).not.toContain('<script>');
    expect(response.text).toContain('&lt;script&gt;');
  });

  it('deve responder 410 para link expirado', async () => {
    await criarLink({
      url: 'https://example.com',
      alias: 'promo',
      expiresAt: '2026-03-10T13:00:00Z',
    });
    agora = new Date('2026-03-10T14:00:00Z');

    const response = await request(app).get('/promo');

    expect(response.status).toBe(410);
    expect(response.text).toContain('expirou');
  });

  it('deve responder 500 sem expor detalhes quando ocorre erro inesperado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const repository = new InMemoryLinkRepository();
    vi.spyOn(repository, 'findByCode').mockRejectedValue(new Error('conexão perdida'));
    app = createApp({ repository });

    const response = await request(app).get('/promo');

    expect(response.status).toBe(500);
    expect(response.text).toContain('Erro interno do servidor.');
    expect(response.text).not.toContain('conexão perdida');
  });
});

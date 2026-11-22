import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, type AppDeps } from '../../../src/app.js';

describe('páginas web', () => {
  let agora: Date;
  let app: ReturnType<typeof createApp>;

  function buildApp(overrides: Partial<AppDeps> = {}): ReturnType<typeof createApp> {
    return createApp({ baseUrl: 'https://shortfy.app', clock: () => agora, ...overrides });
  }

  function enviarFormulario(campos: Record<string, string>) {
    return request(app).post('/').type('form').send(campos);
  }

  beforeEach(() => {
    agora = new Date('2026-03-10T12:00:00Z');
    app = buildApp();
  });

  describe('GET /', () => {
    it('deve exibir o formulário de encurtar', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('data-testid="url-input"');
      expect(response.text).toContain('data-testid="shorten-button"');
    });

    it('deve informar quando o navegador ainda não criou links', async () => {
      const response = await request(app).get('/');

      expect(response.text).toContain('Você ainda não criou links neste navegador.');
    });

    it('deve listar os links criados neste navegador', async () => {
      const navegador = request.agent(app);
      await navegador
        .post('/')
        .type('form')
        .send({ url: 'https://example.com/um', alias: 'link-um' });

      const response = await navegador.get('/');

      expect(response.text).toContain('data-testid="recent-links"');
      expect(response.text).toContain('https://shortfy.app/link-um');
    });

    it('não deve mostrar links criados em outro navegador', async () => {
      await request
        .agent(app)
        .post('/')
        .type('form')
        .send({ url: 'https://example.com', alias: 'alheio' });

      const response = await request.agent(app).get('/');

      expect(response.text).not.toContain('https://shortfy.app/alheio');
      expect(response.text).toContain('Você ainda não criou links neste navegador.');
    });

    it('deve mostrar a quantidade de cliques de cada link recente', async () => {
      const navegador = request.agent(app);
      await navegador.post('/').type('form').send({ url: 'https://um.com', alias: 'primeiro' });
      await request(app).get('/primeiro');
      await request(app).get('/primeiro');

      const response = await navegador.get('/');

      expect(response.text).toMatch(/data-testid="recent-clicks">\s*2 cliques\s*</);
      expect(response.text).toContain('Estatísticas detalhadas');
    });

    it('deve usar o singular para um único clique', async () => {
      const navegador = request.agent(app);
      await navegador.post('/').type('form').send({ url: 'https://um.com', alias: 'primeiro' });
      await request(app).get('/primeiro');

      const response = await navegador.get('/');

      expect(response.text).toMatch(/data-testid="recent-clicks">\s*1 clique\s*</);
    });

    it('deve listar primeiro o link criado por último', async () => {
      const navegador = request.agent(app);
      await navegador.post('/').type('form').send({ url: 'https://um.com', alias: 'primeiro' });
      await navegador.post('/').type('form').send({ url: 'https://dois.com', alias: 'segundo' });

      const { text } = await navegador.get('/');

      expect(text.indexOf('/segundo')).toBeLessThan(text.indexOf('/primeiro'));
    });

    it('deve ignorar o parâmetro criado com código inexistente', async () => {
      const response = await request(app).get('/?criado=naoexiste');

      expect(response.status).toBe(200);
      expect(response.text).not.toContain('data-testid="result"');
    });
  });

  describe('POST /', () => {
    it('deve guardar o código criado num cookie httpOnly do navegador', async () => {
      const response = await enviarFormulario({ url: 'example.com', alias: 'promo' });

      const cookie = String(response.headers['set-cookie']);
      expect(cookie).toContain('shortfy_recentes=promo');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
    });

    it('deve criar o link e redirecionar para a página de resultado', async () => {
      const response = await enviarFormulario({ url: 'example.com', alias: 'promo' });

      expect(response.status).toBe(303);
      expect(response.headers.location).toBe('/?criado=promo');
    });

    it('deve exibir o link curto, o botão copiar e o link de estatísticas no resultado', async () => {
      await enviarFormulario({ url: 'example.com', alias: 'promo' });

      const response = await request(app).get('/?criado=promo');

      expect(response.text).toContain('data-testid="result"');
      expect(response.text).toContain('https://shortfy.app/promo');
      expect(response.text).toContain('data-testid="copy-button"');
      expect(response.text).toContain('href="/stats/promo"');
    });

    it('deve oferecer botão para fechar o resultado e voltar à página inicial', async () => {
      await enviarFormulario({ url: 'example.com', alias: 'promo' });

      const response = await request(app).get('/?criado=promo');

      expect(response.text).toMatch(/href="\/"[^>]*data-testid="close-result"/);
    });

    it('deve responder 400 com a mensagem abaixo do campo de URL', async () => {
      const response = await enviarFormulario({ url: 'ftp://example.com' });

      expect(response.status).toBe(400);
      expect(response.text).toContain('data-testid="error-url"');
      expect(response.text).toContain('A URL deve usar o protocolo http ou https.');
    });

    it('deve manter os valores digitados quando há erro', async () => {
      const response = await enviarFormulario({ url: 'ftp://example.com', alias: 'meu-alias' });

      expect(response.text).toContain('value="ftp://example.com"');
      expect(response.text).toContain('value="meu-alias"');
    });

    it('deve responder 409 com a mensagem abaixo do campo de alias já usado', async () => {
      await enviarFormulario({ url: 'https://example.com', alias: 'promo' });

      const response = await enviarFormulario({ url: 'https://outro.com', alias: 'promo' });

      expect(response.status).toBe(409);
      expect(response.text).toContain('data-testid="error-alias"');
      expect(response.text).toContain('já está em uso');
    });

    it('deve mostrar erro no campo de expiração para data no passado', async () => {
      const response = await enviarFormulario({
        url: 'https://example.com',
        expiresAt: '2026-03-01T10:00',
        timezoneOffset: '180',
      });

      expect(response.status).toBe(400);
      expect(response.text).toContain('data-testid="error-expires"');
    });

    it('deve escapar o valor digitado ao exibi-lo de volta', async () => {
      const response = await enviarFormulario({ url: '"><script>alert(1)</script>' });

      expect(response.status).toBe(400);
      expect(response.text).not.toContain('<script>alert(1)</script>');
    });

    it('deve responder com a página 429 quando o limite de criação é excedido', async () => {
      app = buildApp({ rateLimit: { limit: 1, windowMs: 60_000 } });
      await enviarFormulario({ url: 'https://example.com' });

      const response = await enviarFormulario({ url: 'https://example.com' });

      expect(response.status).toBe(429);
      expect(response.text).toContain('data-testid="error-page"');
    });
  });

  describe('GET /meus-links', () => {
    async function criarLinks(navegador: ReturnType<typeof request.agent>, quantidade: number) {
      for (let i = 1; i <= quantidade; i++) {
        await navegador
          .post('/')
          .type('form')
          .send({ url: `https://site${i}.com`, alias: `link-${i}` });
      }
    }

    it('deve listar todos os links do navegador, além dos 10 da página inicial', async () => {
      const navegador = request.agent(app);
      await criarLinks(navegador, 12);

      const response = await navegador.get('/meus-links');

      expect(response.status).toBe(200);
      expect(response.text).toContain('12 links criados neste navegador');
      expect(response.text.match(/class="recent-item"/g)).toHaveLength(12);
      expect(response.text).toContain('https://shortfy.app/link-1<');
    });

    it('deve mostrar na página inicial só os 10 mais recentes e o link para ver todos', async () => {
      const navegador = request.agent(app);
      await criarLinks(navegador, 11);

      const response = await navegador.get('/');

      expect(response.text.match(/class="recent-item"/g)).toHaveLength(10);
      expect(response.text).not.toContain('https://shortfy.app/link-1<');
      expect(response.text).toContain('href="/meus-links"');
    });

    it('não deve oferecer o link para ver todos quando há até 10 links', async () => {
      const navegador = request.agent(app);
      await criarLinks(navegador, 10);

      const response = await navegador.get('/');

      expect(response.text).not.toContain('href="/meus-links"');
    });

    it('deve informar quando o navegador ainda não criou links', async () => {
      await criarLinks(request.agent(app), 2);

      const response = await request.agent(app).get('/meus-links');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Você ainda não criou links neste navegador.');
      expect(response.text).not.toContain('class="recent-item"');
    });
  });

  describe('GET /stats/:code', () => {
    it('deve exibir total de cliques, gráfico e tabelas do link', async () => {
      await enviarFormulario({ url: 'https://example.com', alias: 'promo' });
      await request(app).get('/promo').set('Referer', 'https://www.google.com/');
      await request(app).get('/promo');

      const response = await request(app).get('/stats/promo');

      expect(response.status).toBe(200);
      expect(response.text).toMatch(/data-testid="total-clicks">\s*2\s*</);
      expect(response.text).toContain('id="grafico-cliques"');
      expect(response.text).toContain('www.google.com');
      expect(response.text).toContain('data-testid="devices-table"');
    });

    it('deve informar quando o link ainda não recebeu cliques', async () => {
      await enviarFormulario({ url: 'https://example.com', alias: 'promo' });

      const response = await request(app).get('/stats/promo');

      expect(response.text).toContain('Nenhum clique ainda');
    });

    it('deve responder 404 com página amigável para código inexistente', async () => {
      const response = await request(app).get('/stats/naoexiste');

      expect(response.status).toBe(404);
      expect(response.text).toContain('Link não encontrado');
    });
  });

  describe('páginas de erro e arquivos estáticos', () => {
    it('deve exibir a página 410 com título amigável para link expirado', async () => {
      await enviarFormulario({
        url: 'https://example.com',
        alias: 'promo',
        expiresAt: '2026-03-10T13:00:00Z',
      });
      agora = new Date('2026-03-11T00:00:00Z');

      const response = await request(app).get('/promo');

      expect(response.status).toBe(410);
      expect(response.text).toContain('Link expirado');
    });

    it('deve servir a página de destino de testes quando habilitada', async () => {
      app = buildApp({ enableTestRoutes: true });

      const response = await request(app).get('/__test/destino');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Página de destino');
    });

    it('não deve expor a página de destino de testes por padrão', async () => {
      const response = await request(app).get('/__test/destino');

      expect(response.status).toBe(404);
    });

    it('deve servir o ícone da aplicação em /favicon.ico', async () => {
      const response = await request(app).get('/favicon.ico');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/image\/(x-icon|vnd\.microsoft\.icon)/);
    });

    it('deve usar apenas o nome da aplicação como título da página inicial', async () => {
      const response = await request(app).get('/');

      expect(response.text).toContain('<title>Shortfy</title>');
    });

    it('deve servir a folha de estilos', async () => {
      const response = await request(app).get('/static/css/styles.css');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/css/);
    });
  });
});

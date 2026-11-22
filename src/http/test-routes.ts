import { Router } from 'express';

/**
 * Rotas de apoio aos testes end-to-end, registradas apenas com NODE_ENV=test.
 * /__test/destino é um destino local para testar o redirecionamento sem internet.
 */
export function testRoutes(): Router {
  const router = Router();

  router.get('/__test/destino', (_req, res) => {
    res
      .type('html')
      .send(
        '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Destino</title></head>' +
          '<body><h1>Página de destino</h1></body></html>',
      );
  });

  return router;
}

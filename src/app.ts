import express, { type Express } from 'express';
import { healthRoutes } from './http/health-routes.js';

/**
 * Dependências injetadas na aplicação. Receber tudo por parâmetro permite que
 * os testes montem o app com implementações em memória.
 */
export type AppDeps = Record<string, never>;

export function createApp(_deps: AppDeps = {}): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(healthRoutes());

  return app;
}

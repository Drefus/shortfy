import express, { type Express } from 'express';
import { generateCode } from './domain/code.js';
import { systemClock, type Clock } from './domain/expiration.js';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { healthRoutes } from './http/health-routes.js';
import { linkRoutes } from './http/link-routes.js';
import { rateLimit } from './http/rate-limit.js';
import { redirectRoutes } from './http/redirect-routes.js';
import { InMemoryLinkRepository } from './repositories/in-memory-link-repository.js';
import type { LinkRepository } from './repositories/link-repository.types.js';
import { LinkService } from './services/link-service.js';

export const DEFAULT_BASE_URL = 'http://localhost:3000';
export const DEFAULT_RATE_LIMIT = { limit: 30, windowMs: 60_000 };

/**
 * Dependências injetadas na aplicação. Receber tudo por parâmetro permite que
 * os testes montem o app com implementações em memória e relógio falso.
 */
export interface AppDeps {
  repository?: LinkRepository;
  clock?: Clock;
  generateCode?: () => string;
  /** Endereço público usado para montar os links curtos (BASE_URL). */
  baseUrl?: string;
  rateLimit?: { limit: number; windowMs: number };
}

export function createApp(deps: AppDeps = {}): Express {
  const clock = deps.clock ?? systemClock;
  const baseUrl = deps.baseUrl ?? DEFAULT_BASE_URL;
  const service = new LinkService({
    repository: deps.repository ?? new InMemoryLinkRepository(),
    clock,
    generateCode: deps.generateCode ?? (() => generateCode()),
    shortenerHost: new URL(baseUrl).hostname,
  });

  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(healthRoutes());
  app.use(
    linkRoutes({
      service,
      baseUrl,
      createLimiter: rateLimit({ ...(deps.rateLimit ?? DEFAULT_RATE_LIMIT), clock }),
    }),
  );
  app.use(redirectRoutes(service));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

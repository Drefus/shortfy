import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import { generateCode } from './domain/code.js';
import { systemClock, type Clock } from './domain/expiration.js';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { healthRoutes } from './http/health-routes.js';
import { linkRoutes } from './http/link-routes.js';
import { pageRoutes } from './http/page-routes.js';
import { rateLimit } from './http/rate-limit.js';
import { redirectRoutes } from './http/redirect-routes.js';
import { DISPLAY_TIME_ZONE, formatDateTime } from './http/view-helpers.js';
import { InMemoryLinkRepository } from './repositories/in-memory-link-repository.js';
import type { LinkRepository } from './repositories/link-repository.types.js';
import { LinkService } from './services/link-service.js';

export const DEFAULT_BASE_URL = 'http://localhost:3000';
export const DEFAULT_RATE_LIMIT = { limit: 30, windowMs: 60_000 };

/**
 * Views e arquivos estáticos ficam em src/ e não são copiados pelo build:
 * tanto src/app.ts (tsx) quanto dist/app.ts (build) estão um nível abaixo da raiz.
 */
const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

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
    statsTimeZone: DISPLAY_TIME_ZONE,
  });
  // Um único limitador para a API e o formulário: os dois criam links.
  const createLimiter = rateLimit({ ...(deps.rateLimit ?? DEFAULT_RATE_LIMIT), clock });

  const app = express();

  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(SRC_DIR, 'views'));
  app.locals.formatDateTime = formatDateTime;

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use('/static', express.static(path.join(SRC_DIR, 'public')));
  app.use(healthRoutes());
  app.use(linkRoutes({ service, baseUrl, createLimiter }));
  app.use(pageRoutes({ service, baseUrl, createLimiter }));
  app.use(redirectRoutes(service));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

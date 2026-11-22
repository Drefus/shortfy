import { createApp, DEFAULT_RATE_LIMIT } from './app.js';
import { createPool } from './db/pool.js';
import { InMemoryLinkRepository } from './repositories/in-memory-link-repository.js';
import type { LinkRepository } from './repositories/link-repository.types.js';
import { PostgresLinkRepository } from './repositories/postgres-link-repository.js';

const port = Number(process.env.PORT ?? 3000);
const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;
/** Máximo de links criados por minuto por IP (os testes e2e usam um valor alto). */
const rateLimitPerMinute = Number(process.env.RATE_LIMIT_PER_MINUTE ?? DEFAULT_RATE_LIMIT.limit);

function createRepository(): LinkRepository {
  const storage = process.env.STORAGE ?? 'memory';
  if (storage === 'postgres') {
    return new PostgresLinkRepository(createPool());
  }
  if (storage === 'memory') {
    return new InMemoryLinkRepository();
  }
  throw new Error(`STORAGE inválido: "${storage}". Use "memory" ou "postgres".`);
}

const app = createApp({
  repository: createRepository(),
  baseUrl,
  rateLimit: { limit: rateLimitPerMinute, windowMs: 60_000 },
  enableTestRoutes: process.env.NODE_ENV === 'test',
});

app.listen(port, () => {
  console.log(`Shortfy rodando em http://localhost:${port} (links em ${baseUrl})`);
});

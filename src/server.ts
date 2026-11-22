import { createApp } from './app.js';
import { ConfigError, loadConfig, type AppConfig } from './config.js';
import { createPool } from './db/pool.js';
import { InMemoryLinkRepository } from './repositories/in-memory-link-repository.js';
import type { LinkRepository } from './repositories/link-repository.types.js';
import { PostgresLinkRepository } from './repositories/postgres-link-repository.js';

function createRepository(config: AppConfig): LinkRepository {
  return config.storage === 'postgres'
    ? new PostgresLinkRepository(createPool(config.databaseUrl))
    : new InMemoryLinkRepository();
}

let config: AppConfig;
try {
  config = loadConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(`Configuração inválida: ${error.message}`);
    process.exit(1);
  }
  throw error;
}

const app = createApp({
  repository: createRepository(config),
  baseUrl: config.baseUrl,
  rateLimit: { limit: config.rateLimitPerMinute, windowMs: 60_000 },
  trustProxy: config.trustProxy,
  enableTestRoutes: config.enableTestRoutes,
});

app.listen(config.port, () => {
  console.log(
    `Shortfy rodando na porta ${config.port} (links em ${config.baseUrl}, armazenamento: ${config.storage})`,
  );
});

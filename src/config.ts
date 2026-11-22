export type Storage = 'memory' | 'postgres';

export interface AppConfig {
  port: number;
  /** Endereço público usado para montar os links curtos, sem barra final. */
  baseUrl: string;
  storage: Storage;
  /** Presente apenas quando storage é "postgres". */
  databaseUrl?: string;
  rateLimitPerMinute: number;
  /** Quantidade de proxies reversos confiáveis à frente do app (0 desliga). */
  trustProxy: number;
  enableTestRoutes: boolean;
}

export const DEFAULT_PORT = 3000;
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 30;
/** No Render há um proxy reverso à frente do app; localmente o valor é inofensivo. */
export const DEFAULT_TRUST_PROXY = 1;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

type Env = Record<string, string | undefined>;

/** Variáveis vazias (comuns em painéis de deploy) contam como não definidas. */
function read(env: Env, key: string): string | undefined {
  const valor = env[key]?.trim();
  return valor ? valor : undefined;
}

function readInteger(env: Env, key: string, fallback: number, min: number, max: number): number {
  const bruto = read(env, key);
  if (bruto === undefined) {
    return fallback;
  }
  const valor = Number(bruto);
  if (!Number.isInteger(valor) || valor < min || valor > max) {
    throw new ConfigError(`${key} inválida: "${bruto}". Use um inteiro entre ${min} e ${max}.`);
  }
  return valor;
}

function readBaseUrl(env: Env, port: number): string {
  // O Render expõe RENDER_EXTERNAL_URL automaticamente; BASE_URL tem prioridade.
  const bruto =
    read(env, 'BASE_URL') ?? read(env, 'RENDER_EXTERNAL_URL') ?? `http://localhost:${port}`;
  let url: URL;
  try {
    url = new URL(bruto);
  } catch {
    throw new ConfigError(`BASE_URL inválida: "${bruto}".`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ConfigError(`BASE_URL deve usar http ou https: "${bruto}".`);
  }
  return bruto.replace(/\/+$/, '');
}

function readStorage(env: Env): Storage {
  const storage = read(env, 'STORAGE') ?? 'memory';
  if (storage !== 'memory' && storage !== 'postgres') {
    throw new ConfigError(`STORAGE inválido: "${storage}". Use "memory" ou "postgres".`);
  }
  return storage;
}

/** Lê e valida as variáveis de ambiente, falhando cedo com mensagens claras. */
export function loadConfig(env: Env = process.env): AppConfig {
  const port = readInteger(env, 'PORT', DEFAULT_PORT, 1, 65_535);
  const storage = readStorage(env);
  const databaseUrl = read(env, 'DATABASE_URL');

  if (storage === 'postgres' && databaseUrl === undefined) {
    throw new ConfigError('DATABASE_URL não definida: necessária quando STORAGE=postgres.');
  }

  return {
    port,
    baseUrl: readBaseUrl(env, port),
    storage,
    ...(storage === 'postgres' ? { databaseUrl } : {}),
    rateLimitPerMinute: readInteger(
      env,
      'RATE_LIMIT_PER_MINUTE',
      DEFAULT_RATE_LIMIT_PER_MINUTE,
      1,
      1_000_000,
    ),
    trustProxy: readInteger(env, 'TRUST_PROXY', DEFAULT_TRUST_PROXY, 0, 10),
    enableTestRoutes: read(env, 'NODE_ENV') === 'test',
  };
}

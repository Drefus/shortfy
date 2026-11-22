import pg from 'pg';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Monta a configuração do pool a partir de DATABASE_URL (ex.: string de conexão do Neon).
 *
 * O SSL é decidido aqui, e não pelo parâmetro `sslmode` da URL, porque o `pg` trata
 * `sslmode=require` de forma diferente da libpq e emite um aviso. Regras:
 * - bancos locais (localhost) ou `sslmode=disable`: sem SSL;
 * - qualquer outro host (Neon): SSL com verificação do certificado.
 * `channel_binding=require` (presente nas URLs do Neon) vira a opção equivalente do `pg`.
 */
export function buildPoolConfig(databaseUrl: string): pg.PoolConfig {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL malformada.');
  }

  const sslmode = url.searchParams.get('sslmode');
  const channelBinding = url.searchParams.get('channel_binding');
  url.searchParams.delete('sslmode');
  url.searchParams.delete('channel_binding');

  const semSsl = sslmode === 'disable' || LOCAL_HOSTS.has(url.hostname);

  return {
    connectionString: url.toString(),
    ssl: semSsl ? false : { rejectUnauthorized: true },
    enableChannelBinding: channelBinding === 'require',
    // O Neon suspende o banco ocioso e encerra as conexões: não as mantenha paradas.
    idleTimeoutMillis: 30_000,
  };
}

/** Cria o pool de conexões a partir de DATABASE_URL. */
export function createPool(databaseUrl: string | undefined = process.env.DATABASE_URL): pg.Pool {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não definida: necessária quando STORAGE=postgres.');
  }
  const pool = new pg.Pool(buildPoolConfig(databaseUrl));
  // Sem este ouvinte, uma conexão ociosa derrubada pelo servidor encerraria o processo.
  pool.on('error', (error) => {
    console.error('Conexão ociosa com o banco encerrada:', error.message);
  });
  return pool;
}

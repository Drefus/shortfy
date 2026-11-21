import pg from 'pg';

/** Cria o pool de conexões a partir de DATABASE_URL (ex.: string de conexão do Neon). */
export function createPool(databaseUrl: string | undefined = process.env.DATABASE_URL): pg.Pool {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não definida: necessária quando STORAGE=postgres.');
  }
  return new pg.Pool({ connectionString: databaseUrl });
}

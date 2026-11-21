import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from './pool.js';

/** Funciona tanto em src/db (tsx) quanto em dist/db (build): ambos ficam a dois níveis da raiz. */
const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'db',
  'migrations',
);

async function migrate(): Promise<void> {
  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const aplicadas = new Set(rows.map((r) => r.name));
    const arquivos = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    for (const arquivo of arquivos) {
      if (aplicadas.has(arquivo)) {
        console.log(`- ${arquivo} (já aplicada)`);
        continue;
      }
      const sql = await readFile(path.join(MIGRATIONS_DIR, arquivo), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [arquivo]);
        await client.query('COMMIT');
        console.log(`+ ${arquivo} aplicada`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error: unknown) => {
  console.error('Falha ao aplicar migrações:', error);
  process.exitCode = 1;
});
